import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  consentAt: timestamp("consentAt"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: mysqlEnum("plan", ["free", "creator_pro", "team"]).default("free").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workspaceMembers = mysqlTable("workspaceMembers", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["owner", "editor", "contributor", "viewer"]).default("contributor").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  platform: varchar("platform", { length: 64 }).notNull().default("Cross-platform"),
  color: varchar("color", { length: 24 }).notNull().default("#e86c4f"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contentTypes = mysqlTable("contentTypes", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  icon: varchar("icon", { length: 32 }).default("sparkles").notNull(),
});

export const contentItems = mysqlTable("contentItems", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: int("brandId").references(() => brands.id, { onDelete: "set null" }),
  contentTypeId: int("contentTypeId").references(() => contentTypes.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["idea", "drafting", "production", "review", "scheduled", "published"]).default("idea").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
  publishAt: timestamp("publishAt"),
  ownerUserId: int("ownerUserId").references(() => users.id, { onDelete: "set null" }),
  cover: varchar("cover", { length: 600 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const briefs = mysqlTable("briefs", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  version: int("version").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  contentItemId: int("contentItemId").references(() => contentItems.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  kind: mysqlEnum("kind", ["file", "link"]).default("link").notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull(),
  color: varchar("color", { length: 24 }).notNull().default("#ece8df"),
});

export const contentTags = mysqlTable("contentTags", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  tagId: int("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  requestedBy: int("requestedBy").references(() => users.id, { onDelete: "set null" }),
  reviewerId: int("reviewerId").references(() => users.id, { onDelete: "set null" }),
  status: mysqlEnum("status", ["pending", "approved", "changes_requested"]).default("pending").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export const performanceRecords = mysqlTable("performanceRecords", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  views: int("views").default(0).notNull(),
  likes: int("likes").default(0).notNull(),
  comments: int("comments").default(0).notNull(),
  saves: int("saves").default(0).notNull(),
  reach: int("reach").default(0).notNull(),
  engagementRate: decimal("engagementRate", { precision: 5, scale: 2 }).default("0").notNull(),
  isFictional: boolean("isFictional").default(false).notNull(),
});

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const savedViews = mysqlTable("savedViews", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  filters: json("filters").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
