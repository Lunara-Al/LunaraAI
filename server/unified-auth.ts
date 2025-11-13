import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import * as client from "openid-client";
import { Strategy as OIDCStrategy, type VerifyFunction } from "openid-client/passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import memoize from "memoizee";
import { authService } from "./auth-service";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import type { Express, RequestHandler } from "express";

interface ReplitAuthSession {
  provider: "replit";
  claims: any;
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

interface LocalAuthSession {
  provider: "local";
  userId: string;
}

type AuthSession = ReplitAuthSession | LocalAuthSession;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupUnifiedAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const oidcVerify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const session: ReplitAuthSession = {
      provider: "replit",
      claims,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: claims?.exp || 0,
    };
    
    await storage.upsertUser({
      id: String(claims?.sub || ''),
      email: String(claims?.email || ''),
      firstName: String(claims?.first_name || ''),
      lastName: String(claims?.last_name || ''),
      profileImageUrl: String(claims?.profile_image_url || ''),
    });
    
    verified(null, session);
  };

  passport.use(
    "local",
    new LocalStrategy(
      {
        usernameField: "usernameOrEmail",
        passwordField: "password",
      },
      async (usernameOrEmail, password, done) => {
        try {
          const user = await authService.verifyCredentials(usernameOrEmail, password);
          
          if (!user) {
            return done(null, false, { message: "Invalid username/email or password" });
          }

          const session: LocalAuthSession = {
            provider: "local",
            userId: user.id,
          };

          return done(null, session);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((session: any, done) => {
    done(null, session);
  });

  const registeredStrategies = new Set<string>();

  const ensureOidcStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new OIDCStrategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        oidcVerify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", (req, res, next) => {
    ensureOidcStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureOidcStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const session = req.user as AuthSession;
    
    if (session?.provider === "replit") {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    } else {
      req.logout(() => {
        res.redirect("/");
      });
    }
  });
}

export async function getAuthenticatedUserId(req: any): Promise<string | null> {
  if (!req.user) return null;

  const session = req.user as AuthSession;
  
  if (session.provider === "replit") {
    return session.claims.sub;
  } else if (session.provider === "local") {
    return session.userId;
  }
  
  return null;
}

export async function getAuthenticatedUser(req: any): Promise<User | null> {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return null;
  
  const user = await storage.getUser(userId);
  return user || null;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.user as AuthSession;

  if (!req.isAuthenticated() || !session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (session.provider === "local") {
    return next();
  }

  if (session.provider === "replit") {
    const now = Math.floor(Date.now() / 1000);
    if (now <= session.expires_at) {
      return next();
    }

    const refreshToken = session.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      session.claims = tokenResponse.claims();
      session.access_token = tokenResponse.access_token;
      session.refresh_token = tokenResponse.refresh_token;
      session.expires_at = session.claims.exp;
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
};
