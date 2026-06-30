import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getUserByToken, isAdmin, isSocioVipFounder, type User } from "./app-data";

export type ApiRequestPriority = "essential" | "standard";

type EndpointUsage = {
  calls: number;
  cacheHits: number;
  blocked: number;
  lastCalledAt?: string;
};

type AnalysisLimitRecord = { utcDate: string; count: number };

type StoredUsage = {
  utcDate: string;
  callsSent: number;
  cacheHits: number;
  blockedRequests: number;
  headerRemaining?: number;
  headerDailyLimit?: number;
  lastCalledAt?: string;
  lastResetAt?: string;
  lastResetReason?: string;
  endpoints: Record<string, EndpointUsage>;
  userAnalysis: Record<string, AnalysisLimitRecord>;
};

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
const usageFile = path.join(dataDir, "api-football-usage.json");
const minuteRequestTimes: number[] = [];

function integerEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function utcDate() {
  // A quota operacional do painel é controlada por dia no Brasil.
  // Mantemos o nome utcDate por compatibilidade com o JSON já salvo.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nextResetAtBrazilIso() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  // Meia-noite de amanhã em São Paulo equivale a 03:00 UTC quando BRT está em -03.
  return new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)).toISOString();
}

function config() {
  const dailyLimit = integerEnv("API_FOOTBALL_DAILY_LIMIT", 150000);
  const reserve = Math.min(integerEnv("API_FOOTBALL_ESSENTIAL_RESERVE", 30000), dailyLimit - 1);
  const safetyLimit = Math.min(integerEnv("API_FOOTBALL_SAFETY_LIMIT", dailyLimit - reserve), dailyLimit - reserve);
  return {
    dailyLimit,
    safetyLimit,
    reserve,
    perMinuteLimit: integerEnv("API_FOOTBALL_PER_MINUTE_LIMIT", 850),
  };
}

function freshUsage(): StoredUsage {
  return {
    utcDate: utcDate(),
    callsSent: 0,
    cacheHits: 0,
    blockedRequests: 0,
    lastResetAt: new Date().toISOString(),
    lastResetReason: "fresh-day",
    endpoints: {},
    userAnalysis: {},
  };
}

function loadUsage(): StoredUsage {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(usageFile)) return freshUsage();
    const data = JSON.parse(fs.readFileSync(usageFile, "utf8")) as Partial<StoredUsage>;
    if (data.utcDate !== utcDate()) return freshUsage();
    return {
      ...freshUsage(),
      ...data,
      endpoints: data.endpoints || {},
      userAnalysis: data.userAnalysis || {},
    };
  } catch {
    return freshUsage();
  }
}

let usage = loadUsage();
scheduleAutomaticApiReset();
setInterval(ensureToday, 60_000).unref?.();

function resetApiUsage(reason = "daily-auto-reset") {
  usage = freshUsage();
  usage.lastCalledAt = undefined;
  usage.headerRemaining = undefined;
  usage.headerDailyLimit = undefined;
  usage.lastResetAt = new Date().toISOString();
  usage.lastResetReason = reason;
  minuteRequestTimes.length = 0;
  saveUsage();
  console.info(`[API-Football] contador resetado: ${reason}`);
}

function ensureToday() {
  const today = utcDate();
  if (usage.utcDate !== today) {
    resetApiUsage("new-day");
  }
}

function minutesSince(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / 60000;
}

function shouldProbeAfterBlockedLimit(priority: ApiRequestPriority) {
  // Se a API foi renovada no mesmo dia, não podemos ficar travados para sempre.
  // Permite uma chamada essencial de teste após um intervalo curto.
  if (priority !== "essential") return false;
  const cooldownMinutes = integerEnv("API_FOOTBALL_AUTO_UNBLOCK_PROBE_MINUTES", 15);
  return minutesSince(usage.lastCalledAt) >= cooldownMinutes;
}


function msUntilNextBrazilReset() {
  const resetAt = new Date(nextResetAtBrazilIso()).getTime();
  return Math.max(60_000, resetAt - Date.now());
}

function scheduleAutomaticApiReset() {
  const delay = msUntilNextBrazilReset();
  setTimeout(() => {
    resetApiUsage("scheduled-midnight-brazil");
    scheduleAutomaticApiReset();
  }, delay).unref?.();
}

function saveUsage() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(usageFile, JSON.stringify(usage, null, 2));
  } catch (error) {
    console.warn("Falha ao guardar consumo da API-Football:", error);
  }
}

function endpointRecord(endpoint: string) {
  usage.endpoints[endpoint] ||= { calls: 0, cacheHits: 0, blocked: 0 };
  return usage.endpoints[endpoint];
}

