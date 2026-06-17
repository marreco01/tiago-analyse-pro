export type NewsCategory =
  | "ultimas"
  | "brasileirao"
  | "mundial"
  | "libertadores"
  | "mercado"
  | "lesoes";

export type NewsImpact = "Alto" | "Médio" | "Baixo";

export type FootballNewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  category: NewsCategory;
  summary: string;
  aiImpact: NewsImpact;
  affectedTeams: string[];
  affectedMarkets: string[];
  isBreaking: boolean;
};

type NewsCache = {
  updatedAt: string;
  items: FootballNewsItem[];
};


export type RobotLogEntry = {
  id: string;
  robot: "noticias";
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
  totalItems?: number;
};

export type RobotStatus = {
  id: "noticias";
  name: string;
  status: "online" | "running" | "error";
  visibleToPublic: false;
  intervalMinutes: number;
  sources: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  totalItems: number;
  lastError?: string;
};

const CACHE_TIME_MS = 1000 * 60 * 10;

const CATEGORY_IMAGES: Record<NewsCategory, string> = {
  ultimas:
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80",
  brasileirao:
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1000&q=80",
  mundial:
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80",
  libertadores:
    "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1000&q=80",
  mercado:
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80",
  lesoes:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80",
};

const DEFAULT_IMAGE = CATEGORY_IMAGES.ultimas;

let cache: NewsCache = { updatedAt: new Date().toISOString(), items: [] };
let cacheExpiresAt = 0;
let running = false;
let timer: NodeJS.Timeout | null = null;

const robotLogs: RobotLogEntry[] = [];
let lastRunAt = "";
let nextRunAt = "";
let lastError = "";
let robotStatus: RobotStatus["status"] = "online";

function addRobotLog(level: RobotLogEntry["level"], message: string, totalItems?: number) {
  robotLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    robot: "noticias",
    level,
    message,
    createdAt: new Date().toISOString(),
    totalItems,
  });

  if (robotLogs.length > 80) robotLogs.length = 80;
}

function scheduleNextRun() {
  nextRunAt = new Date(Date.now() + CACHE_TIME_MS).toISOString();
}

export function getNewsRobotLogs() {
  return robotLogs;
}

export function getNewsRobotStatus(): RobotStatus {
  return {
    id: "noticias",
    name: "Robô Notícias",
    status: robotStatus,
    visibleToPublic: false,
    intervalMinutes: Math.round(CACHE_TIME_MS / 60000),
    sources: RSS_SOURCES.map((item) => item.source),
    lastRunAt,
    nextRunAt,
    totalItems: cache.items.length,
    lastError,
  };
}


const CATEGORY_WORDS: Record<NewsCategory, string[]> = {
  ultimas: ["futebol", "jogo", "time", "partida", "campeonato"],
  brasileirao: [
    "brasileirão",
    "brasileirao",
    "série a",
    "serie a",
    "flamengo",
    "palmeiras",
    "botafogo",
    "corinthians",
    "são paulo",
    "sao paulo",
    "santos",
    "vasco",
    "fluminense",
    "grêmio",
    "gremio",
    "internacional",
    "bahia",
    "cruzeiro",
    "atlético-mg",
    "atletico-mg",
    "fortaleza",
    "bragantino",
    "athletico",
    "mirassol",
    "juventude",
    "vitória",
    "vitoria",
    "ceará",
    "ceara",
    "sport",
  ],
  mundial: [
    "champions",
    "premier",
    "laliga",
    "liga dos campeões",
    "real madrid",
    "barcelona",
    "psg",
    "city",
    "bayern",
    "inter",
    "milan",
    "argentina",
    "portugal",
    "seleção",
    "selecao",
    "copa do mundo",
    "mundial",
    "méxico",
    "mexico",
    "áfrica",
    "africa",
  ],
  libertadores: ["libertadores", "sul-americana", "conmebol", "recopa"],
  mercado: [
    "contrata",
    "contratação",
    "contratacao",
    "mercado",
    "reforço",
    "reforco",
    "transferência",
    "transferencia",
    "negocia",
    "vende",
    "empresta",
    "acerto",
    "renova",
    "proposta",
    "alvo",
    "janela",
  ],
  lesoes: [
    "lesão",
    "lesao",
    "lesoes",
    "lesões",
    "machucado",
    "suspenso",
    "suspensão",
    "suspensao",
    "departamento médico",
    "departamento medico",
    "desfalque",
    "fora do jogo",
    "cartão vermelho",
    "cartao vermelho",
    "poupado",
  ],
};

