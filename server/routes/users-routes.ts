import { Router } from "express";
import { db } from "@/server/db";
import { users } from "@shared/schema";
import { ilike } from "drizzle-orm";

export function createUsersRouter() {
  const router = Router();

  // Search users by username
  router.get("/search", async (req, res) => {
    try {
      const query = (req.query.q as string)?.trim();

      if (!query || query.length < 1) {
        return res.json([]);
      }

      if (query.length > 50) {
        return res.status(400).json({ error: "Search query too long" });
      }

      const results = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          membershipTier: users.membershipTier,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(ilike(users.username, `%${query}%`))
        .limit(20);

      res.json(results);
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Get user profile by username
  router.get("/:username", async (req, res) => {
    try {
      const { username } = req.params;

      if (!username || username.length < 1) {
        return res.status(400).json({ error: "Username required" });
      }

      const user = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          membershipTier: users.membershipTier,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(ilike(users.username, username))
        .limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user[0]);
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  return router;
}
