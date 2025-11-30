import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import {
  createAuthRouter,
  createProfileRouter,
  createMembershipRouter,
  createGeneratorRouter,
  createGalleryRouter,
  createSettingsRouter,
  createContactRouter,
} from "./routes/index";

function initializeStripe(): Stripe | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim().replace(/[\r\n\t\s]/g, "");
  
  if (!stripeSecretKey) {
    console.warn("STRIPE_SECRET_KEY not set - payment processing will be simulated");
    return null;
  }

  const stripeKeyRegex = /^sk_(test|live)_[A-Za-z0-9_]+$/;
  if (!stripeKeyRegex.test(stripeSecretKey)) {
    console.error("STRIPE_SECRET_KEY has invalid format - expected sk_test_* or sk_live_*");
    console.warn("Payment processing will be simulated until a valid Stripe key is provided");
    return null;
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    console.log("Stripe initialized successfully");
    return stripe;
  } catch (error: any) {
    console.error("Failed to initialize Stripe:", error.message);
    console.warn("Payment processing will be simulated");
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const stripe = initializeStripe();
  
  if (!process.env.PIKA_API_KEY) {
    console.error("PIKA_API_KEY is not set in environment variables");
  }

  // Mount feature routers
  app.use("/api/auth", createAuthRouter());
  app.use("/api/profile", createProfileRouter());
  app.use("/api/subscription", createMembershipRouter(stripe));
  app.use("/api/generate", createGeneratorRouter());
  app.use("/api/history", createGalleryRouter());
  app.use("/api/settings", createSettingsRouter());
  app.use("/api/contact", createContactRouter());

  const httpServer = createServer(app);
  return httpServer;
}
