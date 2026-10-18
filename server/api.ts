import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { and, desc, eq, gt, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { approvals, assets, brands, briefs, comments, contentItems, contentTypes, performanceRecords, savedViews, users, workspaceMembers, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { clearEmailSession, consumeResetToken, createSession, hashPassword, issueResetToken, normalizeEmail, provisionWorkspace, verifyPassword } from "./auth";

const stages = ["idea", "drafting", "production", "review", "scheduled", "published"] as const;
const accountBody = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(128) });
const newContentBody = z.object({ title: z.string().trim().min(1).max(255), description: z.string().max(5000).optional(), status: z.enum(stages).default("idea"), brandId: z.number().int().positive().optional(), contentTypeId: z.number().int().positive().optional(), publishAt: z.string().datetime().optional() });
const limitState = new Map<string, { count: number; resetAt: number }>();
function rateLimited(req: Request) {
  const key = `${req.path}:${req.ip}`;
  const now = Date.now();
  const current = limitState.get(key);
  if (!current || current.resetAt < now) { limitState.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  current.count += 1;
  return current.count > 12;
}
function fail(res: Response, code: number, message: string) { res.status(code).json({ error: message }); }
function asyncRoute(fn: (req: Request, res: Response) => Promise<unknown>) { return (req: Request, res: Response) => { void fn(req, res).catch(error => { console.error("[CreatorGrid API]", error instanceof Error ? error.message : "unknown error"); if (!res.headersSent) fail(res, 500, "Something went wrong. Please try again."); }); }; }
async function currentWorkspace(userId: number, workspaceId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const membershipCondition = workspaceId
    ? and(eq(workspaceMembers.userId, userId), eq(workspaces.id, workspaceId))
    : eq(workspaceMembers.userId, userId);
  const rows = await db.select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug, plan: workspaces.plan, role: workspaceMembers.role })
    .from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(membershipCondition).limit(1);
  return rows[0];
}
async function ensureWorkspace(req: Request, res: Response, workspaceId?: number) {
  const user = (req as Request & { creatorUser?: { id: number } }).creatorUser;
  if (!user) { fail(res, 401, "Please sign in to continue."); return undefined; }
  const workspace = await currentWorkspace(user.id, workspaceId);
  if (!workspace) { fail(res, 404, "Workspace not found."); return undefined; }
  return { user, workspace };
}
function requireAccount(req: Request, res: Response, next: (error?: unknown) => void) {
  void import("./auth").then(({ getEmailUser }) => getEmailUser(req)).then(user => {
    if (!user) { fail(res, 401, "Please sign in to continue."); return; }
    (req as Request & { creatorUser?: typeof user }).creatorUser = user;
    next();
  }).catch(next);
}
function requireJsonAndRequestHeader(req: Request, res: Response, next: (error?: unknown) => void) {
  if (!req.is("application/json")) { fail(res, 415, "This endpoint accepts JSON requests only."); return; }
  if (req.get("X-CreatorGrid-Request") !== "1") { fail(res, 403, "Request could not be verified."); return; }
  next();
}

