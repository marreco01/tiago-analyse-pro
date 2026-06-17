import {
  getCachedPublicNews,
  updatePublicNews,
  type FootballNewsItem,
} from "./index";

export type InstagramSlide = {
  id: string;
  start: number;
  end: number;
  headline: string;
  caption: string;
  position: "top" | "center" | "bottom";
};

export type InstagramProject = {
  id: string;
  newsId: string;
  title: string;
  source?: string;
  url?: string;
  imageUrl?: string;
  thumbnail?: string;
  mediaUrl?: string;
  images?: string[];
  mediaImages?: string[];
  status: "pending" | "approved" | "published";
  format: "reels-1080x1920";
  duration: number;
  brand: "Analyse Pro 2.0";
  template: "breaking" | "analysis" | "injury" | "market";
  backgroundMusic: {
    mode: "royalty-free-placeholder";
    label: string;
    note: string;
  };
  slides: InstagramSlide[];
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
};

export type InstagramRobotStatus = {
  id: "instagram";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  pending: number;
  approved: number;
  published: number;
  lastError?: string;
};

export type InstagramRobotLogEntry = {
  id: string;
  robot: "instagram";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

const INSTAGRAM_CACHE_TIME_MS = 1000 * 60 * 10;
const logs: InstagramRobotLogEntry[] = [];
let running = false;
let timer: NodeJS.Timeout | null = null;
let status: InstagramRobotStatus["status"] = "online";
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";

let cache = {
  updatedAt: new Date().toISOString(),
  projects: [] as InstagramProject[],
};

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + INSTAGRAM_CACHE_TIME_MS).toISOString();
}

function addLog(level: InstagramRobotLogEntry["level"], message: string, totalItems?: number) {
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "instagram",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });
  if (logs.length > 100) logs.length = 100;
}