const TEAM_WORDS = [
  "Flamengo",
  "Palmeiras",
  "Botafogo",
  "Corinthians",
  "São Paulo",
  "Santos",
  "Vasco",
  "Fluminense",
  "Grêmio",
  "Internacional",
  "Bahia",
  "Cruzeiro",
  "Atlético-MG",
  "Fortaleza",
  "Bragantino",
  "Athletico",
  "Mirassol",
  "Juventude",
  "Vitória",
  "Ceará",
  "Sport",
  "Real Madrid",
  "Barcelona",
  "PSG",
  "Manchester City",
  "Bayern",
  "Milan",
  "Inter",
  "Argentina",
  "Brasil",
  "Portugal",
  "México",
  "África do Sul",
];

const RSS_SOURCES = [
  { url: "https://ge.globo.com/rss/ge/futebol/", source: "ge" },
  { url: "https://www.espn.com.br/espn/rss/futebol", source: "ESPN" },
  { url: "https://www.uol.com.br/esporte/futebol/ultimas/index.xml", source: "UOL Esporte" },
];

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(block: string, tag: string) {
  const found = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return stripHtml(found?.[1] || "");
}

function cleanImageUrl(value = "") {
  const decoded = decodeEntities(value).trim();
  if (!decoded || decoded.startsWith("data:")) return "";
  return decoded.replace(/^\/\//, "https://");
}

function getImageFromBlock(block: string, category: NewsCategory) {
  const raw =
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ||
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ||
    block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ||
    block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
    "";

  return cleanImageUrl(raw) || CATEGORY_IMAGES[category] || DEFAULT_IMAGE;
}

async function getArticleOgImage(url: string) {
  if (!url.startsWith("http")) return "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 AnalyseProNewsBot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return "";
    const html = await response.text();

    return cleanImageUrl(
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
        ""
    );
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function makeId(source: string, title: string, index: number) {
  return `${source.toLowerCase().replace(/\W+/g, "-")}-${index}-${Buffer.from(title).toString("base64url").slice(0, 10)}`;
}

function categoryFromText(text: string): NewsCategory {
  const lower = text.toLowerCase();
  const priority: NewsCategory[] = ["lesoes", "mercado", "libertadores", "brasileirao", "mundial"];

  for (const category of priority) {
    if (CATEGORY_WORDS[category].some((word) => lower.includes(word))) return category;
  }

  return "ultimas";
}

function summaryFromText(text: string) {
  const clean = stripHtml(text);
  if (!clean) return "Resumo automático do robô de notícias do Analyse Pro.";
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function getAffectedTeams(text: string) {
  const lower = text.toLowerCase();
  const teams = TEAM_WORDS.filter((team) => lower.includes(team.toLowerCase()));
  return teams.length ? teams.slice(0, 4) : ["A confirmar"];
}

function getAffectedMarkets(category: NewsCategory, text: string) {
  const lower = text.toLowerCase();

  if (category === "lesoes") return ["Escalação", "Vitória/Empate", "Over/Under gols"];
  if (category === "mercado") return ["Força do elenco", "Odds futuras", "Mercado campeão"];
  if (category === "libertadores") return ["Over 1.5", "BTTS", "Cartões"];
  if (lower.includes("gol") || lower.includes("ataque") || lower.includes("atacante")) return ["Over 1.5", "Over 2.5", "BTTS"];
  if (lower.includes("defesa") || lower.includes("zagueiro") || lower.includes("goleiro")) return ["Under 2.5", "BTTS Não", "Resultado"];
  if (lower.includes("clássico") || lower.includes("classico")) return ["Cartões", "Escanteios", "Dupla Chance"];

  return ["Over 1.5", "BTTS", "Resultado"];
}

function getImpact(category: NewsCategory, text: string): NewsImpact {
  const lower = text.toLowerCase();
  const highWords = ["urgente", "última hora", "confirmado", "lesão", "desfalque", "contrata", "demitido", "fora", "final"];
  if (category === "lesoes" || category === "mercado" || highWords.some((word) => lower.includes(word))) return "Alto";
  if (category === "libertadores" || category === "brasileirao") return "Médio";
  return "Baixo";
}

function isBreakingNews(category: NewsCategory, publishedAt: string, text: string) {
  const ageMinutes = (Date.now() - new Date(publishedAt).getTime()) / 60000;
  const lower = text.toLowerCase();
  return (
    ageMinutes <= 90 ||
    category === "lesoes" ||
    category === "mercado" ||
    lower.includes("urgente") ||
    lower.includes("última hora") ||
    lower.includes("confirmado")
  );
}

async function fetchRssFeed(feedUrl: string, source: string): Promise<FootballNewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AnalyseProNewsBot/1.0 (+public football news)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const blocks = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi))
      .map((match) => match[0])
      .slice(0, 18);

    const parsed = blocks
      .map((block, index) => {
        const title = getTag(block, "title");
        const url = getTag(block, "link") || feedUrl;
        const description = getTag(block, "description");
        const pubDate = getTag(block, "pubDate");
        const publishedAt =
          pubDate && !Number.isNaN(new Date(pubDate).getTime())
            ? new Date(pubDate).toISOString()
            : new Date().toISOString();

        if (!title || title.length < 12) return null;

        const fullText = `${title} ${description}`;
        const category = categoryFromText(fullText);

        return {
          id: makeId(source, title, index),
          title,
          source,
          url,
          image: getImageFromBlock(block, category),
          publishedAt,
          category,
          summary: summaryFromText(description || title),
          aiImpact: getImpact(category, fullText),
          affectedTeams: getAffectedTeams(fullText),
          affectedMarkets: getAffectedMarkets(category, fullText),
          isBreaking: isBreakingNews(category, publishedAt, fullText),
        } satisfies FootballNewsItem;
      })
      .filter(Boolean) as FootballNewsItem[];

    const withImages = await Promise.all(
      parsed.map(async (item, index) => {
        if (index > 14 || item.image !== CATEGORY_IMAGES[item.category]) return item;
        const ogImage = await getArticleOgImage(item.url);
        return ogImage ? { ...item, image: ogImage } : item;
      })
    );

    return withImages;
  } finally {
    clearTimeout(timeout);
  }
}

