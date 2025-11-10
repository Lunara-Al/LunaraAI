import { z } from "zod";

// Video generation request schema
export const videoGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(500, "Prompt must be less than 500 characters"),
});

export type VideoGenerationRequest = z.infer<typeof videoGenerationSchema>;

// Video generation response schema
export interface VideoGenerationResponse {
  videoUrl: string;
  prompt: string;
}

// Error response schema
export interface ErrorResponse {
  error: string;
  message?: string;
}
