import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Video generation history table
export const videoGenerations = pgTable("video_generations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  prompt: text("prompt").notNull(),
  videoUrl: text("video_url").notNull(),
  length: integer("length").default(10),
  aspectRatio: varchar("aspect_ratio", { length: 10 }).default("1:1"),
  style: text("style"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVideoGenerationSchema = createInsertSchema(videoGenerations).pick({
  prompt: true,
  videoUrl: true,
  length: true,
  aspectRatio: true,
  style: true,
});

export type InsertVideoGeneration = typeof videoGenerations.$inferInsert;
export type VideoGeneration = typeof videoGenerations.$inferSelect;

// Video generation request schema
export const videoGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(500, "Prompt must be less than 500 characters"),
  length: z.number().refine((val) => [5, 10, 15].includes(val), "Length must be 5, 10, or 15").default(10),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]).default("1:1"),
  style: z.string().optional(),
});

export type VideoGenerationRequest = z.infer<typeof videoGenerationSchema>;

// Video generation response schema
export interface VideoGenerationResponse {
  videoUrl: string;
  prompt: string;
  id?: number;
}

// Error response schema
export interface ErrorResponse {
  error: string;
  message?: string;
}
