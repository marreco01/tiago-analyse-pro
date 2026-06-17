import sharp from "sharp";

export type BrasileiraoLogoItem = {
  team: string;
  key: string;
  url: string;
  source: string;
  updatedAt: string;
  contentType?: string;
  sizeBytes?: number;
};

export type BrasileiraoLogoRobotStatus = {
  id: string;
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalHours: number;
  sources: string[];
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  totalItems: number;
  lastExecutionMs?: number;
};

export type BrasileiraoLogoRobotLogEntry = {
  id: string;
  createdAt: string;
  robot: string;
  level: "info" | "success" | "error";
  message: string;
};

type LogoImageCache = { contentType: string; body: Buffer; expiresAt: number };

const ROBOT_ID = "brasileirao-logos";
const ROBOT_NAME = "Robô Escudos Brasileirão";
const UPDATE_EVERY_MS = 12 * 60 * 60 * 1000;

let intervalStarted = false;
let updating: Promise<BrasileiraoLogoItem[]> | null = null;

const logs: BrasileiraoLogoRobotLogEntry[] = [];
const logoMap = new Map<string, BrasileiraoLogoItem>();
const imageCache = new Map<string, LogoImageCache>();

let status: BrasileiraoLogoRobotStatus = {
  id: ROBOT_ID,
  name: ROBOT_NAME,
  status: "online",
  visibleToPublic: false,
  intervalHours: 12,
  sources: ["ESPN público Série A/Série B", "API-Sports CDN pública", "Normalizador Sharp 160x160", "Cache local em memória", "Fallback SVG limpo"],
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  totalItems: 0,
  lastExecutionMs: 0,
};

export const BRASILEIRAO_LOGO_SOURCES: Record<string, string> = {
  flamengo: "https://media.api-sports.io/football/teams/127.png",
  palmeiras: "https://media.api-sports.io/football/teams/121.png",
  botafogo: "https://media.api-sports.io/football/teams/120.png",
  cruzeiro: "https://media.api-sports.io/football/teams/135.png",
  bahia: "https://media.api-sports.io/football/teams/118.png",
  saopaulo: "https://media.api-sports.io/football/teams/126.png",
  corinthians: "https://media.api-sports.io/football/teams/131.png",
  fluminense: "https://media.api-sports.io/football/teams/124.png",
  gremio: "https://media.api-sports.io/football/teams/130.png",
  internacional: "https://media.api-sports.io/football/teams/119.png",
  atleticomg: "https://media.api-sports.io/football/teams/1062.png",
  atleticomineiro: "https://media.api-sports.io/football/teams/1062.png",
  atletico: "https://media.api-sports.io/football/teams/1062.png",
  athleticopr: "https://media.api-sports.io/football/teams/134.png",
  atleticoparanaense: "https://media.api-sports.io/football/teams/134.png",
  athleticoparanaense: "https://media.api-sports.io/football/teams/134.png",
  bragantino: "https://media.api-sports.io/football/teams/794.png",
  redbullbragantino: "https://media.api-sports.io/football/teams/794.png",
  vasco: "https://media.api-sports.io/football/teams/133.png",
  vascodagama: "https://media.api-sports.io/football/teams/133.png",
  santos: "https://media.api-sports.io/football/teams/128.png",
  fortaleza: "https://media.api-sports.io/football/teams/154.png",
  ceara: "https://media.api-sports.io/football/teams/129.png",
  vitoria: "https://media.api-sports.io/football/teams/147.png",
  sport: "https://media.api-sports.io/football/teams/123.png",
  juventude: "https://media.api-sports.io/football/teams/152.png",
  coritiba: "https://media.api-sports.io/football/teams/144.png",
  chapecoense: "https://media.api-sports.io/football/teams/132.png",
  remo: "https://media.api-sports.io/football/teams/146.png",
  mirassol: "https://media.api-sports.io/football/teams/794.png",
  goias: "https://media.api-sports.io/football/teams/151.png",
  guarani: "https://media.api-sports.io/football/teams/138.png",
  cuiaba: "https://media.api-sports.io/football/teams/1193.png",
};