async function seedWorkspace(workspaceId: number) {
  const db = await getDb();
  if (!db) return;
  const [existing] = await db.select({ id: contentItems.id }).from(contentItems).where(eq(contentItems.workspaceId, workspaceId)).limit(1);
  if (existing) return;
  const brandRows = await db.insert(brands).values([
    { workspaceId, name: "Good Things Studio", platform: "YouTube · Instagram", color: "#e86c4f" },
    { workspaceId, name: "The Open Tab", platform: "Podcast · Newsletter", color: "#8d79b5" },
  ]);
  const firstBrand = Number(brandRows[0].insertId);
  const secondBrand = firstBrand + 1;
  const typeRows = await db.insert(contentTypes).values([
    { workspaceId, name: "YouTube video" }, { workspaceId, name: "Podcast episode" },
    { workspaceId, name: "Instagram carousel" }, { workspaceId, name: "Newsletter" },
    { workspaceId, name: "Short video" }, { workspaceId, name: "Social story" },
  ]);
  const firstType = Number(typeRows[0].insertId);
  const profiles = [
    { name: "Alex Rivera", slug: "alex", role: "editor" as const },
    { name: "Jo Park", slug: "jo", role: "contributor" as const },
    { name: "Sam Okafor", slug: "sam", role: "viewer" as const },
  ];
  const demoUserIds: number[] = [];
  for (const profile of profiles) {
    const email = `${profile.slug}.${workspaceId}@example.invalid`;
    const [found] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const userId = found?.id ?? Number((await db.insert(users).values({ openId: `demo:${workspaceId}:${profile.slug}`, name: profile.name, email, loginMethod: "demo", passwordHash: null, lastSignedIn: new Date() }))[0].insertId);
    demoUserIds.push(userId);
    const [membership] = await db.select({ id: workspaceMembers.id }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))).limit(1);
    if (!membership) await db.insert(workspaceMembers).values({ workspaceId, userId, role: profile.role });
  }
  const examples = [
    ["The 5-minute Sunday reset that changed my week", firstBrand, "production", 1],
    ["Small rituals, big creative energy", secondBrand, "review", 2],
    ["A desk that makes you want to begin", firstBrand, "scheduled", 3],
    ["What I learned from a year of slow growth", secondBrand, "drafting", 4],
    ["Three camera angles for a calmer vlog", firstBrand, "idea", 5],
    ["The Sunday table: autumn edition", firstBrand, "production", 6],
    ["Making space for unfinished ideas", secondBrand, "published", 7],
    ["Five things I stopped buying for my studio", firstBrand, "published", 8],
    ["A gentle guide to starting over", secondBrand, "idea", 10],
    ["Make a tiny trailer for a big idea", firstBrand, "drafting", 11],
    ["Creator check-in: October", secondBrand, "scheduled", 12],
    ["A playlist for getting unstuck", firstBrand, "review", 13],
  ] as const;
  const items = await db.insert(contentItems).values(examples.map(([title, brandId, status, dayOffset], index) => ({
    workspaceId, brandId, title, status, priority: "normal" as const,
    contentTypeId: firstType + index % 6, ownerUserId: demoUserIds[index % demoUserIds.length],
    publishAt: new Date(Date.now() + dayOffset * 86_400_000),
    description: `A fictional ${title.toLowerCase()} concept from the CreatorGrid sample workspace.`,
  })));
  const startId = Number(items[0].insertId);
  const demoIds = Array.from({ length: examples.length }, (_, i) => startId + i);
  await db.insert(briefs).values(demoIds.slice(0, 3).map(contentItemId => ({ contentItemId, body: "## Working title\nA clear promise for the audience.\n\n## Angle\nMake one useful idea feel personal, practical, and easy to try.\n\n## Outline\n1. Open with a familiar moment\n2. Share the small shift\n3. Offer three concrete takeaways\n4. Close with a question for the community" })));
  await db.insert(assets).values([
    { workspaceId, contentItemId: demoIds[0], name: "sunday-reset-cover.svg", kind: "file", url: "/demos/creator-studio.svg", mimeType: "image/svg+xml" },
    { workspaceId, contentItemId: demoIds[1], name: "episode-48-final.wav", kind: "link", url: "https://example.com/demo/episode-48-final.wav", mimeType: "audio/wav" },
    { workspaceId, name: "autumn-colour-notes.pdf", kind: "link", url: "https://example.com/demo/autumn-colour-notes.pdf", mimeType: "application/pdf" },
  ]);
  await db.insert(approvals).values([
    { contentItemId: demoIds[1], status: "pending", note: "Ready for a final listen-through." },
    { contentItemId: demoIds[11], status: "pending", note: "Please check the playlist links and closing note." },
  ]);
  await db.insert(performanceRecords).values([
    { contentItemId: demoIds[6], views: 32500, likes: 2840, comments: 312, saves: 740, reach: 41800, engagementRate: "8.74", isFictional: true },
    { contentItemId: demoIds[7], views: 27800, likes: 1930, comments: 178, saves: 560, reach: 35200, engagementRate: "7.16", isFictional: true },
  ]);
  await db.insert(comments).values([
    { contentItemId: demoIds[0], userId: demoUserIds[0], body: "The opening feels really natural. Could we bring the Sunday list example into the first minute?" },
    { contentItemId: demoIds[1], userId: demoUserIds[1], body: "Thumbnail selects are in the asset shelf. I left three options and marked my favorite." },
  ]);
}

