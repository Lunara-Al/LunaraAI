import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// CONSTANTS - Centralized configuration values
// ============================================================================

export const CREDIT_RESET_DAYS = 30;
export const DEFAULT_VIDEO_LENGTH = 10;
export const VIDEO_LENGTHS = [5, 10, 15] as const;
export const ASPECT_RATIOS = ["1:1", "16:9", "9:16"] as const;
export const QUALITY_LEVELS = ["basic", "hd", "4k"] as const;

export const MEMBERSHIP_TIERS = {
  free: {
    name: "Basic",
    price: 0,
    monthlyVideos: 5,
    maxLength: 10,
    quality: "basic" as const,
    monthlyCredits: 25,
  },
  pro: {
    name: "Pro",
    price: 19,
    monthlyVideos: 100,
    maxLength: 15,
    quality: "hd" as const,
    monthlyCredits: 300,
    get stripePriceId() {
      return process.env.STRIPE_PRICE_ID_PRO?.trim() || null;
    },
  },
  premium: {
    name: "Premium",
    price: 49,
    monthlyVideos: -1,
    maxLength: 15,
    quality: "4k" as const,
    monthlyCredits: 1000,
    get stripePriceId() {
      return process.env.STRIPE_PRICE_ID_PREMIUM?.trim() || null;
    },
  },
} as const;

export type MembershipTier = keyof typeof MEMBERSHIP_TIERS;
export type VideoLength = (typeof VIDEO_LENGTHS)[number];
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

// Helper to get credits for a tier
export function getCreditsForTier(tier: MembershipTier): number {
  return MEMBERSHIP_TIERS[tier].monthlyCredits;
}

// Helper to check if tier allows unlimited videos
export function hasUnlimitedVideos(tier: MembershipTier): boolean {
  return MEMBERSHIP_TIERS[tier].monthlyVideos === -1;
}

// ============================================================================
// DATABASE TABLES - Session Management
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ============================================================================
// DATABASE TABLES - Users
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  verifiedAt: timestamp("verified_at"),
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  membershipTier: varchar("membership_tier", { length: 20 }).default("free").notNull(),
  videosGeneratedThisMonth: integer("videos_generated_this_month").default(0).notNull(),
  credits: integer("credits").default(25).notNull(),
  monthlyCreditsAllocated: integer("monthly_credits_allocated").default(25).notNull(),
  creditsLastResetDate: timestamp("credits_last_reset_date").defaultNow().notNull(),
  lastResetDate: timestamp("last_reset_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type FrontendUser = Omit<User, "passwordHash" | "resetToken" | "resetTokenExpiry"> & {
  hasPassword: boolean;
};

// ============================================================================
// DATABASE TABLES - Video Generations
// ============================================================================

export const videoGenerations = pgTable("video_generations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  prompt: text("prompt").notNull(),
  videoUrl: text("video_url").notNull(),
  length: integer("length").default(DEFAULT_VIDEO_LENGTH),
  aspectRatio: varchar("aspect_ratio", { length: 10 }).default("1:1"),
  style: text("style"),
  displayOnProfile: integer("display_on_profile").default(0).notNull(),
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

// ============================================================================
// DATABASE TABLES - Video Share Links
// ============================================================================

export const videoShareLinks = pgTable("video_share_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  videoId: integer("video_id").references(() => videoGenerations.id).notNull(),
  ownerUserId: varchar("owner_user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  title: text("title"),
  description: text("description"),
  isRevoked: integer("is_revoked").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVideoShareLinkSchema = createInsertSchema(videoShareLinks).pick({
  videoId: true,
  ownerUserId: true,
  token: true,
  title: true,
  description: true,
});

export type InsertVideoShareLink = z.infer<typeof insertVideoShareLinkSchema>;
export type VideoShareLink = typeof videoShareLinks.$inferSelect;

// ============================================================================
// DATABASE TABLES - User Settings
// ============================================================================

export const userSettings = pgTable("user_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id).unique().notNull(),
  defaultLength: integer("default_length").default(DEFAULT_VIDEO_LENGTH).notNull(),
  defaultAspectRatio: varchar("default_aspect_ratio", { length: 10 }).default("1:1").notNull(),
  emailNotifications: integer("email_notifications").default(1).notNull(),
  galleryView: varchar("gallery_view", { length: 10 }).default("grid").notNull(),
  theme: varchar("theme", { length: 10 }).default("dark").notNull(),
  autoSave: integer("auto_save").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const updateUserSettingsSchema = insertUserSettingsSchema.partial().omit({ userId: true });

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// ============================================================================
// DATABASE TABLES - Audit Log
// ============================================================================

export const accountAuditLog = pgTable("account_audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  email: varchar("email").notNull(),
  username: varchar("username"),
  action: varchar("action", { length: 20 }).notNull(),
  authProvider: varchar("auth_provider", { length: 20 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AccountAuditLog = typeof accountAuditLog.$inferSelect;
export type InsertAccountAuditLog = typeof accountAuditLog.$inferInsert;

// ============================================================================
// DATABASE TABLES - Contact Messages
// ============================================================================

export const contactMessages = pgTable("contact_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("unread").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).pick({
  name: true,
  email: true,
  message: true,
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// ============================================================================
// VALIDATION SCHEMAS - Video Generation
// ============================================================================

export const videoGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(500, "Prompt must be less than 500 characters"),
  length: z.number().refine((val) => VIDEO_LENGTHS.includes(val as VideoLength), "Length must be 5, 10, or 15 seconds").default(DEFAULT_VIDEO_LENGTH),
  aspectRatio: z.enum(ASPECT_RATIOS).default("1:1"),
  style: z.string().optional(),
  imageBase64: z.string().optional(),
});

export type VideoGenerationRequest = z.infer<typeof videoGenerationSchema>;

export interface VideoGenerationResponse {
  videoUrl: string;
  prompt: string;
  id?: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

// ============================================================================
// VALIDATION SCHEMAS - Authentication
// ============================================================================

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: usernameSchema,
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().optional().transform((val) => val?.trim() || undefined),
  lastName: z.string().optional().transform((val) => val?.trim() || undefined),
  email: z.string().optional().transform((val) => val?.trim() || undefined).refine(
    (val) => !val || z.string().email().safeParse(val).success,
    "Invalid email address"
  ),
  username: z.string().optional().transform((val) => val?.trim() || undefined).refine(
    (val) => !val || (val.length >= 3 && val.length <= 20 && /^[a-zA-Z0-9_]+$/.test(val)),
    "Username must be 3-20 characters with only letters, numbers, and underscores"
  ),
  currentPassword: z.string().optional().transform((val) => val || undefined),
  newPassword: z.string().optional().transform((val) => val || undefined).refine(
    (val) => !val || (val.length >= 8 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val)),
    "Password must be 8+ characters with uppercase, lowercase, and number"
  ),
}).refine(
  (data) => !data.newPassword || data.currentPassword,
  { message: "Current password is required to change password", path: ["currentPassword"] }
);

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