const BRASILEIRAO_CLUB_NAMES = [
  "Flamengo", "Palmeiras", "Botafogo", "Cruzeiro", "Bahia", "São Paulo", "Corinthians", "Fluminense", "Grêmio", "Internacional",
  "Atlético-MG", "Athletico-PR", "Red Bull Bragantino", "Vasco", "Santos", "Fortaleza", "Ceará", "Vitória", "Sport", "Juventude",
  "Coritiba", "Chapecoense", "Remo", "Mirassol", "Goiás", "Guarani", "Cuiabá",
];

function normalizeLogoKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function aliasKey(value: string) {
  const key = normalizeLogoKey(value);
  const aliases: Record<string, string> = {
    atletico: "atleticomg",
    atleticoac: "atleticomg",
    atleticomineiro: "atleticomg",
    athleticoparanaense: "athleticopr",
    atleticoparanaense: "athleticopr",
    cap: "athleticopr",
    rbbragantino: "redbullbragantino",
    bragantino: "redbullbragantino",
    vascodagama: "vasco",
    clubederegatasvascodagama: "vasco",
    sao: "saopaulo",
    saopaulofc: "saopaulo",
    saopaulofutebolclube: "saopaulo",
    redbullbragantinosp: "redbullbragantino",
    atletico: "atleticomg",
    atletico_mg: "atleticomg",
    atleticoMG: "atleticomg",
    atleticoMineiro: "atleticomg",
    clubedoremo: "remo",
    remoPA: "remo",
    remopa: "remo",
    mirassolfc: "mirassol",
    mirassolfutebolclube: "mirassol",
    vitoriasc: "vitoria",
    vitoriasportclub: "vitoria",
    chapecoenseaf: "chapecoense",
    associacaochapecoensedefutebol: "chapecoense",
    coritibafc: "coritiba",
    coritibafbc: "coritiba",
    cuiabaec: "cuiaba",
    cuiabaesporteclube: "cuiaba",
    goiasec: "goias",
    goiasesporteclube: "goias",
    guaranifc: "guarani",
    guaranifutebolclube: "guarani",
    sportrecife: "sport",
    sportclubdorecife: "sport",
    cearasc: "ceara",
    cearasportingclub: "ceara",
  };
  return aliases[key] || key;
}

