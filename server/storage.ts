import { 
  videoGenerations, 
  users,
  userSettings,
  accountAuditLog,
  contactMessages,
  videoShareLinks,
  socialAccounts,
  socialUploadJobs,
  videoGenerationJobs,
  type VideoGeneration, 
  type InsertVideoGeneration,
  type User,
  type UpsertUser,
  type MembershipTier,
  type UserSettings,
  type InsertUserSettings,
  type UpdateUserSettings,
  type InsertAccountAuditLog,
  type InsertContactMessage,
  type ContactMessage,
  type VideoShareLink,
  type InsertVideoShareLink,
  type SocialAccount,
  type InsertSocialAccount,
  type SocialPlatform,
  type SocialUploadJob,
  type InsertSocialUploadJob,
  type UploadJobStatus,
  type VideoGenerationJob,
  type InsertVideoGenerationJob,
  type VideoJobStatus
} from "@shared/schema";
import { db } from "./db";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserMembership(userId: string, tier: MembershipTier, stripeSubscriptionId?: string): Promise<User>;
  updateProfilePicture(userId: string, imageUrl: string): Promise<User>;
  updateProfile(userId: string, updates: { firstName?: string; lastName?: string; email?: string; username?: string; passwordHash?: string }): Promise<User>;
  updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  incrementVideoCount(userId: string): Promise<User>;
  resetMonthlyVideoCount(userId: string): Promise<User>;
  checkAndResetVideoCount(userId: string): Promise<User>;
  allocateMonthlyCredits(userId: string, tier: MembershipTier): Promise<User>;
  checkAndAllocateCredits(userId: string, tier: MembershipTier): Promise<User>;
  deleteUserAccount(userId: string): Promise<void>;
  
  // User settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: UpdateUserSettings): Promise<UserSettings>;
  
  // Video generation operations
  createVideoGeneration(video: InsertVideoGeneration): Promise<VideoGeneration>;
  getVideoGenerations(limit?: number, userId?: string): Promise<VideoGeneration[]>;
  getUserVideoGenerations(userId: string, limit?: number): Promise<VideoGeneration[]>;
  getMonthlyVideoCount(userId: string): Promise<number>;
  getAllVideoGenerations(): Promise<VideoGeneration[]>;
  deleteVideoGeneration(id: number, userId?: string): Promise<boolean>;
  toggleCreationDisplay(id: number, userId: string, display: boolean): Promise<VideoGeneration | null>;
  getUserCreations(userId: string): Promise<VideoGeneration[]>;
  
  // Audit operations
  logAccountAudit(data: { userId: string, email: string, username?: string, action: "created" | "deleted", authProvider: "local" | "replit", metadata?: any }): Promise<void>;

  // Contact messages operations
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;

  // Video share link operations
  createShareLink(data: InsertVideoShareLink): Promise<VideoShareLink>;
  getShareLinkByToken(token: string): Promise<VideoShareLink | undefined>;
  getShareLinkByVideoId(videoId: number, userId: string): Promise<VideoShareLink | undefined>;
  revokeShareLink(token: string, userId: string): Promise<boolean>;
  incrementShareLinkViews(token: string): Promise<void>;
  getVideoById(videoId: number): Promise<VideoGeneration | undefined>;
  deleteShareLinksByVideoId(videoId: number, userId: string): Promise<void>;

  // Social account operations
  getSocialAccounts(userId: string): Promise<SocialAccount[]>;
  getSocialAccountByPlatform(userId: string, platform: SocialPlatform): Promise<SocialAccount | undefined>;
  getSocialAccountById(id: number): Promise<SocialAccount | undefined>;
  createSocialAccount(data: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: number, updates: Partial<InsertSocialAccount>): Promise<SocialAccount>;
  updateSocialAccountTokens(id: number, accessTokenEncrypted: string, refreshTokenEncrypted: string | null, tokenExpiresAt: Date): Promise<SocialAccount>;
  deleteSocialAccount(id: number, userId: string): Promise<boolean>;

  // Social upload job operations
  createUploadJob(data: InsertSocialUploadJob): Promise<SocialUploadJob>;
  getUploadJobs(userId: string, limit?: number): Promise<SocialUploadJob[]>;
  getUploadJob(id: number): Promise<SocialUploadJob | undefined>;
  updateUploadJobStatus(id: number, status: UploadJobStatus, externalPostId?: string, externalPostUrl?: string, errorMessage?: string): Promise<SocialUploadJob>;

  // Video generation job operations (async processing)
  createVideoGenerationJob(data: InsertVideoGenerationJob): Promise<VideoGenerationJob>;
  getVideoGenerationJob(id: number): Promise<VideoGenerationJob | undefined>;
  getVideoGenerationJobByUser(id: number, userId: string): Promise<VideoGenerationJob | undefined>;
  getPendingVideoGenerationJobs(): Promise<VideoGenerationJob[]>;
  updateVideoGenerationJob(id: number, updates: Partial<VideoGenerationJob>): Promise<VideoGenerationJob>;
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!userData.email) {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }

    const [existingUserByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email));
    
    if (existingUserByEmail && existingUserByEmail.id !== userData.id) {
      const oldId = existingUserByEmail.id;
      const newId = userData.id;
      
      const [user] = await db.transaction(async (tx) => {
        await tx
          .update(videoGenerations)
          .set({ userId: newId })
          .where(eq(videoGenerations.userId, oldId));
        
        await tx
          .update(userSettings)
          .set({ userId: newId })
          .where(eq(userSettings.userId, oldId));
        
        await tx.delete(users).where(eq(users.id, oldId));
        
        return await tx
          .insert(users)
          .values({
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username || existingUserByEmail.username,
            passwordHash: null,
            profileImageUrl: userData.profileImageUrl,
            membershipTier: existingUserByEmail.membershipTier,
            videosGeneratedThisMonth: existingUserByEmail.videosGeneratedThisMonth,
            lastResetDate: existingUserByEmail.lastResetDate,
            stripeCustomerId: existingUserByEmail.stripeCustomerId,
            stripeSubscriptionId: existingUserByEmail.stripeSubscriptionId,
            createdAt: existingUserByEmail.createdAt,
          })
          .returning();
      });
      return user;
    } else {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }
  }

  async updateUserMembership(userId: string, tier: MembershipTier, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        membershipTier: tier,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateProfilePicture(userId: string, imageUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        profileImageUrl: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateProfile(userId: string, updates: { firstName?: string; lastName?: string; email?: string; username?: string; passwordHash?: string }): Promise<User> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async incrementVideoCount(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        videosGeneratedThisMonth: sql`${users.videosGeneratedThisMonth} + 1`,
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetMonthlyVideoCount(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        videosGeneratedThisMonth: 0,
        lastResetDate: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkAndResetVideoCount(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    // Safety check for membershipTier
    if (!user.membershipTier) {
      const [updatedUser] = await db.update(users).set({ membershipTier: 'basic' }).where(eq(users.id, userId)).returning();
      return updatedUser;
    }

    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceReset >= 30) {
      return await this.resetMonthlyVideoCount(userId);
    }

    return user;
  }

  async allocateMonthlyCredits(userId: string, tier: MembershipTier): Promise<User> {
    const { MEMBERSHIP_TIERS } = await import("@shared/schema");
    const tierConfig = MEMBERSHIP_TIERS[tier];
    const monthlyCredits = tierConfig.monthlyCredits;

    const [user] = await db
      .update(users)
      .set({
        credits: monthlyCredits,
        monthlyCreditsAllocated: monthlyCredits,
        creditsLastResetDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkAndAllocateCredits(userId: string, tier: MembershipTier): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = new Date(user.creditsLastResetDate || user.createdAt);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    // Allocate credits every 30 days
    if (daysSinceReset >= 30) {
      return await this.allocateMonthlyCredits(userId, tier);
    }

    return user;
  }

  async deductCredits(userId: string, amount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [newSettings] = await db
      .insert(userSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateUserSettings(userId: string, updates: UpdateUserSettings): Promise<UserSettings> {
    const [updated] = await db
      .update(userSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updated;
  }

  // Video generation operations
  async createVideoGeneration(insertVideo: InsertVideoGeneration): Promise<VideoGeneration> {
    const [video] = await db
      .insert(videoGenerations)
      .values(insertVideo)
      .returning();
    return video;
  }

  async getVideoGenerations(limit: number = 50, userId?: string): Promise<VideoGeneration[]> {
    if (userId) {
      return this.getUserVideoGenerations(userId, limit);
    }
    return await db
      .select()
      .from(videoGenerations)
      .orderBy(desc(videoGenerations.createdAt))
      .limit(limit);
  }

  async getUserVideoGenerations(userId: string, limit: number = 50): Promise<VideoGeneration[]> {
    return await db
      .select()
      .from(videoGenerations)
      .where(eq(videoGenerations.userId, userId))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(limit);
  }

  async getMonthlyVideoCount(userId: string): Promise<number> {
    const user = await this.checkAndResetVideoCount(userId);
    return user.videosGeneratedThisMonth;
  }

  async getAllVideoGenerations(): Promise<VideoGeneration[]> {
    return await db
      .select()
      .from(videoGenerations)
      .orderBy(desc(videoGenerations.createdAt));
  }

  async deleteVideoGeneration(id: number, userId?: string): Promise<boolean> {
    const conditions = userId 
      ? and(eq(videoGenerations.id, id), eq(videoGenerations.userId, userId))
      : eq(videoGenerations.id, id);

    const result = await db
      .delete(videoGenerations)
      .where(conditions!)
      .returning({ id: videoGenerations.id });
    
    return result.length > 0;
  }

  async toggleCreationDisplay(id: number, userId: string, display: boolean): Promise<VideoGeneration | null> {
    const [updated] = await db
      .update(videoGenerations)
      .set({ displayOnProfile: display ? 1 : 0 })
      .where(and(eq(videoGenerations.id, id), eq(videoGenerations.userId, userId)))
      .returning();
    
    return updated || null;
  }

  async getUserCreations(userId: string): Promise<VideoGeneration[]> {
    return await db
      .select()
      .from(videoGenerations)
      .where(and(eq(videoGenerations.userId, userId), eq(videoGenerations.displayOnProfile, 1)))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(12);
  }

  // Audit operations
  async logAccountAudit(data: { userId: string, email: string, username?: string, action: "created" | "deleted", authProvider: "local" | "replit", metadata?: any }): Promise<void> {
    await db.insert(accountAuditLog).values({
      userId: data.userId,
      email: data.email,
      username: data.username || null,
      action: data.action,
      authProvider: data.authProvider,
      metadata: data.metadata || null,
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(videoShareLinks).where(eq(videoShareLinks.ownerUserId, userId));
      await tx.delete(videoGenerations).where(eq(videoGenerations.userId, userId));
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Video share link operations
  async createShareLink(data: InsertVideoShareLink): Promise<VideoShareLink> {
    const [shareLink] = await db
      .insert(videoShareLinks)
      .values(data)
      .returning();
    return shareLink;
  }

  async getShareLinkByToken(token: string): Promise<VideoShareLink | undefined> {
    const [shareLink] = await db
      .select()
      .from(videoShareLinks)
      .where(eq(videoShareLinks.token, token));
    return shareLink;
  }

  async getShareLinkByVideoId(videoId: number, userId: string): Promise<VideoShareLink | undefined> {
    const [shareLink] = await db
      .select()
      .from(videoShareLinks)
      .where(and(
        eq(videoShareLinks.videoId, videoId),
        eq(videoShareLinks.ownerUserId, userId),
        eq(videoShareLinks.isRevoked, 0)
      ));
    return shareLink;
  }

  async revokeShareLink(token: string, userId: string): Promise<boolean> {
    const result = await db
      .update(videoShareLinks)
      .set({ isRevoked: 1 })
      .where(and(
        eq(videoShareLinks.token, token),
        eq(videoShareLinks.ownerUserId, userId)
      ))
      .returning({ id: videoShareLinks.id });
    return result.length > 0;
  }

  async incrementShareLinkViews(token: string): Promise<void> {
    await db
      .update(videoShareLinks)
      .set({ 
        viewCount: sql`${videoShareLinks.viewCount} + 1`,
        lastViewedAt: new Date()
      })
      .where(eq(videoShareLinks.token, token));
  }

  async getVideoById(videoId: number): Promise<VideoGeneration | undefined> {
    const [video] = await db
      .select()
      .from(videoGenerations)
      .where(eq(videoGenerations.id, videoId));
    return video;
  }

  async deleteShareLinksByVideoId(videoId: number, userId: string): Promise<void> {
    await db
      .delete(videoShareLinks)
      .where(and(
        eq(videoShareLinks.videoId, videoId),
        eq(videoShareLinks.ownerUserId, userId)
      ));
  }

  // Social account operations
  async getSocialAccounts(userId: string): Promise<SocialAccount[]> {
    return await db
      .select()
      .from(socialAccounts)
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.isActive, 1)))
      .orderBy(desc(socialAccounts.createdAt));
  }

  async getSocialAccountByPlatform(userId: string, platform: SocialPlatform): Promise<SocialAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(and(
        eq(socialAccounts.userId, userId),
        eq(socialAccounts.platform, platform),
        eq(socialAccounts.isActive, 1)
      ));
    return account;
  }

  async getSocialAccountById(id: number): Promise<SocialAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.id, id));
    return account;
  }

  async createSocialAccount(data: InsertSocialAccount): Promise<SocialAccount> {
    const [account] = await db
      .insert(socialAccounts)
      .values(data)
      .returning();
    return account;
  }

  async updateSocialAccount(id: number, updates: Partial<InsertSocialAccount>): Promise<SocialAccount> {
    const [account] = await db
      .update(socialAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(socialAccounts.id, id))
      .returning();
    return account;
  }

  async updateSocialAccountTokens(
    id: number,
    accessTokenEncrypted: string,
    refreshTokenEncrypted: string | null,
    tokenExpiresAt: Date
  ): Promise<SocialAccount> {
    const updateData: Partial<SocialAccount> = {
      accessTokenEncrypted,
      tokenExpiresAt,
      updatedAt: new Date(),
    };
    if (refreshTokenEncrypted) {
      updateData.refreshTokenEncrypted = refreshTokenEncrypted;
    }
    const [account] = await db
      .update(socialAccounts)
      .set(updateData)
      .where(eq(socialAccounts.id, id))
      .returning();
    return account;
  }

  async deleteSocialAccount(id: number, userId: string): Promise<boolean> {
    const result = await db
      .update(socialAccounts)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)))
      .returning({ id: socialAccounts.id });
    return result.length > 0;
  }

  // Social upload job operations
  async createUploadJob(data: InsertSocialUploadJob): Promise<SocialUploadJob> {
    const [job] = await db
      .insert(socialUploadJobs)
      .values(data)
      .returning();
    return job;
  }

  async getUploadJobs(userId: string, limit: number = 50): Promise<SocialUploadJob[]> {
    return await db
      .select()
      .from(socialUploadJobs)
      .where(eq(socialUploadJobs.userId, userId))
      .orderBy(desc(socialUploadJobs.createdAt))
      .limit(limit);
  }

  async getUploadJob(id: number): Promise<SocialUploadJob | undefined> {
    const [job] = await db
      .select()
      .from(socialUploadJobs)
      .where(eq(socialUploadJobs.id, id));
    return job;
  }

  async updateUploadJobStatus(
    id: number, 
    status: UploadJobStatus, 
    externalPostId?: string, 
    externalPostUrl?: string, 
    errorMessage?: string
  ): Promise<SocialUploadJob> {
    const updateData: Partial<SocialUploadJob> = { 
      status, 
      updatedAt: new Date() 
    };
    if (externalPostId) updateData.externalPostId = externalPostId;
    if (externalPostUrl) updateData.externalPostUrl = externalPostUrl;
    if (errorMessage) updateData.errorMessage = errorMessage;

    const [job] = await db
      .update(socialUploadJobs)
      .set(updateData)
      .where(eq(socialUploadJobs.id, id))
      .returning();
    return job;
  }

  // Video generation job operations (async processing)
  async createVideoGenerationJob(data: InsertVideoGenerationJob): Promise<VideoGenerationJob> {
    const [job] = await db
      .insert(videoGenerationJobs)
      .values(data)
      .returning();
    return job;
  }

  async getVideoGenerationJob(id: number): Promise<VideoGenerationJob | undefined> {
    const [job] = await db
      .select()
      .from(videoGenerationJobs)
      .where(eq(videoGenerationJobs.id, id));
    return job;
  }

  async getVideoGenerationJobByUser(id: number, userId: string): Promise<VideoGenerationJob | undefined> {
    const [job] = await db
      .select()
      .from(videoGenerationJobs)
      .where(and(
        eq(videoGenerationJobs.id, id),
        eq(videoGenerationJobs.userId, userId)
      ));
    return job;
  }

  async getPendingVideoGenerationJobs(): Promise<VideoGenerationJob[]> {
    return await db
      .select()
      .from(videoGenerationJobs)
      .where(
        sql`${videoGenerationJobs.status} IN ('pending', 'processing', 'polling', 'downloading')`
      )
      .orderBy(videoGenerationJobs.createdAt);
  }

  async updateVideoGenerationJob(id: number, updates: Partial<VideoGenerationJob>): Promise<VideoGenerationJob> {
    const [job] = await db
      .update(videoGenerationJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoGenerationJobs.id, id))
      .returning();
    return job;
  }
}

export const storage = new DatabaseStorage();
