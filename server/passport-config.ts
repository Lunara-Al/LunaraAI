import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { authService } from "./auth-service";
import type { User } from "@shared/schema";

export function setupLocalStrategy() {
  passport.use(
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

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    if (user.id) {
      done(null, user.id);
    } else {
      done(null, user);
    }
  });

  passport.deserializeUser(async (data: any, done) => {
    try {
      if (typeof data === "string") {
        const user = await authService.findUserById(data);
        done(null, user || null);
      } else {
        done(null, data);
      }
    } catch (error) {
      done(error);
    }
  });
}
