import { storage } from "../storage";
import { 
  MEMBERSHIP_TIERS, 
  CREDIT_RESET_DAYS, 
  getCreditsForTier, 
  type MembershipTier,
  type User 
} from "@shared/schema";

export interface SubscriptionStatus {
  tier: MembershipTier;
  videosUsed: number;
  videosLimit: number;
  maxLength: number;
  quality: string;
  credits: number;
  monthlyCreditsAllocated: number;
  stripeSubscriptionId: string | null;
  daysUntilReset: number;
}

class MembershipService {
  private readonly tierHierarchy: Record<MembershipTier, number> = {
    free: 0,
    pro: 1,
    premium: 2,
  };

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = await storage.checkAndAllocateCredits(userId, user.membershipTier as MembershipTier);
    const tierConfig = MEMBERSHIP_TIERS[updatedUser.membershipTier as MembershipTier];
    const videoCount = await storage.getMonthlyVideoCount(userId);
    const daysUntilReset = this.calculateDaysUntilReset(updatedUser);

    return {
      tier: updatedUser.membershipTier as MembershipTier,
      videosUsed: videoCount,
      videosLimit: tierConfig.monthlyVideos,
      maxLength: tierConfig.maxLength,
      quality: tierConfig.quality,
      credits: updatedUser.credits,
      monthlyCreditsAllocated: updatedUser.monthlyCreditsAllocated,
      stripeSubscriptionId: updatedUser.stripeSubscriptionId,
      daysUntilReset,
    };
  }

  async upgradeTier(userId: string, newTier: MembershipTier, subscriptionId?: string): Promise<User> {
    if (!MEMBERSHIP_TIERS[newTier]) {
      throw new Error("Invalid membership tier");
    }

    const updatedUser = await storage.updateUserMembership(userId, newTier, subscriptionId);
    await storage.allocateMonthlyCredits(userId, newTier);
    return updatedUser;
  }

  async downgradeTier(userId: string, newTier: MembershipTier): Promise<{ user: User; wasHigherTier: boolean }> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    const currentTierLevel = this.tierHierarchy[user.membershipTier as MembershipTier];
    const newTierLevel = this.tierHierarchy[newTier];

    if (newTierLevel >= currentTierLevel) {
      throw new Error("Can only downgrade to a lower tier");
    }

    const updatedUser = await storage.updateUserMembership(userId, newTier, user.stripeSubscriptionId || undefined);
    await storage.allocateMonthlyCredits(userId, newTier);

    return { user: updatedUser, wasHigherTier: true };
  }

  async cancelSubscription(userId: string): Promise<User> {
    return this.upgradeTier(userId, "free", undefined);
  }

  canUpgrade(currentTier: MembershipTier, targetTier: MembershipTier): boolean {
    return this.tierHierarchy[targetTier] > this.tierHierarchy[currentTier];
  }

  canDowngrade(currentTier: MembershipTier, targetTier: MembershipTier): boolean {
    return this.tierHierarchy[targetTier] < this.tierHierarchy[currentTier];
  }

  private calculateDaysUntilReset(user: User): number {
    const now = new Date();
    const lastReset = new Date(user.creditsLastResetDate || user.createdAt);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, CREDIT_RESET_DAYS - daysSinceReset);
  }
}

export const membershipService = new MembershipService();
