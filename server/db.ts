import { eq, desc, sql, and, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, analyses, logs, fingerprints, domains, exposed, settings, type InsertAnalysis, type InsertLog, type InsertFingerprint, type InsertDomain, type InsertExposed } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER QUERIES ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== ANALYSIS QUERIES ====================

export async function createAnalysis(data: InsertAnalysis) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(analyses).values(data);
  return result[0].insertId;
}

export async function getAnalyses(limit = 50, offset = 0, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(analyses).orderBy(desc(analyses.createdAt)).limit(limit).offset(offset);
  if (statusFilter && statusFilter !== "all") {
    return db.select().from(analyses)
      .where(eq(analyses.status, statusFilter as any))
      .orderBy(desc(analyses.createdAt)).limit(limit).offset(offset);
  }
  return query;
}

export async function getAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAnalysisStats() {
  const db = await getDb();
  if (!db) return { total: 0, safe: 0, suspicious: 0, confirmed: 0 };
  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    safe: sql<number>`SUM(CASE WHEN status = 'safe' THEN 1 ELSE 0 END)`,
    suspicious: sql<number>`SUM(CASE WHEN status = 'suspicious' THEN 1 ELSE 0 END)`,
    confirmed: sql<number>`SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END)`,
  }).from(analyses);
  return result[0] || { total: 0, safe: 0, suspicious: 0, confirmed: 0 };
}

export async function getRecentAnalyses(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analyses).orderBy(desc(analyses.createdAt)).limit(limit);
}

export async function getAnalysisCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(analyses);
  return result[0]?.count || 0;
}

export async function getDetectionTypeStats() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    avgProxyVpn: sql<number>`AVG(proxyVpnScore)`,
    avgDomain: sql<number>`AVG(domainScore)`,
    avgFingerprint: sql<number>`AVG(fingerprintScore)`,
    avgJailbreak: sql<number>`AVG(jailbreakScore)`,
    avgManipulation: sql<number>`AVG(manipulationScore)`,
  }).from(analyses);
  return result[0];
}

// ==================== LOG QUERIES ====================

export async function createLog(data: InsertLog) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(logs).values(data);
  return result[0].insertId;
}

export async function getLogs(limit = 50, offset = 0, typeFilter?: string, levelFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (typeFilter && typeFilter !== "all") conditions.push(eq(logs.type, typeFilter as any));
  if (levelFilter && levelFilter !== "all") conditions.push(eq(logs.level, levelFilter as any));
  
  if (conditions.length > 0) {
    return db.select().from(logs).where(and(...conditions)).orderBy(desc(logs.createdAt)).limit(limit).offset(offset);
  }
  return db.select().from(logs).orderBy(desc(logs.createdAt)).limit(limit).offset(offset);
}

export async function getLogCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(logs);
  return result[0]?.count || 0;
}

// ==================== FINGERPRINT QUERIES ====================

export async function upsertFingerprint(data: InsertFingerprint) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(fingerprints).where(eq(fingerprints.fingerprintHash, data.fingerprintHash)).limit(1);
  
  if (existing.length > 0) {
    const fp = existing[0];
    const ipChanged = fp.sourceIp !== data.sourceIp;
    const prevIps = (fp.previousIps as string[] || []);
    if (ipChanged && !prevIps.includes(data.sourceIp)) {
      prevIps.push(data.sourceIp);
    }
    await db.update(fingerprints)
      .set({
        seenCount: sql`seenCount + 1`,
        lastSeen: new Date(),
        sourceIp: data.sourceIp,
        ipChanges: ipChanged ? sql`ipChanges + 1` : fp.ipChanges,
        previousIps: prevIps,
        suspicious: data.suspicious || fp.suspicious,
      })
      .where(eq(fingerprints.id, fp.id));
    return fp;
  } else {
    await db.insert(fingerprints).values({ ...data, previousIps: [] });
    return data;
  }
}

export async function getFingerprints(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fingerprints).orderBy(desc(fingerprints.lastSeen)).limit(limit);
}

// ==================== DOMAIN QUERIES ====================

export async function addDomain(data: InsertDomain) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(domains).values(data);
  return result[0].insertId;
}

export async function getDomains(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(domains).where(eq(domains.isActive, 1)).orderBy(desc(domains.createdAt)).limit(limit);
}

export async function deleteDomain(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(domains).where(eq(domains.id, id));
}

export async function getBlacklistedDomains(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ domain: domains.domain }).from(domains).where(eq(domains.isActive, 1));
  return result.map(r => r.domain);
}

// ==================== EXPOSED QUERIES ====================

export async function createExposed(data: InsertExposed) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(exposed).values(data);
  return result[0].insertId;
}

export async function getExposedList(limit = 50, offset = 0, search?: string, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (statusFilter && statusFilter !== "all") conditions.push(eq(exposed.status, statusFilter as any));
  if (search) {
    conditions.push(
      or(
        like(exposed.nameId, `%${search}%`),
        like(exposed.discord, `%${search}%`),
        like(exposed.description, `%${search}%`)
      )!
    );
  }
  if (conditions.length > 0) {
    return db.select().from(exposed).where(and(...conditions)).orderBy(desc(exposed.createdAt)).limit(limit).offset(offset);
  }
  return db.select().from(exposed).orderBy(desc(exposed.createdAt)).limit(limit).offset(offset);
}

export async function updateExposed(id: number, data: Partial<InsertExposed>) {
  const db = await getDb();
  if (!db) return;
  await db.update(exposed).set(data).where(eq(exposed.id, id));
}

export async function deleteExposed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(exposed).where(eq(exposed.id, id));
}

export async function getExposedCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(exposed);
  return result[0]?.count || 0;
}

// ==================== SETTINGS QUERIES ====================

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSetting(key: string, value: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings);
}
