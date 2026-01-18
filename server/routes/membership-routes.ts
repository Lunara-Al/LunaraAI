import { Router } from "express";
import { MEMBERSHIP_TIERS, type MembershipTier } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";
import { membershipService } from "../services";
import { getWebSocketManager } from "../websocket";
import Stripe from "stripe";

export function createMembershipRouter(stripe: Stripe | null): Router {
  const router = Router();

  router.get("/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const status = await membershipService.getSubscriptionStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  router.post("/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { tier } = req.body as { tier: MembershipTier };
      if (!tier || !MEMBERSHIP_TIERS[tier]) {
        return res.status(400).json({ error: "Invalid membership tier" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (tier === "free") {
        const updatedUser = await membershipService.upgradeTier(userId, "free");
        
        // Broadcast sync event to all devices
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToUser(userId, {
            type: 'membership-updated',
            userId,
            tier: updatedUser.membershipTier
          });
        }
        
        return res.json({ success: true, tier: updatedUser.membershipTier });
      }

      if (!stripe) {
        return res.status(200).json({
          simulated: true,
          message: "Stripe is not configured. Please use simulation endpoint.",
        });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        
        await storage.updateStripeCustomerId(userId, customerId);
      }

      const tierConfig = MEMBERSHIP_TIERS[tier];
      if (!tierConfig.stripePriceId) {
        return res.status(400).json({ error: "Price ID not configured for this tier" });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: tierConfig.stripePriceId, quantity: 1 }],
        success_url: `${req.protocol}://${req.get("host")}/membership?success=true`,
        cancel_url: `${req.protocol}://${req.get("host")}/membership?canceled=true`,
        metadata: { userId, tier },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create subscription", message: error.message });
    }
  });

  router.post("/simulate-upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { tier } = req.body as { tier: MembershipTier };
      if (!tier || !MEMBERSHIP_TIERS[tier]) {
        return res.status(400).json({ error: "Invalid membership tier" });
      }

      const updatedUser = await membershipService.upgradeTier(userId, tier, `sim_${Date.now()}`);
      
      // Broadcast sync event to all devices
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToUser(userId, {
          type: 'membership-updated',
          userId,
          tier: updatedUser.membershipTier
        });
      }
      
      res.json({
        success: true,
        tier: updatedUser.membershipTier,
        simulated: true,
        message: "Subscription updated (simulated - Stripe not configured)",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  router.post("/downgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { tier } = req.body as { tier: MembershipTier };
      if (!tier || !MEMBERSHIP_TIERS[tier]) {
        return res.status(400).json({ error: "Invalid membership tier" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (stripe && user.stripeSubscriptionId && !membershipService.isSimulatedSubscription(user.stripeSubscriptionId)) {
        const tierConfig = MEMBERSHIP_TIERS[tier];
        const stripePriceId = "stripePriceId" in tierConfig ? tierConfig.stripePriceId : null;
        
        if (stripePriceId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
              items: [{ id: subscription.items.data[0].id, price: stripePriceId }],
              proration_behavior: "create_prorations",
            });
          } catch (stripeError: any) {
            console.warn("Failed to update Stripe subscription:", stripeError.message);
          }
        } else if (tier === "free") {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        }
      }

      const { user: updatedUser } = await membershipService.downgradeTier(userId, tier);
      res.json({
        success: true,
        tier: updatedUser.membershipTier,
        message: `Downgraded to ${tier} tier successfully`,
        creditApplied: tier !== "free",
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to downgrade subscription", message: error.message });
    }
  });

  router.post("/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (stripe && user.stripeSubscriptionId && !membershipService.isSimulatedSubscription(user.stripeSubscriptionId)) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }

      const updatedUser = await membershipService.cancelSubscription(userId);
      res.json({
        success: true,
        tier: updatedUser.membershipTier,
        message: "Subscription canceled successfully",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  return router;
}
