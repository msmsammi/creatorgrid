import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { parse as parseCookies } from "cookie";
import { getDb } from "./db";
import { passwordResetTokens, sessions, users, workspaceMembers, workspaces } from "../drizzle/schema";

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = "creatorgrid_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const RESET_TTL_MS = 1000 * 60 * 30;
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, saltHex, hashHex] = encoded.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function cookieOptions(req: Request) {
  const host = (req.get("host") ?? "").replace(/^\[|\]$/g, "").split(":")[0]?.toLowerCase();
  const plainHttpLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return { httpOnly: true, secure: !plainHttpLocal, sameSite: plainHttpLocal ? "lax" as const : "none" as const, path: "/", maxAge: SESSION_TTL_MS };
}
export async function createSession(userId: number, req: Request, res: Response) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash: digest(token), expiresAt });
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
}
export async function getEmailUser(req: Request) {
  const token = parseCookies(req.headers.cookie ?? "")[SESSION_COOKIE];
  if (!token) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const [session] = await db.select({ userId: sessions.userId }).from(sessions).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!session) return undefined;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return undefined;
  return { id: user.id, name: user.name ?? "Creator", email: user.email ?? "", role: user.role };
}
export function clearEmailSession(req: Request, res: Response) {
  const token = parseCookies(req.headers.cookie ?? "")[SESSION_COOKIE];
  if (token) void getDb().then(db => db?.delete(sessions).where(eq(sessions.tokenHash, digest(token))));
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(req), maxAge: undefined });
}
export async function provisionWorkspace(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "my-workspace";
  const slug = `${base}-${randomBytes(3).toString("hex")}`;
  const result = await db.insert(workspaces).values({ name: `${name}'s studio`, slug, ownerId: userId, plan: "free" });
  const workspaceId = Number(result[0].insertId);
  await db.insert(workspaceMembers).values({ workspaceId, userId, role: "owner" });
  return workspaceId;
}
export async function issueResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rawToken = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({ userId, tokenHash: digest(rawToken), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
  return rawToken;
}
export async function consumeResetToken(token: string, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const tokenHash = digest(token);
  const [record] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, new Date()), isNull(passwordResetTokens.usedAt))).limit(1);
  if (!record) return false;
  const now = new Date();
  const [claimed] = await db.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.id, record.id), gt(passwordResetTokens.expiresAt, now), isNull(passwordResetTokens.usedAt)));
  if (!claimed.affectedRows) return false;
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.delete(sessions).where(eq(sessions.userId, record.userId));
  return true;
}