function clean(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function short(text: string, max = 92) {
  const value = clean(text);
  return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
}

function templateFor(news: FootballNewsItem): InstagramProject["template"] {
  const text = `${news.title || ""} ${news.summary || ""}`.toLowerCase();
  if (text.includes("lesão") || text.includes("lesao") || text.includes("desfalque")) return "injury";
  if (text.includes("contrata") || text.includes("reforço") || text.includes("mercado")) return "market";
  if (text.includes("análise") || text.includes("probabilidade") || text.includes("aposta")) return "analysis";
  return news.isBreaking ? "breaking" : "analysis";
}

function hashtagsFor(news: FootballNewsItem) {
  const text = `${news.title || ""} ${news.summary || ""}`.toLowerCase();
  const tags = ["#AnalysePro", "#Futebol", "#NoticiasDoFutebol"];
  if (text.includes("flamengo")) tags.push("#Flamengo");
  if (text.includes("palmeiras")) tags.push("#Palmeiras");
  if (text.includes("corinthians")) tags.push("#Corinthians");
  if (text.includes("brasil")) tags.push("#Brasil");
  if (text.includes("copa")) tags.push("#CopaDoMundo");
  if (text.includes("brasileirão") || text.includes("brasileirao")) tags.push("#Brasileirao");
  if (text.includes("libertadores")) tags.push("#Libertadores");
  return Array.from(new Set(tags)).slice(0, 8);
}

function projectFromNews(news: FootballNewsItem): InstagramProject {
  const title = short(news.title || "Notícia do futebol", 95);
  const summary = short(news.summary || news.reason || "Atualização importante no mundo do futebol.", 120);
  const template = templateFor(news);

  const impact =
    template === "injury" ? "Pode mexer em escalação, gols e favoritismo." :
    template === "market" ? "Pode alterar força ofensiva e projeções futuras." :
    template === "breaking" ? "Notícia quente para acompanhar agora." :
    "Impacto direto nas leituras do Analyse Pro.";

  const isSensitiveNews = /morreu|morre|falec|óbito|obito|luto/i.test(`${news.title || ""} ${news.summary || ""}`);

  const market = isSensitiveNews
    ? "Registro histórico: carreira, seleção e legado no futebol."
    : template === "injury" ? "Mercados afetados: cartões, gols e vitória." :
      template === "market" ? "Mercados afetados: Over 1.5, BTTS e vitória." :
      "Mercados para observar: gols, escanteios e cartões.";

  const id = `ig-${news.id || Date.now()}`;
  const now = new Date().toISOString();

  return {
    id,
    newsId: String(news.id || id),
    title,
    source: news.source,
    url: news.url,
    imageUrl: (news as any).imageUrl || (news as any).thumbnail || (news as any).image || "",
    thumbnail: (news as any).thumbnail || (news as any).imageUrl || (news as any).image || "",
    mediaUrl: (news as any).mediaUrl || "",
    images: Array.from(new Set([
      (news as any).imageUrl,
      (news as any).thumbnail,
      (news as any).image,
      ...(((news as any).images || []) as string[]),
    ].filter(Boolean))),
    mediaImages: Array.from(new Set([
      (news as any).mediaUrl,
      ...(((news as any).mediaImages || []) as string[]),
    ].filter(Boolean))),
    status: "pending",
    format: "reels-1080x1920",
    duration: 30,
    brand: "Analyse Pro 2.0",
    template,
    backgroundMusic: {
      mode: "royalty-free-placeholder",
      label: "Batida esportiva sem direitos autorais",
      note: "Use música da biblioteca do Instagram ou arquivo próprio sem copyright. O robô não baixa música protegida.",
    },
    slides: [
      { id: `${id}-s1`, start: 0, end: 5, headline: news.isBreaking ? "🚨 ÚLTIMA HORA" : "⚽ NOTÍCIA DO FUTEBOL", caption: title, position: "center" },
      { id: `${id}-s2`, start: 5, end: 11, headline: "O QUE ACONTECEU", caption: summary, position: "bottom" },
      { id: `${id}-s3`, start: 11, end: 17, headline: isSensitiveNews ? "RESUMO DA NOTÍCIA" : "IMPACTO NO JOGO", caption: isSensitiveNews ? summary : impact, position: "bottom" },
      { id: `${id}-s4`, start: 17, end: 24, headline: isSensitiveNews ? "LEGADO NO FUTEBOL" : "MERCADOS AFETADOS", caption: market, position: "bottom" },
      { id: `${id}-s5`, start: 24, end: 30, headline: "🤖 ANALYSE PRO 2.0", caption: "Siga o Analyse Pro para mais notícias do futebol.", position: "center" },
    ],
    hashtags: hashtagsFor(news),
    createdAt: now,
    updatedAt: now,
  };
}

async function collectInstagramProjects() {
  await updatePublicNews().catch(() => undefined);
  const news = getCachedPublicNews().items || [];
  const selected = news.slice(0, 12);
  const current = new Map(cache.projects.map((project) => [project.newsId, project]));
  const projects = selected.map((item) => {
    const key = String(item.id || "");
    const existing = current.get(key);
    if (existing) return existing;
    return projectFromNews(item);
  });

  return projects;
}

export async function updateInstagramRobot(force = false) {
  if (!force && cache.projects.length) return cache;

  status = "running";
  lastError = "";

  try {
    const projects = await collectInstagramProjects();
    cache = { updatedAt: new Date().toISOString(), projects };
    lastRunAt = cache.updatedAt;
    status = "online";
    scheduleNextRun();
    addLog("success", `Robô Instagram atualizado: ${projects.length} roteiros de Reels gerados.`, projects.length);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    status = "error";
    scheduleNextRun();
    addLog("error", `Falha no Robô Instagram: ${lastError}`, cache.projects.length);
  }

  return cache;
}

export function getInstagramRobotStatus(): InstagramRobotStatus {
  const projects = cache.projects;
  return {
    id: "instagram",
    name: "Robô Instagram",
    status,
    visibleToPublic: false,
    intervalMinutes: Math.round(INSTAGRAM_CACHE_TIME_MS / 60000),
    sources: ["Robô Notícias", "Templates Reels 1080x1920", "Música sem copyright/manual"],
    lastRunAt,
    nextRunAt,
    totalItems: projects.length,
    pending: projects.filter((project) => project.status === "pending").length,
    approved: projects.filter((project) => project.status === "approved").length,
    published: projects.filter((project) => project.status === "published").length,
    lastError,
  };
}

export function getInstagramRobotLogs() {
  return logs;
}

export function getCachedInstagramProjects() {
  return cache;
}

export function updateInstagramProjectStatus(id: string, nextStatus: InstagramProject["status"]) {
  const project = cache.projects.find((item) => item.id === id);
  if (!project) return null;
  project.status = nextStatus;
  project.updatedAt = new Date().toISOString();
  addLog("success", `Post Instagram marcado como ${nextStatus}: ${project.title}`);
  return project;
}

export function startInstagramRobot() {
  if (running) return;
  running = true;
  addLog("info", "Robô Instagram iniciado: roteiros de Reels 30s com legenda animada e música sem copyright.");
  scheduleNextRun();
  updateInstagramRobot(true).catch(() => undefined);
  timer = setInterval(() => updateInstagramRobot(true).catch(() => undefined), INSTAGRAM_CACHE_TIME_MS);
  timer.unref?.();
}