function pruneMinuteRequests() {
  const cutoff = Date.now() - 60000;
  while (minuteRequestTimes.length && minuteRequestTimes[0] < cutoff) minuteRequestTimes.shift();
}

export class ApiUsageLimitError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, code = "API_BUDGET_BLOCKED", statusCode = 429) {
    super(message);
    this.name = "ApiUsageLimitError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function guardRequest(priority: ApiRequestPriority, endpoint: string) {
  ensureToday();
  const limits = config();
  const totalUsed = Math.max(usage.callsSent, limits.dailyLimit - (usage.headerRemaining ?? limits.dailyLimit));

  if (totalUsed >= limits.dailyLimit) {
    if (!shouldProbeAfterBlockedLimit(priority)) {
      endpointRecord(endpoint).blocked += 1;
      usage.blockedRequests += 1;
      saveUsage();
      throw new ApiUsageLimitError("Limite diário da API atingido. Novas atualizações estarão disponíveis após a renovação da quota.", "DAILY_LIMIT_REACHED");
    }

    // Libera apenas uma chamada essencial para testar se a API já renovou.
    // Se a resposta vier normal, o contador é corrigido automaticamente.
    console.info("[API-Football] limite antigo detectado; liberando chamada essencial de teste para auto-desbloqueio.");
  }

  if (priority !== "essential" && totalUsed >= limits.safetyLimit) {
    endpointRecord(endpoint).blocked += 1;
    usage.blockedRequests += 1;
    saveUsage();
    throw new ApiUsageLimitError("Reserva de segurança ativada. Consultas analíticas temporariamente pausadas para preservar jogos ao vivo.", "ESSENTIAL_RESERVE_ACTIVE");
  }

  pruneMinuteRequests();
  if (minuteRequestTimes.length >= limits.perMinuteLimit) {
    endpointRecord(endpoint).blocked += 1;
    usage.blockedRequests += 1;
    saveUsage();
    throw new ApiUsageLimitError("Muitas consultas em pouco tempo. Aguarde alguns segundos e tente novamente.", "MINUTE_RATE_GUARD");
  }
}

export async function controlledApiFootballFetch(
  url: string | URL,
  init: RequestInit,
  endpoint: string,
  priority: ApiRequestPriority = "standard",
) {
  guardRequest(priority, endpoint);
  ensureToday();

  minuteRequestTimes.push(Date.now());
  usage.callsSent += 1;
  usage.lastCalledAt = new Date().toISOString();
  const record = endpointRecord(endpoint);
  record.calls += 1;
  record.lastCalledAt = usage.lastCalledAt;
  saveUsage();

  const response = await fetch(url, init);

  const remaining = Number(
    response.headers.get("x-ratelimit-requests-remaining") ||
      response.headers.get("x-ratelimit-remaining") ||
      response.headers.get("x-rate-limit-remaining"),
  );
  const dailyLimit = Number(
    response.headers.get("x-ratelimit-requests-limit") ||
      response.headers.get("x-ratelimit-limit") ||
      response.headers.get("x-rate-limit-limit"),
  );
  if (Number.isFinite(remaining) && remaining >= 0) usage.headerRemaining = remaining;
  if (Number.isFinite(dailyLimit) && dailyLimit > 0) usage.headerDailyLimit = dailyLimit;

  if (response.ok) {
    // Se a API voltou a responder, remove bloqueios antigos e corrige contador preso.
    if (usage.blockedRequests > 0) usage.blockedRequests = 0;
    if (Number.isFinite(remaining) && remaining > 0 && usage.callsSent > (dailyLimit || config().dailyLimit)) {
      usage.callsSent = Math.max(0, (dailyLimit || config().dailyLimit) - remaining);
    }
  } else if (response.status === 429) {
    usage.headerRemaining = 0;
  }

  saveUsage();
  return response;
}

export function recordApiCacheHit(endpoint: string) {
  ensureToday();
  usage.cacheHits += 1;
  endpointRecord(endpoint).cacheHits += 1;
  saveUsage();
}

