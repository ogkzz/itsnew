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
  // Extended fields for advanced detection
  timezone?: string;
  screenResolution?: string;
  language?: string;
  platform?: string;
  connectionType?: string;
  batteryLevel?: number;
  batteryCharging?: boolean;
  webrtcIps?: string[];
  canvasHash?: string;
  webglHash?: string;
  audioHash?: string;
  fontsHash?: string;
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
  advancedChecks: AdvancedCheckResult[];
}

export interface DetectionDetail {
  type: string;
  method: string;
  score: number;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface AdvancedCheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  details: string;
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

const SUSPICIOUS_KEYWORDS = ["freefire", "proxy", "vpn", "bypass", "inject", "hack", "cheat", "mod", "crack", "exploit"];
const SUSPICIOUS_EXTENSIONS = [".xyz", ".click", ".top", ".site", ".online", ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".work"];

const DATACENTER_ASN_KEYWORDS = [
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean",
  "linode", "vultr", "ovh", "hetzner", "cloudflare", "oracle",
  "alibaba", "tencent", "hosting", "datacenter", "data center",
  "server", "cloud", "vps", "dedicated", "colocation", "rack"
];

const SUSPICIOUS_HEADERS = [
  "x-forwarded-for", "via", "x-real-ip", "forwarded",
  "x-proxy-id", "proxy-connection", "x-proxy-connection",
  "x-blazer-proxy", "x-proxy-authorization", "x-originating-ip",
  "x-remote-ip", "x-remote-addr", "x-client-ip", "client-ip",
  "true-client-ip", "x-cluster-client-ip"
];

const KNOWN_VPN_PORTS_HEADERS = [
  "x-vpn-client", "x-tunnel", "cf-connecting-ip", "x-nordvpn",
  "x-expressvpn", "x-surfshark"
];

const TOR_EXIT_INDICATORS = [
  "tor", ".onion", "torproject", "exit-node"
];

const BOT_USER_AGENTS = [
  "bot", "spider", "crawler", "scraper", "curl", "wget", "python-requests",
  "httpie", "postman", "insomnia", "axios", "node-fetch", "go-http-client"
];

// Known suspicious timezone offsets for certain regions
const TIMEZONE_COUNTRY_MAP: Record<string, string[]> = {
  "BR": ["America/Sao_Paulo", "America/Fortaleza", "America/Manaus", "America/Belem", "America/Recife"],
  "US": ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
  "DE": ["Europe/Berlin"],
  "JP": ["Asia/Tokyo"],
  "FR": ["Europe/Paris"],
  "GB": ["Europe/London"],
};

// ==================== DETECTION FUNCTIONS ====================

/**
 * 1. Analyze IP for proxy/VPN indicators
 */
export function detectProxyVpn(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  // Check for proxy headers
  for (const header of SUSPICIOUS_HEADERS) {
    const val = input.headers[header] || input.headers[header.toLowerCase()];
    if (val) {
      const points = header === "x-forwarded-for" || header === "via" ? 15 : 10;
      score += points;
      detections.push({
        type: "proxy_vpn",
        method: "header_analysis",
        score: points,
        description: `Proxy header detectado: ${header} = "${String(val).substring(0, 50)}"`,
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
        description: `Header indicador de VPN: ${header}`,
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
      description: `Múltiplos IPs na cadeia de forward: ${ipCount} saltos detectados`,
      severity: "high",
    });
  }

  // Check for private/reserved IP ranges
  if (isPrivateIp(input.ip)) {
    score += 10;
    detections.push({
      type: "proxy_vpn",
      method: "private_ip",
      score: 10,
      description: "Requisição de IP privado/reservado",
      severity: "medium",
    });
  }

  // Check user-agent for VPN/proxy indicators
  const uaLower = (input.userAgent || "").toLowerCase();
  const vpnUaKeywords = ["vpn", "proxy", "tunnel", "tor", "anonymizer", "hide.me", "windscribe", "mullvad"];
  for (const keyword of vpnUaKeywords) {
    if (uaLower.includes(keyword)) {
      score += 15;
      detections.push({
        type: "proxy_vpn",
        method: "user_agent_vpn",
        score: 15,
        description: `Keyword VPN/proxy no user-agent: "${keyword}"`,
        severity: "high",
      });
    }
  }

  // Tor exit node detection
  for (const indicator of TOR_EXIT_INDICATORS) {
    if (uaLower.includes(indicator) || input.ip.includes(indicator)) {
      score += 25;
      detections.push({
        type: "proxy_vpn",
        method: "tor_detection",
        score: 25,
        description: `Indicador de rede Tor detectado: "${indicator}"`,
        severity: "high",
      });
      break;
    }
  }

  // TLS/JA3 fingerprint analysis
  const ja3Indicator = input.headers["x-ja3-fingerprint"] || input.headers["ja3"];
  if (ja3Indicator) {
    score += 10;
    detections.push({
      type: "proxy_vpn",
      method: "ja3_fingerprint",
      score: 10,
      description: "JA3 fingerprint indica cliente TLS não-padrão",
      severity: "medium",
    });
  }

  // ASN-based datacenter detection
  const asnInfo = simulateAsnLookup(input.ip);
  if (asnInfo.isDatacenter) {
    score += 20;
    detections.push({
      type: "proxy_vpn",
      method: "asn_datacenter",
      score: 20,
      description: `IP pertence a datacenter/hosting: ${asnInfo.org} (${asnInfo.asn})`,
      severity: "high",
    });
  }

  // IP reputation check (simulated)
  const ipReputation = checkIpReputation(input.ip);
  if (ipReputation.suspicious) {
    score += ipReputation.score;
    detections.push({
      type: "proxy_vpn",
      method: "ip_reputation",
      score: ipReputation.score,
      description: `IP com reputação suspeita: ${ipReputation.reason}`,
      severity: ipReputation.score >= 20 ? "high" : "medium",
    });
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 2. Detect suspicious domains
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
        description: `Keyword suspeita no domínio: "${keyword}"`,
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
        description: `TLD suspeito: "${ext}"`,
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
        description: `Domínio na blacklist: "${blocked}"`,
        severity: "high",
      });
    }
  }

  // Domain age heuristic (new domains are suspicious)
  if (domainLower.match(/\d{4,}/)) {
    score += 10;
    detections.push({
      type: "domain",
      method: "numeric_pattern",
      score: 10,
      description: "Domínio contém padrão numérico longo (possível gerado automaticamente)",
      severity: "medium",
    });
  }

  // Excessive subdomains
  const subdomainCount = domainLower.split(".").length - 2;
  if (subdomainCount >= 3) {
    score += 10;
    detections.push({
      type: "domain",
      method: "excessive_subdomains",
      score: 10,
      description: `Excesso de subdomínios: ${subdomainCount + 1} níveis`,
      severity: "medium",
    });
  }

  // Homograph/punycode detection
  if (domainLower.startsWith("xn--")) {
    score += 15;
    detections.push({
      type: "domain",
      method: "punycode",
      score: 15,
      description: "Domínio usa Punycode (possível ataque homográfico)",
      severity: "high",
    });
  }

  // Very long domain name
  if (domainLower.length > 50) {
    score += 5;
    detections.push({
      type: "domain",
      method: "long_domain",
      score: 5,
      description: `Domínio excessivamente longo: ${domainLower.length} caracteres`,
      severity: "low",
    });
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 3. Generate and analyze fingerprint
 */
export function analyzeFingerprint(
  input: AnalysisInput,
  previousFingerprints?: { hash: string; ip: string; seenCount: number; ipChanges: number }[]
): { score: number; detections: DetectionDetail[]; fingerprintId: string } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  // Generate composite fingerprint hash
  const fingerprintData = [
    input.ip,
    input.userAgent,
    input.headers["accept-language"] || "",
    input.headers["accept-encoding"] || "",
    input.canvasHash || "",
    input.webglHash || "",
    input.audioHash || "",
    input.fontsHash || "",
    input.screenResolution || "",
    input.platform || "",
  ].join("|");
  const fingerprintId = crypto.createHash("sha256").update(fingerprintData).digest("hex").substring(0, 32);

  // Check for fingerprint changes
  if (previousFingerprints && previousFingerprints.length > 0) {
    const matchingFp = previousFingerprints.find(fp => fp.hash === fingerprintId);
    
    if (matchingFp) {
      if (matchingFp.ip !== input.ip) {
        const points = Math.min(matchingFp.ipChanges * 5, 30);
        score += points;
        detections.push({
          type: "fingerprint",
          method: "ip_rotation",
          score: points,
          description: `Fingerprint visto com ${matchingFp.ipChanges + 1} IPs diferentes`,
          severity: points >= 20 ? "high" : "medium",
        });
      }

      if (matchingFp.seenCount > 50) {
        score += 15;
        detections.push({
          type: "fingerprint",
          method: "high_frequency",
          score: 15,
          description: `Fingerprint visto ${matchingFp.seenCount} vezes (frequência alta)`,
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
      description: `${missingCount} headers padrão de browser ausentes (possível bot)`,
      severity: "medium",
    });
  }

  // Bot user-agent detection
  const uaLower = (input.userAgent || "").toLowerCase();
  for (const bot of BOT_USER_AGENTS) {
    if (uaLower.includes(bot)) {
      score += 15;
      detections.push({
        type: "fingerprint",
        method: "bot_detection",
        score: 15,
        description: `User-agent de bot/automação detectado: "${bot}"`,
        severity: "high",
      });
      break;
    }
  }

  // Canvas fingerprint anomaly
  if (input.canvasHash === "0" || input.canvasHash === "undefined" || input.canvasHash === "null") {
    score += 10;
    detections.push({
      type: "fingerprint",
      method: "canvas_anomaly",
      score: 10,
      description: "Canvas fingerprint bloqueado ou ausente (possível anti-fingerprint)",
      severity: "medium",
    });
  }

  // WebGL fingerprint anomaly
  if (input.webglHash === "0" || input.webglHash === "undefined" || input.webglHash === "null") {
    score += 8;
    detections.push({
      type: "fingerprint",
      method: "webgl_anomaly",
      score: 8,
      description: "WebGL fingerprint bloqueado ou ausente",
      severity: "medium",
    });
  }

  // Screen resolution anomaly
  if (input.screenResolution) {
    const [w, h] = input.screenResolution.split("x").map(Number);
    if (w && h) {
      // Very unusual resolutions
      if (w < 320 || h < 240 || w > 7680 || h > 4320) {
        score += 8;
        detections.push({
          type: "fingerprint",
          method: "screen_anomaly",
          score: 8,
          description: `Resolução de tela anômala: ${input.screenResolution}`,
          severity: "medium",
        });
      }
    }
  }

  return { score: Math.min(score, 100), detections, fingerprintId };
}

/**
 * 4. Detect jailbreak indicators
 */
export function detectJailbreak(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  const ua = (input.userAgent || "").toLowerCase();

  // Check for Cydia/jailbreak indicators in user-agent
  const jailbreakKeywords = [
    "cydia", "substrate", "jailbreak", "jailbroken", "sileo", "checkra1n",
    "unc0ver", "taurine", "odyssey", "chimera", "electra", "pangu",
    "evasi0n", "redsn0w", "absinthe", "limera1n", "palera1n", "dopamine"
  ];
  for (const keyword of jailbreakKeywords) {
    if (ua.includes(keyword)) {
      score += 25;
      detections.push({
        type: "jailbreak",
        method: "user_agent_keyword",
        score: 25,
        description: `Indicador de jailbreak no user-agent: "${keyword}"`,
        severity: "high",
      });
    }
  }

  // Check for abnormal request headers
  const abnormalHeaders = [
    "x-cydia-id", "x-substrate", "x-jailbreak", "x-tweak-inject",
    "x-mobile-substrate", "x-flex-patch", "x-filza"
  ];
  for (const header of abnormalHeaders) {
    if (input.headers[header] || input.headers[header.toLowerCase()]) {
      score += 30;
      detections.push({
        type: "jailbreak",
        method: "abnormal_header",
        score: 30,
        description: `Header específico de jailbreak: ${header}`,
        severity: "high",
      });
    }
  }

  // Check for inconsistent iOS version patterns
  if (ua.includes("iphone") || ua.includes("ipad")) {
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
          description: `Versão iOS ${iosVersion} incompatível com modelo iPhone ${deviceGen}`,
          severity: "medium",
        });
      }
    }

    // Check for rooted Android indicators on iOS device
    if (ua.includes("android") || ua.includes("linux")) {
      score += 20;
      detections.push({
        type: "jailbreak",
        method: "platform_spoof",
        score: 20,
        description: "User-agent iOS contém indicadores de Android/Linux (spoofing)",
        severity: "high",
      });
    }
  }

  // Check for root indicators (Android)
  if (ua.includes("android")) {
    const rootKeywords = ["supersu", "magisk", "xposed", "root", "busybox"];
    for (const keyword of rootKeywords) {
      if (ua.includes(keyword)) {
        score += 20;
        detections.push({
          type: "jailbreak",
          method: "root_indicator",
          score: 20,
          description: `Indicador de root Android: "${keyword}"`,
          severity: "high",
        });
      }
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 5. Detect request manipulation
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
        description: "Verificação de assinatura HMAC falhou",
        severity: "high",
      });
    }
  }

  // Replay detection (timestamp check)
  if (input.timestamp) {
    const now = Date.now();
    const diff = Math.abs(now - input.timestamp);
    if (diff > 5 * 60 * 1000) {
      score += 20;
      detections.push({
        type: "manipulation",
        method: "replay_detection",
        score: 20,
        description: `Timestamp da requisição muito antigo: ${Math.round(diff / 1000)}s de diferença`,
        severity: "high",
      });
    }
  }

  // Nonce reuse detection
  if (input.nonce) {
    // In a real system, check against a nonce store
    if (input.nonce.length < 8) {
      score += 10;
      detections.push({
        type: "manipulation",
        method: "weak_nonce",
        score: 10,
        description: "Nonce fraco (menos de 8 caracteres)",
        severity: "medium",
      });
    }
  }

  // Abnormally large request body
  const contentLength = input.headers["content-length"];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    score += 10;
    detections.push({
      type: "manipulation",
      method: "large_payload",
      score: 10,
      description: "Corpo da requisição anormalmente grande",
      severity: "medium",
    });
  }

  // Header inconsistency
  const connection = input.headers["connection"];
  if (connection && connection.toLowerCase() === "close" && input.headers["keep-alive"]) {
    score += 10;
    detections.push({
      type: "manipulation",
      method: "header_inconsistency",
      score: 10,
      description: "Headers de conexão inconsistentes",
      severity: "low",
    });
  }

  // Content-Type mismatch
  const contentType = input.headers["content-type"];
  if (contentType && input.requestBody) {
    if (contentType.includes("json") && typeof input.requestBody === "string") {
      try {
        JSON.parse(input.requestBody);
      } catch {
        score += 10;
        detections.push({
          type: "manipulation",
          method: "content_type_mismatch",
          score: 10,
          description: "Content-Type JSON mas corpo não é JSON válido",
          severity: "medium",
        });
      }
    }
  }

  // Encoding manipulation
  const acceptEncoding = input.headers["accept-encoding"];
  if (acceptEncoding && acceptEncoding.includes("identity") && !acceptEncoding.includes("gzip")) {
    score += 5;
    detections.push({
      type: "manipulation",
      method: "encoding_anomaly",
      score: 5,
      description: "Accept-Encoding anômalo (sem gzip, apenas identity)",
      severity: "low",
    });
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 6. WebRTC Leak Detection
 */
export function detectWebRTCLeak(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  if (input.webrtcIps && input.webrtcIps.length > 0) {
    // Check if WebRTC IPs differ from request IP
    const hasLeakedIp = input.webrtcIps.some(wip => wip !== input.ip && !isPrivateIp(wip));
    if (hasLeakedIp) {
      score += 25;
      detections.push({
        type: "webrtc_leak",
        method: "ip_mismatch",
        score: 25,
        description: `WebRTC revela IP diferente do IP da requisição`,
        severity: "high",
      });
    }

    // Check for multiple public IPs via WebRTC
    const publicIps = input.webrtcIps.filter(ip => !isPrivateIp(ip));
    if (publicIps.length > 1) {
      score += 15;
      detections.push({
        type: "webrtc_leak",
        method: "multiple_public_ips",
        score: 15,
        description: `WebRTC revela ${publicIps.length} IPs públicos`,
        severity: "medium",
      });
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 7. DNS Leak Detection
 */
export function detectDNSLeak(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  // Check for DNS-related headers
  const dnsHeaders = ["x-dns-prefetch-control", "x-dns-server"];
  for (const header of dnsHeaders) {
    const val = input.headers[header] || input.headers[header.toLowerCase()];
    if (val) {
      score += 10;
      detections.push({
        type: "dns_leak",
        method: "dns_header",
        score: 10,
        description: `Header DNS detectado: ${header}`,
        severity: "medium",
      });
    }
  }

  // Check for DoH (DNS over HTTPS) indicators
  const acceptHeader = input.headers["accept"] || "";
  if (acceptHeader.includes("application/dns-message")) {
    score += 15;
    detections.push({
      type: "dns_leak",
      method: "doh_indicator",
      score: 15,
      description: "Indicador de DNS over HTTPS detectado",
      severity: "medium",
    });
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 8. Timezone Mismatch Detection
 */
export function detectTimezoneMismatch(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  if (input.timezone) {
    const geoInfo = simulateGeoLookup(input.ip);
    const expectedTimezones = TIMEZONE_COUNTRY_MAP[geoInfo.country] || [];
    
    if (expectedTimezones.length > 0 && !expectedTimezones.includes(input.timezone)) {
      score += 20;
      detections.push({
        type: "timezone_mismatch",
        method: "geo_timezone_compare",
        score: 20,
        description: `Timezone "${input.timezone}" não corresponde ao país do IP (${geoInfo.country})`,
        severity: "high",
      });
    }
  }

  // Check Accept-Language vs IP country
  if (input.language) {
    const geoInfo = simulateGeoLookup(input.ip);
    const langCountryMap: Record<string, string[]> = {
      "BR": ["pt", "pt-br", "pt-BR"],
      "US": ["en", "en-us", "en-US"],
      "DE": ["de", "de-de", "de-DE"],
      "JP": ["ja", "ja-jp", "ja-JP"],
      "FR": ["fr", "fr-fr", "fr-FR"],
    };
    const expectedLangs = langCountryMap[geoInfo.country] || [];
    if (expectedLangs.length > 0) {
      const hasMatch = expectedLangs.some(l => input.language!.toLowerCase().includes(l.toLowerCase()));
      if (!hasMatch) {
        score += 15;
        detections.push({
          type: "timezone_mismatch",
          method: "language_mismatch",
          score: 15,
          description: `Idioma "${input.language}" não corresponde ao país do IP (${geoInfo.country})`,
          severity: "medium",
        });
      }
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 9. Battery API Anomaly Detection
 */
export function detectBatteryAnomaly(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  if (input.batteryLevel !== undefined) {
    // Always 100% and charging = likely emulator/VM
    if (input.batteryLevel === 100 && input.batteryCharging === true) {
      score += 15;
      detections.push({
        type: "battery_anomaly",
        method: "emulator_indicator",
        score: 15,
        description: "Bateria sempre 100% e carregando (possível emulador/VM)",
        severity: "medium",
      });
    }

    // Battery level exactly 0 but device still working
    if (input.batteryLevel === 0 && input.batteryCharging === false) {
      score += 10;
      detections.push({
        type: "battery_anomaly",
        method: "impossible_state",
        score: 10,
        description: "Bateria 0% sem carregar mas dispositivo ativo (estado impossível)",
        severity: "medium",
      });
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * 10. Connection Type Analysis
 */
export function detectConnectionAnomaly(input: AnalysisInput): { score: number; detections: DetectionDetail[] } {
  const detections: DetectionDetail[] = [];
  let score = 0;

  if (input.connectionType) {
    const ct = input.connectionType.toLowerCase();
    
    // Ethernet on mobile device
    const ua = (input.userAgent || "").toLowerCase();
    if (ct === "ethernet" && (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android"))) {
      score += 15;
      detections.push({
        type: "connection_anomaly",
        method: "connection_device_mismatch",
        score: 15,
        description: "Conexão Ethernet em dispositivo móvel (possível emulador)",
        severity: "medium",
      });
    }

    // Unknown or unusual connection types
    if (ct === "unknown" || ct === "none") {
      score += 8;
      detections.push({
        type: "connection_anomaly",
        method: "unknown_connection",
        score: 8,
        description: `Tipo de conexão incomum: "${input.connectionType}"`,
        severity: "low",
      });
    }
  }

  return { score: Math.min(score, 100), detections };
}

/**
 * Run full analysis pipeline with all detection methods
 */
export function runFullAnalysis(input: AnalysisInput, customBlacklist: string[] = [], previousFingerprints?: any[]): DetectionResult {
  const proxyVpn = detectProxyVpn(input);
  const domain = detectSuspiciousDomain(input.domain || "", customBlacklist);
  const fingerprint = analyzeFingerprint(input, previousFingerprints);
  const jailbreak = detectJailbreak(input);
  const manipulation = detectManipulation(input);
  
  // Advanced checks
  const webrtcLeak = detectWebRTCLeak(input);
  const dnsLeak = detectDNSLeak(input);
  const timezoneMismatch = detectTimezoneMismatch(input);
  const batteryAnomaly = detectBatteryAnomaly(input);
  const connectionAnomaly = detectConnectionAnomaly(input);

  const allDetections = [
    ...proxyVpn.detections,
    ...domain.detections,
    ...fingerprint.detections,
    ...jailbreak.detections,
    ...manipulation.detections,
    ...webrtcLeak.detections,
    ...dnsLeak.detections,
    ...timezoneMismatch.detections,
    ...batteryAnomaly.detections,
    ...connectionAnomaly.detections,
  ];

  // Build advanced checks summary
  const advancedChecks: AdvancedCheckResult[] = [
    {
      name: "WebRTC Leak",
      status: webrtcLeak.score > 15 ? "fail" : webrtcLeak.score > 0 ? "warn" : "pass",
      details: webrtcLeak.score > 0 ? webrtcLeak.detections.map(d => d.description).join("; ") : "Nenhum vazamento WebRTC detectado",
    },
    {
      name: "DNS Leak",
      status: dnsLeak.score > 10 ? "fail" : dnsLeak.score > 0 ? "warn" : "pass",
      details: dnsLeak.score > 0 ? dnsLeak.detections.map(d => d.description).join("; ") : "Nenhum vazamento DNS detectado",
    },
    {
      name: "Timezone/Language",
      status: timezoneMismatch.score > 15 ? "fail" : timezoneMismatch.score > 0 ? "warn" : "pass",
      details: timezoneMismatch.score > 0 ? timezoneMismatch.detections.map(d => d.description).join("; ") : "Timezone e idioma consistentes",
    },
    {
      name: "Battery API",
      status: batteryAnomaly.score > 10 ? "fail" : batteryAnomaly.score > 0 ? "warn" : "pass",
      details: batteryAnomaly.score > 0 ? batteryAnomaly.detections.map(d => d.description).join("; ") : "Comportamento de bateria normal",
    },
    {
      name: "Connection Type",
      status: connectionAnomaly.score > 10 ? "fail" : connectionAnomaly.score > 0 ? "warn" : "pass",
      details: connectionAnomaly.score > 0 ? connectionAnomaly.detections.map(d => d.description).join("; ") : "Tipo de conexão consistente",
    },
  ];

  // Advanced weighted total score
  const baseWeighted = Math.round(
    proxyVpn.score * 0.22 +
    domain.score * 0.20 +
    fingerprint.score * 0.18 +
    jailbreak.score * 0.15 +
    manipulation.score * 0.10 +
    webrtcLeak.score * 0.05 +
    dnsLeak.score * 0.03 +
    timezoneMismatch.score * 0.04 +
    batteryAnomaly.score * 0.02 +
    connectionAnomaly.score * 0.01
  );
  
  const maxIndividual = Math.max(
    proxyVpn.score, domain.score, fingerprint.score, jailbreak.score, manipulation.score,
    webrtcLeak.score, timezoneMismatch.score
  );
  const totalScore = Math.min(Math.round(Math.max(baseWeighted, maxIndividual * 0.65)), 100);

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
    advancedChecks,
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
  if (parts[0] === 0) return true;
  return false;
}

function checkIpReputation(ip: string): { suspicious: boolean; score: number; reason: string } {
  // Simulated IP reputation check
  const hash = crypto.createHash("md5").update(ip).digest("hex");
  const num = parseInt(hash.substring(0, 4), 16);
  
  // Certain IP ranges are more suspicious
  const parts = ip.split(".").map(Number);
  if (parts[0] >= 185 && parts[0] <= 195) {
    return { suspicious: true, score: 15, reason: "IP em range frequentemente usado por VPNs/proxies" };
  }
  if (num % 7 === 0) {
    return { suspicious: true, score: 10, reason: "IP encontrado em lista de reputação baixa" };
  }
  return { suspicious: false, score: 0, reason: "" };
}

function simulateAsnLookup(ip: string): AsnInfo {
  const hash = crypto.createHash("md5").update(ip).digest("hex");
  const num = parseInt(hash.substring(0, 4), 16);
  const isDatacenter = num % 5 === 0;
  
  const orgs = isDatacenter 
    ? ["Amazon Web Services", "Google Cloud", "DigitalOcean", "Microsoft Azure", "OVH Hosting", "Cloudflare Inc."]
    : ["Vivo S.A.", "Claro S.A.", "TIM S.A.", "AT&T Inc.", "Comcast Cable", "Vodafone GmbH"];
  
  return {
    asn: `AS${10000 + (num % 50000)}`,
    org: orgs[num % orgs.length],
    isDatacenter,
    isHosting: isDatacenter,
  };
}

function simulateGeoLookup(ip: string): GeoInfo {
  const hash = crypto.createHash("md5").update(ip).digest("hex");
  const countries = ["BR", "US", "DE", "JP", "FR", "GB", "CA", "AU"];
  const cities = ["São Paulo", "New York", "Berlin", "Tokyo", "Paris", "London", "Toronto", "Sydney"];
  const timezones = ["America/Sao_Paulo", "America/New_York", "Europe/Berlin", "Asia/Tokyo", "Europe/Paris", "Europe/London", "America/Toronto", "Australia/Sydney"];
  const idx = parseInt(hash.substring(0, 2), 16) % countries.length;
  
  return {
    country: countries[idx],
    region: cities[idx],
    city: cities[idx],
    timezone: timezones[idx],
    lat: -23.55 + (parseInt(hash.substring(2, 4), 16) % 100) * 0.5,
    lon: -46.63 + (parseInt(hash.substring(4, 6), 16) % 100) * 0.5,
  };
}

export function getStatusFromScore(score: number): "safe" | "suspicious" | "confirmed" {
  if (score <= 30) return "safe";
  if (score <= 70) return "suspicious";
  return "confirmed";
}
