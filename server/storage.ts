import { 
  videoGenerations, 
  users,
  type VideoGeneration, 
  type InsertVideoGeneration,
  type User,
  type UpsertUser,
  type MembershipTier 
} from "@shared/schema";
import { db } from "./db";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserMembership(userId: string, tier: MembershipTier, stripeSubscriptionId?: string): Promise<User>;
  incrementVideoCount(userId: string): Promise<User>;
  resetMonthlyVideoCount(userId: string): Promise<User>;
  checkAndResetVideoCount(userId: string): Promise<User>;
  
  // Video generation operations
  createVideoGeneration(video: InsertVideoGeneration): Promise<VideoGeneration>;
  getVideoGenerations(limit?: number, userId?: string): Promise<VideoGeneration[]>;
  getUserVideoGenerations(userId: string, limit?: number): Promise<VideoGeneration[]>;
  getMonthlyVideoCount(userId: string): Promise<number>;
  getAllVideoGenerations(): Promise<VideoGeneration[]>;
  deleteVideoGeneration(id: number, userId?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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

    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceReset >= 30) {
      return await this.resetMonthlyVideoCount(userId);
    }

    return user;
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
}

export const storage = new DatabaseStorage();
