import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { hashPassword, normalizeEmail, SESSION_COOKIE, verifyPassword } from "./auth";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: { id: 1, email: "sample@example.com", name: "Sample User", role: "user" },
    req: { protocol: "https", headers: {}, get: (name: string) => name.toLowerCase() === "host" ? "preview.example" : undefined } as unknown as TrpcContext["req"],
    res: { clearCookie: (name: string, options: Record<string, unknown>) => clearedCookies.push({ name, options }) } as unknown as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the CreatorGrid session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(SESSION_COOKIE);
    expect(clearedCookies[0]?.options).toMatchObject({ secure: true, sameSite: "none", httpOnly: true, path: "/" });
  });
});

describe("email account primitives", () => {
  it("stores a salted scrypt hash and rejects a different password", async () => {
    const encoded = await hashPassword("correct horse battery");
    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain("correct horse battery");
    await expect(verifyPassword("correct horse battery", encoded)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", encoded)).resolves.toBe(false);
  });

  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  Creator@Example.COM ")).toBe("creator@example.com");
  });
});
