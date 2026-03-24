import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import * as db from "./db";
import { runFullAnalysis, getStatusFromScore } from "./detection";
import { emitNewAnalysis, emitStatsUpdate, emitNewLog } from "./websocket";

// Fixed credentials for login
const FIXED_USER = "free";
const FIXED_PASS_HASH = bcryptjs.hashSync("1", 10);

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Custom login with fixed credentials
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.username !== FIXED_USER) {
          return { success: false, error: "Credenciais inválidas" };
        }
        const valid = bcryptjs.compareSync(input.password, FIXED_PASS_HASH);
        if (!valid) {
          return { success: false, error: "Credenciais inválidas" };
        }
        // Log the access
        await db.createLog({
          type: "access",
          level: "info",
          message: `Login successful for user: ${input.username}`,
        });
        return { success: true, token: "authenticated" };
      }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: publicProcedure.query(async () => {
      const stats = await db.getAnalysisStats();
      const totalAnalyses = await db.getAnalysisCount();
      const totalLogs = await db.getLogCount();
      const exposedCount = await db.getExposedCount();
      const detectionTypes = await db.getDetectionTypeStats();
      return { ...stats, totalAnalyses, totalLogs, exposedCount, detectionTypes };
    }),
    recentAnalyses: publicProcedure.query(async () => {
      return db.getRecentAnalyses(10);
    }),
  }),

  // ==================== ANALYSES ====================
  analysis: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { limit = 50, offset = 0, status } = input || {};
        return db.getAnalyses(limit, offset, status);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAnalysisById(input.id);
      }),

    run: publicProcedure
      .input(z.object({
        ip: z.string(),
        headers: z.record(z.string(), z.string()).optional(),
        userAgent: z.string().optional(),
        domain: z.string().optional(),
        requestBody: z.any().optional(),
        hmacSignature: z.string().optional(),
        timestamp: z.number().optional(),
        nonce: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const blacklist = await db.getBlacklistedDomains();
        const existingFingerprints = await db.getFingerprints(100);

        const analysisInput = {
            ip: input.ip,
            headers: (input.headers || {}) as Record<string, string>,
            userAgent: input.userAgent || "",
            domain: input.domain,
            requestBody: input.requestBody,
            hmacSignature: input.hmacSignature,
            timestamp: input.timestamp,
            nonce: input.nonce,
          };
        const result = runFullAnalysis(
          analysisInput,
          blacklist,
          existingFingerprints.map(fp => ({
            hash: fp.fingerprintHash,
            ip: fp.sourceIp,
            seenCount: fp.seenCount,
            ipChanges: fp.ipChanges,
          }))
        );

        // Save analysis
        const analysisId = await db.createAnalysis({
          sourceIp: input.ip,
          userAgent: input.userAgent || null,
          headers: input.headers || null,
          proxyVpnScore: result.proxyVpnScore,
          domainScore: result.domainScore,
          fingerprintScore: result.fingerprintScore,
          jailbreakScore: result.jailbreakScore,
          manipulationScore: result.manipulationScore,
          totalScore: result.totalScore,
          status: result.status,
          detections: result.detections,
          asnInfo: result.asnInfo,
          geoInfo: result.geoInfo,
          fingerprintId: result.fingerprintId,
          step: "completed",
        });

        // Update fingerprint
        await db.upsertFingerprint({
          fingerprintHash: result.fingerprintId,
          sourceIp: input.ip,
          userAgent: input.userAgent || null,
          headers: input.headers || null,
          suspicious: result.totalScore > 30 ? 1 : 0,
        });

        // Log the analysis
        await db.createLog({
          type: "analysis",
          level: result.status === "confirmed" ? "error" : result.status === "suspicious" ? "warn" : "info",
          message: `Analysis completed: IP ${input.ip} - Score: ${result.totalScore} (${result.status})`,
          sourceIp: input.ip,
          details: { analysisId, totalScore: result.totalScore, status: result.status },
        });

        // Emit WebSocket events
        const analysisData = { id: analysisId, ...result, sourceIp: input.ip, createdAt: new Date() };
        emitNewAnalysis(analysisData);

        const stats = await db.getAnalysisStats();
        emitStatsUpdate(stats);

        return { id: analysisId, ...result };
      }),

    stats: publicProcedure.query(async () => {
      return db.getAnalysisStats();
    }),
  }),

  // ==================== LOGS ====================
  logs: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        type: z.string().optional(),
        level: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { limit = 50, offset = 0, type, level } = input || {};
        return db.getLogs(limit, offset, type, level);
      }),
  }),

  // ==================== EXPOSED ====================
  exposed: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { limit = 50, offset = 0, search, status } = input || {};
        return db.getExposedList(limit, offset, search, status);
      }),

    create: publicProcedure
      .input(z.object({
        nameId: z.string().min(1),
        discord: z.string().optional(),
        photo: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["active", "banned", "under_review", "cleared"]).default("active"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createExposed(input);
        await db.createLog({
          type: "system",
          level: "info",
          message: `Exposed entry created: ${input.nameId}`,
          details: { exposedId: id },
        });
        return { id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        nameId: z.string().optional(),
        discord: z.string().optional(),
        photo: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["active", "banned", "under_review", "cleared"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateExposed(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteExposed(input.id);
        return { success: true };
      }),
  }),

  // ==================== DOMAINS / BLACKLIST ====================
  domains: router({
    list: publicProcedure.query(async () => {
      return db.getDomains();
    }),

    add: publicProcedure
      .input(z.object({
        domain: z.string().min(1),
        reason: z.string().optional(),
        type: z.enum(["keyword", "extension", "manual"]).default("manual"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addDomain(input);
        return { id };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDomain(input.id);
        return { success: true };
      }),
  }),

  // ==================== SETTINGS ====================
  settings: router({
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return db.getSetting(input.key);
      }),

    set: publicProcedure
      .input(z.object({ key: z.string(), value: z.any() }))
      .mutation(async ({ input }) => {
        await db.setSetting(input.key, input.value);
        return { success: true };
      }),

    getAll: publicProcedure.query(async () => {
      return db.getAllSettings();
    }),
  }),

  // ==================== FINGERPRINTS ====================
  fingerprints: router({
    list: publicProcedure.query(async () => {
      return db.getFingerprints(50);
    }),
  }),
});

export type AppRouter = typeof appRouter;
