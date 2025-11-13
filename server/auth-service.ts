import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "./db";
import { users, type User } from "@shared/schema";
import { eq, or } from "drizzle-orm";

const SALT_ROUNDS = 12;

export interface CreateUserParams {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async findUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(or(eq(users.email, usernameOrEmail), eq(users.username, usernameOrEmail)))
      .limit(1);
    return result[0];
  }

  async findUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async createUser(params: CreateUserParams): Promise<User> {
    const { email, username, password, firstName, lastName } = params;

    const existingUserByEmail = await this.findUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error("Email already in use");
    }

    const existingUserByUsername = await this.findUserByUsername(username);
    if (existingUserByUsername) {
      throw new Error("Username already in use");
    }

    const passwordHash = await this.hashPassword(password);

    const result = await db.insert(users).values({
      id: nanoid(10), // Generate short 10-character ID
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      membershipTier: "free",
      videosGeneratedThisMonth: 0,
    }).returning();

    return result[0];
  }

  async verifyCredentials(usernameOrEmail: string, password: string): Promise<User | null> {
    const user = await this.findUserByUsernameOrEmail(usernameOrEmail);
    
    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    return isValid ? user : null;
  }
}

export const authService = new AuthService();