export function apiUsageSnapshot() {
  ensureToday();
  const limits = config();
  const callsFromHeader = usage.headerRemaining == null ? 0 : Math.max(0, limits.dailyLimit - usage.headerRemaining);
  const used = Math.max(usage.callsSent, callsFromHeader);
  const remaining = Math.max(0, limits.dailyLimit - used);
  const remainingForStandard = Math.max(0, limits.safetyLimit - used);
  const percentUsed = Number(((used / limits.dailyLimit) * 100).toFixed(2));
  const warningLevel = percentUsed >= 95 ? "critical" : percentUsed >= 85 ? "danger" : percentUsed >= 70 ? "warning" : "safe";
  const topEndpoints = Object.entries(usage.endpoints)
    .map(([endpoint, values]) => ({ endpoint, ...values }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 12);

  return {
    utcDate: usage.utcDate,
    resetAtUtc: nextResetAtBrazilIso(),
    resetAtBrazil: new Date(nextResetAtBrazilIso()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    lastResetAt: usage.lastResetAt,
    lastResetReason: usage.lastResetReason,
    autoResetEnabled: true,
    dailyLimit: limits.dailyLimit,
    safetyLimit: limits.safetyLimit,
    essentialReserve: limits.reserve,
    perMinuteLimit: limits.perMinuteLimit,
    used,
    remaining,
    remainingForStandard,
    percentUsed,
    warningLevel,
    nonEssentialPaused: used >= limits.safetyLimit,
    callsSentByServer: usage.callsSent,
    cacheHits: usage.cacheHits,
    blockedRequests: usage.blockedRequests,
    lastCalledAt: usage.lastCalledAt,
    providerHeaderRemaining: usage.headerRemaining,
    topEndpoints,
  };
}

function bearerToken(req: Request) {
  const auth = String(req.headers.authorization || "");
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function requireAdmin(req: Request, res: Response) {
  const user = getUserByToken(bearerToken(req));
  if (!isAdmin(user)) {
    res.status(403).json({ ok: false, error: "Acesso permitido apenas ao administrador." });
    return false;
  }
  return true;
}

function accessRule(user?: User | null) {
  if (isAdmin(user)) return { accessLabel: "ADMIN", maxDaily: null as number | null };
  const plan = user?.plan || "FREE";
  const socioVip = isSocioVipFounder(user);
  return {
    accessLabel: socioVip ? "SÓCIO VIP FUNDADOR" : plan,
    maxDaily: socioVip ? integerEnv("API_ANALYSIS_LIMIT_SOCIO_VIP", 500)
      : plan === "VIP" ? integerEnv("API_ANALYSIS_LIMIT_VIP", 200)
        : plan === "PRO" ? integerEnv("API_ANALYSIS_LIMIT_PRO", 80)
          : integerEnv("API_ANALYSIS_LIMIT_FREE", 10),
  };
}

function userUsageIdentity(req: Request, user?: User | null) {
  return user?.id || String(req.headers["x-forwarded-for"] || req.ip || "anonymous").split(",")[0].trim();
}

export function consumeUserAnalysisRequest(req: Request) {
  ensureToday();
  const user = getUserByToken(bearerToken(req));
  if (isAdmin(user)) return;

  const identity = userUsageIdentity(req, user);
  const rule = accessRule(user);
  const current = usage.userAnalysis[identity];
  const today = utcDate();
  const next = !current || current.utcDate !== today ? { utcDate: today, count: 0 } : current;

  if (rule.maxDaily !== null && next.count >= rule.maxDaily) {
    throw new ApiUsageLimitError(`Limite diário de análises do plano ${rule.accessLabel} atingido (${rule.maxDaily}).`, "USER_ANALYSIS_LIMIT");
  }
  next.count += 1;
  usage.userAnalysis[identity] = next;
  saveUsage();
}

function memberUsageSnapshot(req: Request, user: User) {
  ensureToday();
  const identity = userUsageIdentity(req, user);
  const rule = accessRule(user);
  const record = usage.userAnalysis[identity];
  const used = record?.utcDate === utcDate() ? record.count : 0;
  const remaining = rule.maxDaily === null ? null : Math.max(0, rule.maxDaily - used);
  return {
    accessLabel: rule.accessLabel,
    used,
    limit: rule.maxDaily,
    remaining,
    percentUsed: rule.maxDaily === null ? 0 : Number(((used / Math.max(1, rule.maxDaily)) * 100).toFixed(2)),
    utcDate: utcDate(),
    resetAtUtc: nextResetAtBrazilIso(),
  };
}

export function registerApiUsageControl(app: Express) {
  app.get("/api/account/analysis-usage", (req: Request, res: Response) => {
    const user = getUserByToken(bearerToken(req));
    if (!user) {
      res.status(401).json({ ok: false, error: "Faça login para continuar." });
      return;
    }
    res.json({ ok: true, usage: memberUsageSnapshot(req, user) });
  });

  app.get("/api/admin/api-usage", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json({ ok: true, usage: apiUsageSnapshot() });
  });

  app.post("/api/admin/api-usage/reset", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    resetApiUsage("admin-manual-reset");
    res.json({ ok: true, usage: apiUsageSnapshot() });
  });
}
