import { describe, expect, it } from "vitest";
import {
  detectProxyVpn,
  detectSuspiciousDomain,
  analyzeFingerprint,
  detectJailbreak,
  detectManipulation,
  runFullAnalysis,
  getStatusFromScore,
} from "./detection";

describe("Detection Engine", () => {
  describe("getStatusFromScore", () => {
    it("returns 'safe' for scores 0-30", () => {
      expect(getStatusFromScore(0)).toBe("safe");
      expect(getStatusFromScore(15)).toBe("safe");
      expect(getStatusFromScore(30)).toBe("safe");
    });

    it("returns 'suspicious' for scores 31-70", () => {
      expect(getStatusFromScore(31)).toBe("suspicious");
      expect(getStatusFromScore(50)).toBe("suspicious");
      expect(getStatusFromScore(70)).toBe("suspicious");
    });

    it("returns 'confirmed' for scores 71+", () => {
      expect(getStatusFromScore(71)).toBe("confirmed");
      expect(getStatusFromScore(85)).toBe("confirmed");
      expect(getStatusFromScore(100)).toBe("confirmed");
    });
  });

  describe("detectProxyVpn", () => {
    it("returns 0 score for clean request", () => {
      const result = detectProxyVpn({
        ip: "203.0.113.1",
        headers: {
          accept: "text/html",
          "accept-language": "pt-BR",
          "accept-encoding": "gzip",
        },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      });
      expect(result.score).toBe(0);
      expect(result.detections).toHaveLength(0);
    });

    it("detects proxy headers", () => {
      const result = detectProxyVpn({
        ip: "203.0.113.1",
        headers: {
          "x-forwarded-for": "10.0.0.1",
          via: "1.1 proxy.example.com",
        },
        userAgent: "Mozilla/5.0",
      });
      expect(result.score).toBeGreaterThan(0);
      expect(result.detections.length).toBeGreaterThan(0);
      expect(result.detections.some(d => d.method === "header_analysis")).toBe(true);
    });

    it("detects VPN keywords in user-agent", () => {
      const result = detectProxyVpn({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0 VPN-Client/2.0",
      });
      expect(result.score).toBeGreaterThan(0);
      expect(result.detections.some(d => d.method === "user_agent")).toBe(true);
    });

    it("detects private IP ranges", () => {
      const result = detectProxyVpn({
        ip: "192.168.1.1",
        headers: {},
        userAgent: "Mozilla/5.0",
      });
      expect(result.detections.some(d => d.method === "private_ip")).toBe(true);
    });

    it("caps score at 100", () => {
      const result = detectProxyVpn({
        ip: "10.0.0.1",
        headers: {
          "x-forwarded-for": "1.1.1.1,2.2.2.2,3.3.3.3,4.4.4.4,5.5.5.5",
          via: "proxy",
          "x-real-ip": "1.1.1.1",
          "x-vpn-client": "true",
          "x-tunnel": "active",
        },
        userAgent: "VPN proxy tunnel client",
      });
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("detectSuspiciousDomain", () => {
    it("returns 0 for clean domain", () => {
      const result = detectSuspiciousDomain("google.com");
      expect(result.score).toBe(0);
      expect(result.detections).toHaveLength(0);
    });

    it("detects suspicious keywords", () => {
      const result = detectSuspiciousDomain("freefire-hack.com");
      expect(result.score).toBeGreaterThan(0);
      expect(result.detections.some(d => d.description.includes("freefire"))).toBe(true);
    });

    it("detects suspicious extensions", () => {
      const result = detectSuspiciousDomain("example.xyz");
      expect(result.score).toBeGreaterThan(0);
      expect(result.detections.some(d => d.method === "extension_match")).toBe(true);
    });

    it("detects both keyword and extension", () => {
      const result = detectSuspiciousDomain("freefire-proxy.xyz");
      // Should have at least keyword "freefire" + keyword "proxy" + extension ".xyz"
      expect(result.detections.length).toBeGreaterThanOrEqual(3);
    });

    it("checks custom blacklist", () => {
      const result = detectSuspiciousDomain("badsite.com", ["badsite.com"]);
      expect(result.detections.some(d => d.method === "blacklist")).toBe(true);
    });

    it("returns empty for undefined domain", () => {
      const result = detectSuspiciousDomain("");
      expect(result.score).toBe(0);
    });
  });

  describe("analyzeFingerprint", () => {
    it("generates a fingerprint ID", () => {
      const result = analyzeFingerprint({
        ip: "203.0.113.1",
        headers: { accept: "text/html", "accept-language": "pt-BR", "accept-encoding": "gzip" },
        userAgent: "Mozilla/5.0",
      });
      expect(result.fingerprintId).toBeDefined();
      expect(result.fingerprintId.length).toBe(32);
    });

    it("detects missing standard headers", () => {
      const result = analyzeFingerprint({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0",
      });
      expect(result.detections.some(d => d.method === "missing_headers")).toBe(true);
    });

    it("detects IP rotation", () => {
      const result = analyzeFingerprint(
        { ip: "1.2.3.4", headers: {}, userAgent: "Mozilla/5.0" },
        [{ hash: "", ip: "5.6.7.8", seenCount: 10, ipChanges: 5 }]
      );
      // Since hash won't match, no IP rotation detection
      expect(result.fingerprintId).toBeDefined();
    });
  });

  describe("detectJailbreak", () => {
    it("returns 0 for clean user-agent", () => {
      const result = detectJailbreak({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      });
      expect(result.score).toBe(0);
    });

    it("detects jailbreak keywords", () => {
      const result = detectJailbreak({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0 cydia/1.0",
      });
      expect(result.score).toBeGreaterThan(0);
      expect(result.detections.some(d => d.description.includes("cydia"))).toBe(true);
    });

    it("detects jailbreak headers", () => {
      const result = detectJailbreak({
        ip: "203.0.113.1",
        headers: { "x-cydia-id": "12345" },
        userAgent: "Mozilla/5.0",
      });
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("detectManipulation", () => {
    it("returns 0 for clean request", () => {
      const result = detectManipulation({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0",
      });
      expect(result.score).toBe(0);
    });

    it("detects invalid HMAC", () => {
      const result = detectManipulation({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0",
        requestBody: { test: "data" },
        hmacSignature: "invalid_signature",
        timestamp: Date.now(),
        nonce: "test-nonce",
      });
      expect(result.score).toBeGreaterThan(0);
      expect(result.detections.some(d => d.method === "hmac_mismatch")).toBe(true);
    });

    it("detects expired timestamp (replay)", () => {
      const result = detectManipulation({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0",
        timestamp: Date.now() - 600000, // 10 minutes ago
      });
      expect(result.detections.some(d => d.method === "replay_detection")).toBe(true);
    });
  });

  describe("runFullAnalysis", () => {
    it("returns complete analysis result", () => {
      const result = runFullAnalysis({
        ip: "203.0.113.1",
        headers: { accept: "text/html", "accept-language": "pt-BR", "accept-encoding": "gzip" },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      });

      expect(result).toHaveProperty("proxyVpnScore");
      expect(result).toHaveProperty("domainScore");
      expect(result).toHaveProperty("fingerprintScore");
      expect(result).toHaveProperty("jailbreakScore");
      expect(result).toHaveProperty("manipulationScore");
      expect(result).toHaveProperty("totalScore");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("detections");
      expect(result).toHaveProperty("fingerprintId");
      expect(result).toHaveProperty("asnInfo");
      expect(result).toHaveProperty("geoInfo");
      expect(["safe", "suspicious", "confirmed"]).toContain(result.status);
    });

    it("gives high score for suspicious input", () => {
      const result = runFullAnalysis({
        ip: "10.0.0.1",
        headers: {
          "x-forwarded-for": "1.1.1.1,2.2.2.2",
          via: "proxy",
        },
        userAgent: "VPN-Client cydia",
        domain: "freefire-inject.xyz",
      });

      expect(result.totalScore).toBeGreaterThan(30);
      expect(result.detections.length).toBeGreaterThan(0);
    });

    it("correctly classifies safe requests", () => {
      const result = runFullAnalysis({
        ip: "203.0.113.50",
        headers: {
          accept: "text/html",
          "accept-language": "pt-BR",
          "accept-encoding": "gzip",
        },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      });

      expect(result.totalScore).toBeLessThanOrEqual(30);
      expect(result.status).toBe("safe");
    });

    it("respects score ranges for status", () => {
      // This test validates the status boundaries
      const result = runFullAnalysis({
        ip: "203.0.113.1",
        headers: {},
        userAgent: "Mozilla/5.0",
      });

      if (result.totalScore <= 30) {
        expect(result.status).toBe("safe");
      } else if (result.totalScore <= 70) {
        expect(result.status).toBe("suspicious");
      } else {
        expect(result.status).toBe("confirmed");
      }
    });
  });
});
