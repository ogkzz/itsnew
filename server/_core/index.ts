import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initWebSocket } from "../websocket";
import { runFullAnalysis } from "../detection";
import * as db from "../db";
import { emitNewAnalysis, emitStatsUpdate } from "../websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Initialize WebSocket
  initWebSocket(server);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // Rate limiting map
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 60;
  const RATE_WINDOW = 60 * 1000;

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
      return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
  }

  // REST API endpoints
  app.post("/api/analyze", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
      const { ip, headers: customHeaders, userAgent, domain, requestBody, hmacSignature, timestamp, nonce } = req.body;
      const targetIp = ip || clientIp;
      const targetHeaders = customHeaders || Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, String(v)])
      );
      const targetUa = userAgent || req.headers["user-agent"] || "";

      const blacklist = await db.getBlacklistedDomains();
      const result = runFullAnalysis(
        { ip: targetIp, headers: targetHeaders, userAgent: targetUa, domain, requestBody, hmacSignature, timestamp, nonce },
        blacklist
      );

      const analysisId = await db.createAnalysis({
        sourceIp: targetIp,
        userAgent: targetUa,
        headers: targetHeaders,
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
        username: req.body.username || "api",
      });

      await db.upsertFingerprint({
        fingerprintHash: result.fingerprintId,
        sourceIp: targetIp,
        userAgent: targetUa,
        suspicious: result.totalScore > 30 ? 1 : 0,
      });

      emitNewAnalysis({ id: analysisId, ...result, sourceIp: targetIp, createdAt: new Date() });
      const apiUsername = req.body.username || "api";
      const stats = await db.getAnalysisStats(apiUsername);
      emitStatsUpdate(stats);

      res.json({ id: analysisId, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/status", async (req, res) => {
    try {
      const username = (req.query.username as string) || "api";
      const stats = await db.getAnalysisStats(username);
      res.json({ status: "online", ...stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const username = (req.query.username as string) || "api";
      const logsList = await db.getLogs(username, limit, offset);
      res.json(logsList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
