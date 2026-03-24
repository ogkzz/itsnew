import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Analyses table - stores each analysis result
 */
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  headers: json("headers"),
  // Detection results
  proxyVpnScore: int("proxyVpnScore").default(0).notNull(),
  domainScore: int("domainScore").default(0).notNull(),
  fingerprintScore: int("fingerprintScore").default(0).notNull(),
  jailbreakScore: int("jailbreakScore").default(0).notNull(),
  manipulationScore: int("manipulationScore").default(0).notNull(),
  totalScore: int("totalScore").default(0).notNull(),
  // Status: safe, suspicious, confirmed
  status: mysqlEnum("status", ["safe", "suspicious", "confirmed"]).default("safe").notNull(),
  // Detection details
  detections: json("detections"),
  // Metadata
  asnInfo: json("asnInfo"),
  geoInfo: json("geoInfo"),
  fingerprintId: varchar("fingerprintId", { length: 128 }),
  // Step tracking
  step: mysqlEnum("step", ["collecting", "verifying", "completed"]).default("collecting").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

/**
 * Logs table - stores system and access logs
 */
export const logs = mysqlTable("logs", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["access", "analysis", "security", "system"]).default("system").notNull(),
  level: mysqlEnum("level", ["info", "warn", "error"]).default("info").notNull(),
  message: text("message").notNull(),
  details: json("details"),
  sourceIp: varchar("sourceIp", { length: 45 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

/**
 * Fingerprints table - stores unique device fingerprints
 */
export const fingerprints = mysqlTable("fingerprints", {
  id: int("id").autoincrement().primaryKey(),
  fingerprintHash: varchar("fingerprintHash", { length: 128 }).notNull().unique(),
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  headers: json("headers"),
  seenCount: int("seenCount").default(1).notNull(),
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  ipChanges: int("ipChanges").default(0).notNull(),
  previousIps: json("previousIps"),
  suspicious: int("suspicious").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Fingerprint = typeof fingerprints.$inferSelect;
export type InsertFingerprint = typeof fingerprints.$inferInsert;

/**
 * Domains table - blacklisted/suspicious domains
 */
export const domains = mysqlTable("domains", {
  id: int("id").autoincrement().primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  reason: text("reason"),
  type: mysqlEnum("type", ["keyword", "extension", "manual"]).default("manual").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Domain = typeof domains.$inferSelect;
export type InsertDomain = typeof domains.$inferInsert;

/**
 * Exposed table - manually registered suspicious users
 */
export const exposed = mysqlTable("exposed", {
  id: int("id").autoincrement().primaryKey(),
  nameId: varchar("nameId", { length: 128 }).notNull(),
  discord: varchar("discord", { length: 128 }),
  photo: text("photo"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "banned", "under_review", "cleared"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exposed = typeof exposed.$inferSelect;
export type InsertExposed = typeof exposed.$inferInsert;

/**
 * Settings table - system configuration key/value store
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("settingKey", { length: 128 }).notNull().unique(),
  value: json("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
