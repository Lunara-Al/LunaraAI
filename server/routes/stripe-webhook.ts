import { Router } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { membershipService } from "../services";
import type { MembershipTier } from "@shared/schema";

export function createStripeWebhookRouter(stripe: Stripe | null): Router {
  const router = Router();

  router.post("/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(400).json({ error: "Stripe is not configured" });
    }

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = req.body as Stripe.Event;
        console.warn("Stripe webhook secret not configured - accepting unverified events");
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutComplete(session, stripe);
          break;
        }
        
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription, stripe);
          break;
        }
        
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }
        
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }
        
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  router.get("/verify-session", async (req, res) => {
    if (!stripe) {
      return res.status(400).json({ error: "Stripe is not configured" });
    }

    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing session_id parameter" });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (session.payment_status === "paid" && session.metadata?.userId) {
        const tier = session.metadata.tier as MembershipTier;
        const subscriptionId = typeof session.subscription === "string" 
          ? session.subscription 
          : session.subscription?.id;

        if (tier && subscriptionId) {
          await membershipService.upgradeTier(
            session.metadata.userId,
            tier,
            subscriptionId
          );
        }

        res.json({ 
          success: true, 
          tier,
          paymentStatus: session.payment_status 
        });
      } else {
        res.json({ 
          success: false, 
          paymentStatus: session.payment_status 
        });
      }
    } catch (error: any) {
      console.error("Error verifying session:", error);
      res.status(500).json({ error: "Failed to verify session" });
    }
  });

  return router;
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session, stripe: Stripe) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as MembershipTier;
  
  if (!userId || !tier) {
    console.error("Missing userId or tier in checkout session metadata");
    return;
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : (session.subscription as Stripe.Subscription)?.id;

  if (!subscriptionId) {
    console.error("No subscription ID found in checkout session");
    return;
  }

  console.log(`Processing checkout completion for user ${userId}, tier: ${tier}`);
  
  await membershipService.upgradeTier(userId, tier, subscriptionId);
  
  if (session.customer) {
    const customerId = typeof session.customer === "string" 
      ? session.customer 
      : session.customer.id;
    await storage.updateStripeCustomerId(userId, customerId);
  }
  
  console.log(`Successfully upgraded user ${userId} to ${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, stripe: Stripe) {
  const customerId = typeof subscription.customer === "string" 
    ? subscription.customer 
    : subscription.customer.id;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  if (subscription.status === "active") {
    const priceId = subscription.items.data[0]?.price?.id;
    
    let newTier: MembershipTier = "free";
    if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
      newTier = "pro";
    } else if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) {
      newTier = "premium";
    }

    if (newTier !== user.membershipTier) {
      await membershipService.upgradeTier(user.id, newTier, subscription.id);
      console.log(`Updated user ${user.id} subscription to ${newTier}`);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" 
    ? subscription.customer 
    : subscription.customer.id;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  await membershipService.cancelSubscription(user.id);
  console.log(`Subscription canceled for user ${user.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" 
    ? invoice.customer 
    : (invoice.customer as Stripe.Customer)?.id;

  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  console.warn(`Payment failed for user ${user.id}, invoice: ${invoice.id}`);
}
