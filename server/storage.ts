import { videoGenerations, type VideoGeneration, type InsertVideoGeneration } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createVideoGeneration(video: InsertVideoGeneration): Promise<VideoGeneration>;
  getVideoGenerations(limit?: number): Promise<VideoGeneration[]>;
  getAllVideoGenerations(): Promise<VideoGeneration[]>;
  deleteVideoGeneration(id: number): Promise<boolean>;
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

  async deleteVideoGeneration(id: number): Promise<boolean> {
    const result = await db
      .delete(videoGenerations)
      .where(eq(videoGenerations.id, id))
      .returning({ id: videoGenerations.id });
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