export function registerCreatorGridApi(app: Express) {
  app.use("/api/app", (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return requireJsonAndRequestHeader(req, res, next);
    next();
  });
  app.use("/api/auth", (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !req.is("application/json")) return fail(res, 415, "This endpoint accepts JSON requests only.");
    next();
  });
  app.post("/api/auth/sign-up", asyncRoute(async (req, res) => {
    if (rateLimited(req)) return fail(res, 429, "Too many attempts. Try again in a minute.");
    const parsed = accountBody.extend({ name: z.string().trim().min(1).max(100), consent: z.literal(true) }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "Enter your name, a valid email, an 8-character password, and accept the privacy notice.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const email = normalizeEmail(parsed.data.email);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return fail(res, 409, "An account with this email already exists. Sign in instead.");
    const passwordHash = await hashPassword(parsed.data.password);
    const inserted = await db.insert(users).values({ openId: `email:${randomBytes(20).toString("hex")}`, name: parsed.data.name, email, loginMethod: "email", passwordHash, consentAt: new Date(), lastSignedIn: new Date() });
    const userId = Number(inserted[0].insertId);
    const workspaceId = await provisionWorkspace(userId, parsed.data.name.split(" ")[0] || "Creator");
    await seedWorkspace(workspaceId);
    await createSession(userId, req, res);
    res.status(201).json({ user: { id: userId, name: parsed.data.name, email }, workspaceId });
  }));
  app.post("/api/auth/sign-in", asyncRoute(async (req, res) => {
    if (rateLimited(req)) return fail(res, 429, "Too many attempts. Try again in a minute.");
    const parsed = accountBody.safeParse(req.body); if (!parsed.success) return fail(res, 400, "Enter a valid email and password.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(parsed.data.email))).limit(1);
    if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) return fail(res, 401, "That email and password combination wasn't recognised.");
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
    await createSession(user.id, req, res);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  }));
  app.post("/api/auth/sign-out", requireAccount, asyncRoute(async (req, res) => { clearEmailSession(req, res); res.json({ success: true }); }));
  app.get("/api/auth/me", requireAccount, asyncRoute(async (req, res) => { const user = (req as Request & { creatorUser?: { id: number; name: string; email: string } }).creatorUser; res.json({ user }); }));
  app.post("/api/auth/forgot-password", asyncRoute(async (req, res) => {
    if (rateLimited(req)) return fail(res, 429, "Please wait a moment before trying again.");
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Enter a valid email address.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, normalizeEmail(parsed.data.email)), isNotNull(users.passwordHash))).limit(1);
    const response: { message: string; developmentResetUrl?: string } = { message: "If an account matches that email, reset instructions will be sent when email delivery is configured." };
    if (user && process.env.NODE_ENV === "development") {
      const token = await issueResetToken(user.id);
      response.developmentResetUrl = `/forgot-password?token=${encodeURIComponent(token)}`;
      response.message = "Development mode: use the one-time link below to reset the password.";
    }
    res.json(response);
  }));
  app.post("/api/auth/reset-password", asyncRoute(async (req, res) => {
    const parsed = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "Choose a password with at least 8 characters.");
    const ok = await consumeResetToken(parsed.data.token, await hashPassword(parsed.data.password));
    if (!ok) return fail(res, 400, "This reset link is invalid, expired, or already used.");
    res.json({ success: true });
  }));

  app.get("/api/app/bootstrap", requireAccount, asyncRoute(async (req, res) => {
    const user = (req as Request & { creatorUser?: { id: number } }).creatorUser!;
    const workspace = await currentWorkspace(user.id);
    if (!workspace) return fail(res, 404, "No workspace found for this account.");
    await seedWorkspace(workspace.id);
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [brandRows, itemRows, assetRows, approvalRows, metricRows, memberRows, viewRows, typeRows] = await Promise.all([
      db.select().from(brands).where(eq(brands.workspaceId, workspace.id)),
      db.select().from(contentItems).where(eq(contentItems.workspaceId, workspace.id)).orderBy(desc(contentItems.updatedAt)),
      db.select().from(assets).where(eq(assets.workspaceId, workspace.id)).orderBy(desc(assets.createdAt)),
      db.select().from(approvals).innerJoin(contentItems, eq(approvals.contentItemId, contentItems.id)).where(and(eq(contentItems.workspaceId, workspace.id), eq(approvals.status, "pending"))),
      db.select().from(performanceRecords).innerJoin(contentItems, eq(performanceRecords.contentItemId, contentItems.id)).where(eq(contentItems.workspaceId, workspace.id)),
      db.select({ id: workspaceMembers.id, userId: users.id, role: workspaceMembers.role, name: users.name, email: users.email }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(eq(workspaceMembers.workspaceId, workspace.id)),
      db.select().from(savedViews).where(and(eq(savedViews.workspaceId, workspace.id), eq(savedViews.userId, user.id))).orderBy(desc(savedViews.createdAt)),
      db.select().from(contentTypes).where(eq(contentTypes.workspaceId, workspace.id)),
    ]);
    res.json({ workspace, brands: brandRows, contentTypes: typeRows, content: itemRows, assets: assetRows, approvals: approvalRows.map(row => ({ ...row.approvals, content: row.contentItems })), performance: metricRows.map(row => ({ ...row.performanceRecords, content: row.contentItems })), members: memberRows, savedViews: viewRows, fictionalDemo: true });
  }));
  app.post("/api/app/content", requireAccount, asyncRoute(async (req, res) => {
    const parsed = newContentBody.safeParse(req.body); if (!parsed.success) return fail(res, 400, "Add a title to create this content item.");
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    if (["viewer"].includes(scope.workspace.role)) return fail(res, 403, "Your workspace role is view-only.");
    if (parsed.data.brandId) { const [brand] = await db.select({ id: brands.id }).from(brands).where(and(eq(brands.id, parsed.data.brandId), eq(brands.workspaceId, scope.workspace.id))).limit(1); if (!brand) return fail(res, 404, "Channel not found in this workspace."); }
    if (parsed.data.contentTypeId) { const [type] = await db.select({ id: contentTypes.id }).from(contentTypes).where(and(eq(contentTypes.id, parsed.data.contentTypeId), eq(contentTypes.workspaceId, scope.workspace.id))).limit(1); if (!type) return fail(res, 404, "Content type not found in this workspace."); }
    const result = await db.insert(contentItems).values({ workspaceId: scope.workspace.id, title: parsed.data.title, description: parsed.data.description, status: parsed.data.status, brandId: parsed.data.brandId, contentTypeId: parsed.data.contentTypeId, ownerUserId: scope.user.id, publishAt: parsed.data.publishAt ? new Date(parsed.data.publishAt) : null });
    res.status(201).json({ id: Number(result[0].insertId), ...parsed.data });
  }));
  app.patch("/api/app/content/:id", requireAccount, asyncRoute(async (req, res) => {
    const id = Number(req.params.id); if (!Number.isInteger(id) || id < 1) return fail(res, 400, "Invalid content item.");
    const parsed = z.object({ title: z.string().trim().min(1).max(255).optional(), description: z.string().max(5000).nullable().optional(), status: z.enum(stages).optional(), brandId: z.number().int().positive().nullable().optional(), contentTypeId: z.number().int().positive().nullable().optional(), publishAt: z.string().datetime().nullable().optional() }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Check the content fields and try again.");
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    if (scope.workspace.role === "viewer") return fail(res, 403, "Your workspace role is view-only.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [item] = await db.select().from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.workspaceId, scope.workspace.id))).limit(1);
    if (!item) return fail(res, 404, "Content item not found.");
    if (parsed.data.brandId) { const [brand] = await db.select({ id: brands.id }).from(brands).where(and(eq(brands.id, parsed.data.brandId), eq(brands.workspaceId, scope.workspace.id))).limit(1); if (!brand) return fail(res, 404, "Channel not found in this workspace."); }
    if (parsed.data.contentTypeId) { const [type] = await db.select({ id: contentTypes.id }).from(contentTypes).where(and(eq(contentTypes.id, parsed.data.contentTypeId), eq(contentTypes.workspaceId, scope.workspace.id))).limit(1); if (!type) return fail(res, 404, "Content type not found in this workspace."); }
    const update: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() }; if (parsed.data.publishAt !== undefined) update.publishAt = parsed.data.publishAt ? new Date(parsed.data.publishAt) : null;
    await db.update(contentItems).set(update).where(eq(contentItems.id, id));
    res.json({ success: true });
  }));
  app.get("/api/app/content/:id/brief", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const id = Number(req.params.id); const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.workspaceId, scope.workspace.id))).limit(1);
    if (!item) return fail(res, 404, "Content item not found.");
    const [brief] = await db.select().from(briefs).where(eq(briefs.contentItemId, id)).limit(1); res.json({ brief: brief ?? null });
  }));
  app.put("/api/app/content/:id/brief", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    if (scope.workspace.role === "viewer") return fail(res, 403, "Your workspace role is view-only.");
    const parsed = z.object({ body: z.string().max(20000) }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Brief text is too long.");
    const id = Number(req.params.id); const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.workspaceId, scope.workspace.id))).limit(1);
    if (!item) return fail(res, 404, "Content item not found.");
    const [current] = await db.select().from(briefs).where(eq(briefs.contentItemId, id)).limit(1);
    if (current) await db.update(briefs).set({ body: parsed.data.body, version: current.version + 1, updatedAt: new Date() }).where(eq(briefs.id, current.id));
    else await db.insert(briefs).values({ contentItemId: id, body: parsed.data.body });
    res.json({ success: true });
  }));
  app.get("/api/app/content/:id/comments", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const id = Number(req.params.id); const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.workspaceId, scope.workspace.id))).limit(1); if (!item) return fail(res, 404, "Content item not found.");
    res.json(await db.select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, name: users.name }).from(comments).innerJoin(users, eq(comments.userId, users.id)).where(eq(comments.contentItemId, id)).orderBy(desc(comments.createdAt)));
  }));
  app.post("/api/app/content/:id/comments", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const parsed = z.object({ body: z.string().trim().min(1).max(3000) }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Write a comment before posting.");
    const id = Number(req.params.id); const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.workspaceId, scope.workspace.id))).limit(1); if (!item) return fail(res, 404, "Content item not found.");
    await db.insert(comments).values({ contentItemId: id, userId: scope.user.id, body: parsed.data.body }); res.status(201).json({ success: true });
  }));
  app.post("/api/app/content/:id/request-review", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    if (scope.workspace.role === "viewer") return fail(res, 403, "Your workspace role is view-only.");
    const id = Number(req.params.id); const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.workspaceId, scope.workspace.id))).limit(1); if (!item) return fail(res, 404, "Content item not found.");
    const [pending] = await db.select({ id: approvals.id }).from(approvals).where(and(eq(approvals.contentItemId, id), eq(approvals.status, "pending"))).limit(1);
    if (pending) return fail(res, 409, "This content already has a pending review request.");
    await db.insert(approvals).values({ contentItemId: id, requestedBy: scope.user.id, status: "pending" }); await db.update(contentItems).set({ status: "review", updatedAt: new Date() }).where(eq(contentItems.id, id)); res.json({ success: true });
  }));
  app.patch("/api/app/approvals/:id", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    if (!["owner", "editor"].includes(scope.workspace.role)) return fail(res, 403, "Only owners and editors can resolve approval requests.");
    const parsed = z.object({ decision: z.enum(["approved", "changes_requested"]), note: z.string().max(1000).optional() }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Choose approve or request changes.");
    const id = Number(req.params.id); const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [approval] = await db.select({ approval: approvals, workspaceId: contentItems.workspaceId }).from(approvals).innerJoin(contentItems, eq(approvals.contentItemId, contentItems.id)).where(and(eq(approvals.id, id), eq(contentItems.workspaceId, scope.workspace.id), eq(approvals.status, "pending"))).limit(1); if (!approval) return fail(res, 404, "Pending approval request not found.");
    await db.update(approvals).set({ status: parsed.data.decision, note: parsed.data.note ?? approval.approval.note, reviewerId: scope.user.id, resolvedAt: new Date() }).where(eq(approvals.id, id));
    if (parsed.data.decision === "approved") await db.update(contentItems).set({ status: "scheduled", updatedAt: new Date() }).where(eq(contentItems.id, approval.approval.contentItemId));
    else await db.update(contentItems).set({ status: "drafting", updatedAt: new Date() }).where(eq(contentItems.id, approval.approval.contentItemId));
    res.json({ success: true });
  }));
  app.post("/api/app/assets", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const parsed = z.object({ name: z.string().trim().min(1).max(255), url: z.string().url().max(1000).refine(value => /^https?:\/\//i.test(value), "Use a secure web link."), contentItemId: z.number().int().positive().optional(), kind: z.enum(["file", "link"]).default("link") }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Provide an asset name and valid HTTP or HTTPS link.");
    if (scope.workspace.role === "viewer") return fail(res, 403, "Your workspace role is view-only.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    if (parsed.data.contentItemId) { const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, parsed.data.contentItemId), eq(contentItems.workspaceId, scope.workspace.id))).limit(1); if (!item) return fail(res, 404, "Content item not found."); }
    await db.insert(assets).values({ workspaceId: scope.workspace.id, contentItemId: parsed.data.contentItemId, name: parsed.data.name, url: parsed.data.url, kind: parsed.data.kind }); res.status(201).json({ success: true });
  }));
  app.post("/api/app/saved-views", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const parsed = z.object({ name: z.string().trim().min(1).max(100), filters: z.record(z.string(), z.string()).refine(values => Object.values(values).every(value => value.length <= 256)) }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Add a name and valid filters for this saved view.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    await db.insert(savedViews).values({ workspaceId: scope.workspace.id, userId: scope.user.id, name: parsed.data.name, filters: parsed.data.filters }); res.status(201).json({ success: true });
  }));
  app.post("/api/app/brands", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    if (!["owner", "editor"].includes(scope.workspace.role)) return fail(res, 403, "Only owners and editors can manage channels.");
    const parsed = z.object({ name: z.string().trim().min(1).max(160), platform: z.string().trim().max(64).default("Cross-platform"), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e86c4f") }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "Enter a channel name and supported platform.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    await db.insert(brands).values({ workspaceId: scope.workspace.id, ...parsed.data }); res.status(201).json({ success: true });
  }));
  app.patch("/api/app/members/:id", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    if (scope.workspace.role !== "owner") return fail(res, 403, "Only a workspace owner can change team roles.");
    const memberId = Number(req.params.id);
    const parsed = z.object({ role: z.enum(["editor", "contributor", "viewer"]) }).safeParse(req.body);
    if (!Number.isInteger(memberId) || !parsed.success) return fail(res, 400, "Choose editor, contributor or viewer.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    const [member] = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, scope.workspace.id))).limit(1);
    if (!member || member.role === "owner") return fail(res, 404, "That team role cannot be changed here.");
    await db.update(workspaceMembers).set({ role: parsed.data.role }).where(eq(workspaceMembers.id, memberId)); res.json({ success: true });
  }));
  app.post("/api/app/upgrade/test", requireAccount, asyncRoute(async (req, res) => {
    const scope = await ensureWorkspace(req, res); if (!scope) return;
    const parsed = z.object({ plan: z.enum(["creator_pro", "team"]) }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Choose a plan to preview.");
    if (scope.workspace.role !== "owner") return fail(res, 403, "Only a workspace owner can change plans.");
    const db = await getDb(); if (!db) return fail(res, 503, "Database is not configured yet.");
    await db.update(workspaces).set({ plan: parsed.data.plan }).where(eq(workspaces.id, scope.workspace.id));
    res.json({ success: true, testOnly: true, message: "Test upgrade complete. No payment was collected." });
  }));
}