function addLog(level: BrasileiraoLogoRobotLogEntry["level"], message: string) {
  logs.unshift({ id: `${ROBOT_ID}-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), robot: ROBOT_NAME, level, message });
  if (logs.length > 80) logs.pop();
}

function registerLogo(team: string, url: string, source: string) {
  const key = aliasKey(team);
  if (!url || !key) return;
  const item: BrasileiraoLogoItem = { team, key, url, source, updatedAt: new Date().toISOString() };
  logoMap.set(key, item);
  logoMap.set(normalizeLogoKey(team), item);
}

function seedStaticLogos() {
  for (const name of BRASILEIRAO_CLUB_NAMES) {
    const key = aliasKey(name);
    const url = BRASILEIRAO_LOGO_SOURCES[key] || BRASILEIRAO_LOGO_SOURCES[normalizeLogoKey(name)];
    if (url) registerLogo(name, url, "api-sports-cdn");
  }
  for (const [key, url] of Object.entries(BRASILEIRAO_LOGO_SOURCES)) {
    registerLogo(key, url, "api-sports-cdn");
  }
  status.totalItems = logoMap.size;
}

seedStaticLogos();

function bestLogo(logos: any[]) {
  if (!Array.isArray(logos) || !logos.length) return "";
  return logos.find((logo) => String(logo?.rel || "").includes("full"))?.href || logos.find((logo) => String(logo?.href || "").includes("500"))?.href || logos[0]?.href || "";
}

async function fetchEspnTeamLogos() {
  const urls = [
    "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/teams",
    "https://site.web.api.espn.com/apis/site/v2/sports/soccer/bra.1/teams",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/teams",
    "https://site.web.api.espn.com/apis/site/v2/sports/soccer/bra.2/teams",
  ];
  let added = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 AnalyseProLogoBot/1.0", accept: "application/json,text/plain,*/*" } });
      if (!response.ok) continue;
      const json = await response.json();
      const teams = json?.sports?.[0]?.leagues?.[0]?.teams || json?.teams || [];
      for (const entry of teams) {
        const team = entry?.team || entry;
        const name = team?.displayName || team?.name || team?.shortDisplayName;
        const logo = bestLogo(team?.logos) || team?.logo || team?.image;
        const aliases = [team?.displayName, team?.name, team?.shortDisplayName, team?.abbreviation, team?.nickname, name].filter(Boolean);
        if (name && logo) {
          for (const alias of aliases) registerLogo(String(alias), String(logo), "espn-public");
          added += 1;
        }
      }
    } catch (_error) {
      // Continua para fallback estático.
    }
  }
  return added;
}

export async function updateBrasileiraoLogoRobot(force = false) {
  if (updating) return updating;
  const age = status.lastSuccessAt ? Date.now() - new Date(status.lastSuccessAt).getTime() : Infinity;
  if (!force && age < UPDATE_EVERY_MS && logoMap.size > 0) return Array.from(logoMap.values());

  updating = (async () => {
    const started = Date.now();
    status.status = "running";
    status.lastRunAt = new Date().toISOString();
    try {
      seedStaticLogos();
      const espnCount = await fetchEspnTeamLogos();
      status.status = "online";
      status.lastSuccessAt = new Date().toISOString();
      status.lastError = null;
      status.totalItems = logoMap.size;
      status.lastExecutionMs = Date.now() - started;
      addLog("success", `Robô de escudos atualizado. ESPN: ${espnCount} itens. Cache total: ${logoMap.size}.`);
      return Array.from(logoMap.values());
    } catch (error: any) {
      status.status = "error";
      status.lastError = error?.message || "Erro ao atualizar robô de escudos";
      status.lastExecutionMs = Date.now() - started;
      addLog("error", status.lastError || "Erro desconhecido");
      return Array.from(logoMap.values());
    } finally {
      updating = null;
    }
  })();

  return updating;
}

export function startBrasileiraoLogoRobot() {
  if (intervalStarted) return;
  intervalStarted = true;
  updateBrasileiraoLogoRobot(true).catch(() => undefined);
  setInterval(() => updateBrasileiraoLogoRobot(false).catch(() => undefined), UPDATE_EVERY_MS);
}

export function getBrasileiraoLogoRobotStatus() {
  return { ...status, totalItems: logoMap.size };
}

export function getBrasileiraoLogoRobotLogs() {
  return logs;
}

export function getCachedBrasileiraoLogos() {
  return Array.from(logoMap.values());
}

export function getBrasileiraoLogoUrl(team: string) {
  const key = aliasKey(team);
  return logoMap.get(key)?.url || logoMap.get(normalizeLogoKey(team))?.url || BRASILEIRAO_LOGO_SOURCES[key] || BRASILEIRAO_LOGO_SOURCES[normalizeLogoKey(team)] || "";
}

export function fallbackLogoSvg(label: string) {
  const initials = String(label || "BR").slice(0, 3).toUpperCase();
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="34" fill="#050a08"/><text x="80" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="900" fill="#ffd400">${initials}</text></svg>`);
}

async function normalizeLogoImage(body: Buffer, contentType: string) {
  try {
    const png = await sharp(body, { density: 180 })
      .resize(132, 132, { fit: "inside", withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 14,
        bottom: 14,
        left: 14,
        right: 14,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return { contentType: "image/png", body: png };
  } catch (_error) {
    return { contentType, body };
  }
}

export async function getBrasileiraoLogoImage(team: string) {
  const url = getBrasileiraoLogoUrl(team);
  const cacheKey = url || aliasKey(team);
  const cached = imageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached;

  if (url) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 AnalyseProLogoBot/1.0", accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" } });
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "image/png";
        const rawBody = Buffer.from(await response.arrayBuffer());
        const normalized = await normalizeLogoImage(rawBody, contentType);
        const item = { ...normalized, expiresAt: Date.now() + UPDATE_EVERY_MS };
        imageCache.set(cacheKey, item);
        return item;
      }
    } catch (_error) {
      // Usa fallback abaixo.
    }
  }

  const fallback = { contentType: "image/svg+xml; charset=utf-8", body: fallbackLogoSvg(team), expiresAt: Date.now() + 60 * 60 * 1000 };
  imageCache.set(cacheKey, fallback);
  return fallback;
}
