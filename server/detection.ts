import crypto from "crypto";

// ==================== TYPES ====================

export interface AnalysisInput {
  ip: string;
  headers: Record<string, string>;
  userAgent: string;
  domain?: string;
  requestBody?: any;
  hmacSignature?: string;
  timestamp?: number;
  nonce?: string;
}

export interface DetectionResult {
  proxyVpnScore: number;
  domainScore: number;
  fingerprintScore: number;
  jailbreakScore: number;
  manipulationScore: number;
  totalScore: number;
  status: "safe" | "suspicious" | "confirmed";
  detections: DetectionDetail[];
  fingerprintId: string;
  asnInfo: AsnInfo | null;
  geoInfo: GeoInfo | null;
}

export interface DetectionDetail {
  type: string;
  method: string;
  score: number;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface AsnInfo {
  asn: string;
  org: string;
  isDatacenter: boolean;
  isHosting: boolean;
}

export interface GeoInfo {
  country: string;
  region: string;
  city: string;
  timezone: string;
  lat?: number;
  lon?: number;
}

// ==================== CONSTANTS ====================

const SUSPICIOUS_KEYWORDS = ["freefire", "proxy", "vpn", "bypass", "inject"];
const SUSPICIOUS_EXTENSIONS = [".xyz", ".click", ".top", ".site", ".online"];

const DATACENTER_ASN_KEYWORDS = [
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean",
  "linode", "vultr", "ovh", "hetzner", "cloudflare", "oracle",
  "alibaba", "tencent", "hosting", "datacenter", "data center",
  "server", "cloud", "vps", "dedicated"
];

const SUSPICIOUS_HEADERS = [
  "x-forwarded-for", "via", "x-real-ip", "forwarded",
  "x-proxy-id", "proxy-connection", "x-proxy-connection",
  "x-blazer-proxy", "x-proxy-authorization"
];

const KNOWN_VPN_PORTS_HEADERS = [
  "x-vpn-client", "x-tunnel", "cf-connecting-ip"
];

// ==================== DETECTION FUNCTIONS ====================

/**
 * Analyze IP for proxy/VPN indicators
 */
export function detectProxyVpn(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  // Check for proxy headers
  for (const header of SUSPICIOUS_HEADERS) {
    if (input.headers[header] || input.headers[header.toLowerCase()]) {
      const points = header === "x-forwarded-for" || header === "via" ? 15 : 10;
      score += points;
      detections.push({
        type: "proxy_vpn",
        method: "header_analysis",
        score: points,
        description: `Proxy header detected: ${header}`,
        severity: points >= 15 ? "high" : "medium",
      });
    }
  }

  // Check for VPN-specific headers
  for (const header of KNOWN_VPN_PORTS_HEADERS) {
    if (input.headers[header] || input.headers[header.toLowerCase()]) {
      score += 20;
      detections.push({
        type: "proxy_vpn",
        method: "vpn_header",
        score: 20,
        description: `VPN indicator header: ${header}`,
        severity: "high",
      });
    }
  }

  // Check for IP inconsistency (multiple IPs in forwarded headers)
  const forwardedFor = input.headers["x-forwarded-for"] || input.headers["X-Forwarded-For"];
  if (forwardedFor && forwardedFor.includes(",")) {
    const ipCount = forwardedFor.split(",").length;
    const points = Math.min(ipCount * 5, 25);
    score += points;
    detections.push({
      type: "proxy_vpn",
      method: "ip_chain",
      score: points,
      description: `Multiple IPs in forwarded chain: ${ipCount} hops detected`,
      severity: "high",
    });
  }

  // Check for private/reserved IP ranges (indicating proxy)
  if (isPrivateIp(input.ip)) {
    score += 10;
    detections.push({
      type: "proxy_vpn",
      method: "private_ip",
      score: 10,
      description: "Request from private/reserved IP range",
      severity: "medium",
    });
  }

  // Check user-agent for VPN/proxy indicators
  const uaLower = (input.userAgent || "").toLowerCase();
  const vpnUaKeywords = ["vpn", "proxy", "tunnel", "tor", "anonymizer"];
  for (const keyword of vpnUaKeywords) {
    if (uaLower.includes(keyword)) {
      score += 15;
      detections.push({
        type: "proxy_vpn",
        method: "user_agent",
        score: 15,
        description: `VPN/proxy keyword in user-agent: ${keyword}`,
        severity: "high",
      });
    }
  }

  // TLS/JA3 fingerprint simulation (check for known proxy fingerprints)
  const ja3Indicator = input.headers["x-ja3-fingerprint"] || input.headers["ja3"];
  if (ja3Indicator) {
    score += 10;
    detections.push({
      type: "proxy_vpn",
      method: "ja3_fingerprint",
      score: 10,
      description: "JA3 fingerprint indicates non-standard TLS client",
      severity: "medium",
    });
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * Detect suspicious domains
 */
export function detectSuspiciousDomain(domain: string, customBlacklist: string[] = []): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  if (!domain) return { score: 0, detections: [] };

  const domainLower = domain.toLowerCase();

  // Check for suspicious keywords
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (domainLower.includes(keyword)) {
      score += 20;
      detections.push({
        type: "domain",
        method: "keyword_match",
        score: 20,
        description: `Suspicious keyword in domain: "${keyword}"`,
        severity: "high",
      });
    }
  }

  // Check for suspicious extensions
  for (const ext of SUSPICIOUS_EXTENSIONS) {
    if (domainLower.endsWith(ext)) {
      score += 15;
      detections.push({
        type: "domain",
        method: "extension_match",
        score: 15,
        description: `Suspicious TLD: "${ext}"`,
        severity: "medium",
      });
    }
  }

  // Check custom blacklist
  for (const blocked of customBlacklist) {
    if (domainLower.includes(blocked.toLowerCase())) {
      score += 25;
      detections.push({
        type: "domain",
        method: "blacklist",
        score: 25,
        description: `Domain matches blacklist entry: "${blocked}"`,
        severity: "high",
      });
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * Generate and analyze fingerprint
 */
export function analyzeFingerprint(
  input: AnalysisInput,
  previousFingerprints?: { hash: string; ip: string; seenCount: number; ipChanges: number }[]
): { score: number; detections: DetectionDetail[]; fingerprintId: string } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  // Generate fingerprint hash
  const fingerprintData = `${input.ip}|${input.userAgent}|${input.headers["accept-language"] || ""}|${input.headers["accept-encoding"] || ""}`;
  const fingerprintId = crypto.createHash("sha256").update(fingerprintData).digest("hex").substring(0, 32);

  // Check for fingerprint changes
  if (previousFingerprints && previousFingerprints.length > 0) {
    const matchingFp = previousFingerprints.find(fp => fp.hash === fingerprintId);
    
    if (matchingFp) {
      // Same fingerprint but different IP
      if (matchingFp.ip !== input.ip) {
        const points = Math.min(matchingFp.ipChanges * 5, 30);
        score += points;
        detections.push({
          type: "fingerprint",
          method: "ip_rotation",
          score: points,
          description: `Fingerprint seen with ${matchingFp.ipChanges + 1} different IPs`,
          severity: points >= 20 ? "high" : "medium",
        });
      }

      // High frequency
      if (matchingFp.seenCount > 50) {
        score += 15;
        detections.push({
          type: "fingerprint",
          method: "high_frequency",
          score: 15,
          description: `Fingerprint seen ${matchingFp.seenCount} times (high frequency)`,
          severity: "medium",
        });
      }
    }
  }

  // Check for missing standard headers (bot/automation indicator)
  const standardHeaders = ["accept", "accept-language", "accept-encoding"];
  let missingCount = 0;
  for (const h of standardHeaders) {
    if (!input.headers[h] && !input.headers[h.toLowerCase()]) {
      missingCount++;
    }
  }
  if (missingCount >= 2) {
    score += 10;
    detections.push({
      type: "fingerprint",
      method: "missing_headers",
      score: 10,
      description: `Missing ${missingCount} standard browser headers`,
      severity: "medium",
    });
  }

  return { score: Math.min(score, 100), detections, fingerprintId };
}

/**
 * Detect jailbreak indicators (indirect)
 */
export function detectJailbreak(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  const ua = (input.userAgent || "").toLowerCase();

  // Check for Cydia/jailbreak indicators in user-agent
  const jailbreakKeywords = ["cydia", "substrate", "jailbreak", "jailbroken", "sileo", "checkra1n", "unc0ver", "taurine"];
  for (const keyword of jailbreakKeywords) {
    if (ua.includes(keyword)) {
      score += 25;
      detections.push({
        type: "jailbreak",
        method: "user_agent_keyword",
        score: 25,
        description: `Jailbreak indicator in user-agent: "${keyword}"`,
        severity: "high",
      });
    }
  }

  // Check for abnormal request patterns
  const abnormalHeaders = ["x-cydia-id", "x-substrate", "x-jailbreak"];
  for (const header of abnormalHeaders) {
    if (input.headers[header] || input.headers[header.toLowerCase()]) {
      score += 30;
      detections.push({
        type: "jailbreak",
        method: "abnormal_header",
        score: 30,
        description: `Jailbreak-specific header detected: ${header}`,
        severity: "high",
      });
    }
  }

  // Check for inconsistent iOS version patterns
  if (ua.includes("iphone") || ua.includes("ipad")) {
    // Check for very old iOS with new device model
    const iosMatch = ua.match(/os (\d+)_/);
    const deviceMatch = ua.match(/iphone(\d+)/);
    if (iosMatch && deviceMatch) {
      const iosVersion = parseInt(iosMatch[1]);
      const deviceGen = parseInt(deviceMatch[1]);
      if (iosVersion < 14 && deviceGen >= 14) {
        score += 15;
        detections.push({
          type: "jailbreak",
          method: "version_mismatch",
          score: 15,
          description: "iOS version inconsistent with device model",
          severity: "medium",
        });
      }
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * Detect request manipulation
 */
export function detectManipulation(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  // HMAC signature verification
  if (input.hmacSignature && input.requestBody) {
    const expectedHmac = crypto
      .createHmac("sha256", "itsnew-secret-key")
      .update(JSON.stringify(input.requestBody))
      .digest("hex");
    
    if (input.hmacSignature !== expectedHmac) {
      score += 30;
      detections.push({
        type: "manipulation",
        method: "hmac_mismatch",
        score: 30,
        description: "HMAC signature verification failed",
        severity: "high",
      });
    }
  }

  // Replay detection (timestamp check)
  if (input.timestamp) {
    const now = Date.now();
    const diff = Math.abs(now - input.timestamp);
    if (diff > 5 * 60 * 1000) { // 5 minutes
      score += 20;
      detections.push({
        type: "manipulation",
        method: "replay_detection",
        score: 20,
        description: `Request timestamp too old: ${Math.round(diff / 1000)}s difference`,
        severity: "high",
      });
    }
  }

  // Heuristic: impossible usage patterns
  const contentLength = input.headers["content-length"];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    score += 10;
    detections.push({
      type: "manipulation",
      method: "heuristic",
      score: 10,
      description: "Abnormally large request body",
      severity: "medium",
    });
  }

  // Check for modified/spoofed headers
  const connection = input.headers["connection"];
  if (connection && connection.toLowerCase() === "close" && input.headers["keep-alive"]) {
    score += 10;
    detections.push({
      type: "manipulation",
      method: "header_inconsistency",
      score: 10,
      description: "Inconsistent connection headers",
      severity: "low",
    });
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * Run full analysis pipeline
 */
export function runFullAnalysis(input: AnalysisInput, customBlacklist: string[] = [], previousFingerprints?: any[]): DetectionResult {
  const proxyVpn = detectProxyVpn(input);
  const domain = detectSuspiciousDomain(input.domain || "", customBlacklist);
  const fingerprint = analyzeFingerprint(input, previousFingerprints);
  const jailbreak = detectJailbreak(input);
  const manipulation = detectManipulation(input);

  const allDetections = [
    ...proxyVpn.detections,
    ...domain.detections,
    ...fingerprint.detections,
    ...jailbreak.detections,
    ...manipulation.detections,
  ];

  // Weighted total score - uses max-based approach so individual high scores are reflected
  const weightedAvg = Math.round(
    proxyVpn.score * 0.25 +
    domain.score * 0.25 +
    fingerprint.score * 0.2 +
    jailbreak.score * 0.15 +
    manipulation.score * 0.15
  );
  // Also consider the max individual score to avoid dilution
  const maxIndividual = Math.max(proxyVpn.score, domain.score, fingerprint.score, jailbreak.score, manipulation.score);
  const totalScore = Math.min(Math.round(Math.max(weightedAvg, maxIndividual * 0.6)), 100);

  let status: "safe" | "suspicious" | "confirmed";
  if (totalScore <= 30) status = "safe";
  else if (totalScore <= 70) status = "suspicious";
  else status = "confirmed";

  return {
    proxyVpnScore: proxyVpn.score,
    domainScore: domain.score,
    fingerprintScore: fingerprint.score,
    jailbreakScore: jailbreak.score,
    manipulationScore: manipulation.score,
    totalScore,
    status,
    detections: allDetections,
    fingerprintId: fingerprint.fingerprintId,
    asnInfo: simulateAsnLookup(input.ip),
    geoInfo: simulateGeoLookup(input.ip),
  };
}

// ==================== HELPERS ====================

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}

function simulateAsnLookup(ip: string): AsnInfo {
  // Simulated ASN lookup - in production, use a real IP intelligence API
  const hash = crypto.createHash("md5").update(ip).digest("hex");
  const num = parseInt(hash.substring(0, 4), 16);
  const isDatacenter = num % 5 === 0;
  
  return {
    asn: `AS${10000 + (num % 50000)}`,
    org: isDatacenter ? "Cloud Hosting Provider" : "ISP Provider",
    isDatacenter,
    isHosting: isDatacenter,
  };
}

function simulateGeoLookup(ip: string): GeoInfo {
  const hash = crypto.createHash("md5").update(ip).digest("hex");
  const countries = ["BR", "US", "DE", "JP", "FR", "GB", "CA", "AU"];
  const cities = ["São Paulo", "New York", "Berlin", "Tokyo", "Paris", "London", "Toronto", "Sydney"];
  const idx = parseInt(hash.substring(0, 2), 16) % countries.length;
  
  return {
    country: countries[idx],
    region: cities[idx],
    city: cities[idx],
    timezone: "UTC",
  };
}

/**
 * Calculate status from score
 */
export function getStatusFromScore(score: number): "safe" | "suspicious" | "confirmed" {
  if (score <= 30) return "safe";
  if (score <= 70) return "suspicious";
  return "confirmed";
}
