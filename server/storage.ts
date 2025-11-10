import { videoGenerations, type VideoGeneration, type InsertVideoGeneration } from "@shared/schema";
import { db } from "./db";
import { desc } from "drizzle-orm";

export interface IStorage {
  createVideoGeneration(video: InsertVideoGeneration): Promise<VideoGeneration>;
  getVideoGenerations(limit?: number): Promise<VideoGeneration[]>;
  getAllVideoGenerations(): Promise<VideoGeneration[]>;
}

export class DatabaseStorage implements IStorage {
  async createVideoGeneration(insertVideo: InsertVideoGeneration): Promise<VideoGeneration> {
    const [video] = await db
      .insert(videoGenerations)
      .values(insertVideo)
      .returning();
    return video;
  }

  async getVideoGenerations(limit: number = 50): Promise<VideoGeneration[]> {
    return await db
      .select()
      .from(videoGenerations)
      .orderBy(desc(videoGenerations.createdAt))
      .limit(limit);
  }

  async getAllVideoGenerations(): Promise<VideoGeneration[]> {
    return await db
      .select()
      .from(videoGenerations)
      .orderBy(desc(videoGenerations.createdAt));
  }
}

export const storage = new DatabaseStorage();