async function collectPublicNews() {
  const results = await Promise.allSettled(RSS_SOURCES.map((feed) => fetchRssFeed(feed.url, feed.source)));

  const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const unique = new Map<string, FootballNewsItem>();
  for (const item of items) {
    const key = item.url || item.title.toLowerCase();
    if (!unique.has(key)) unique.set(key, item);
  }

  return Array.from(unique.values())
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, 42);
}

const FALLBACK_NEWS: FootballNewsItem[] = [
  {
    id: "fallback-robo-ativo",
    title: "Robô de notícias ativo no Analyse Pro",
    source: "Analyse Pro",
    url: "/noticias",
    image: DEFAULT_IMAGE,
    publishedAt: new Date().toISOString(),
    category: "ultimas",
    summary:
      "O robô público de notícias foi instalado com cache automático, rota própria e atualização automática a cada 10 minutos.",
    aiImpact: "Baixo",
    affectedTeams: ["A confirmar"],
    affectedMarkets: ["Informativo"],
    isBreaking: false,
  },
  {
    id: "fallback-brasileirao",
    title: "Notícias do Brasileirão organizadas por categoria",
    source: "Analyse Pro",
    url: "/brasileirao",
    image: CATEGORY_IMAGES.brasileirao,
    publishedAt: new Date().toISOString(),
    category: "brasileirao",
    summary:
      "A busca automática separa conteúdos de Brasileirão, futebol mundial, mercado, Libertadores e desfalques.",
    aiImpact: "Médio",
    affectedTeams: ["Clubes BR"],
    affectedMarkets: ["Over 1.5", "BTTS", "Resultado"],
    isBreaking: false,
  },
];

export async function updatePublicNews(force = false): Promise<NewsCache> {
  const now = Date.now();
  if (!force && cache.items.length && now < cacheExpiresAt) return cache;

  robotStatus = "running";
  lastError = "";

  try {
    const items = await collectPublicNews();
    cache = {
      updatedAt: new Date().toISOString(),
      items: items.length ? items : FALLBACK_NEWS,
    };
    lastRunAt = cache.updatedAt;
    robotStatus = "online";
    addRobotLog("success", `Notícias atualizadas com sucesso. ${cache.items.length} itens disponíveis.`, cache.items.length);
  } catch (error) {
    console.error("Erro no robô público de notícias:", error);
    lastError = error instanceof Error ? error.message : "Erro desconhecido";
    robotStatus = "error";
    cache = {
      updatedAt: new Date().toISOString(),
      items: cache.items.length ? cache.items : FALLBACK_NEWS,
    };
    addRobotLog("error", `Falha ao atualizar notícias: ${lastError}`, cache.items.length);
  }

  cacheExpiresAt = Date.now() + CACHE_TIME_MS;
  scheduleNextRun();
  return cache;
}

export async function getPublicNews(force = false): Promise<NewsCache> {
  return updatePublicNews(force);
}

export function getCachedPublicNews() {
  return cache.items.length ? cache : { ...cache, items: FALLBACK_NEWS };
}

export function filterNewsByCategory(items: FootballNewsItem[], category: NewsCategory) {
  if (category === "ultimas") return items;
  const filtered = items.filter((item) => item.category === category);
  return filtered.length ? filtered : items.slice(0, 8);
}

export function startPublicNewsRobot() {
  if (running) return;
  running = true;

  console.log("🤖 Robô público de notícias iniciado: atualização automática a cada 10 minutos");
  addRobotLog("info", "Robô Notícias iniciado em modo privado para administrador.");
  scheduleNextRun();
  updatePublicNews(true).catch(() => undefined);

  timer = setInterval(() => {
    updatePublicNews(true).catch(() => undefined);
  }, CACHE_TIME_MS);

  timer.unref?.();
}
