export type MainLeagueConfig = {
  slug: string;
  title: string;
  shortTitle: string;
  country: string;
  badge: string;
  accent: string;
  aliases: string[];
  priority: number;
};

export const MAIN_LEAGUES: MainLeagueConfig[] = [
  {
    slug: "mundial-clubes",
    title: "Mundial de Clubes",
    shortTitle: "Mundial",
    country: "Mundo",
    badge: "🌎",
    accent: "from-slate-600 to-slate-700",
    aliases: ["mundial de clubes", "club world cup", "fifa club world cup", "world club"],
    priority: 100,
  },
  {
    slug: "champions",
    title: "Champions League",
    shortTitle: "Champions",
    country: "Europa",
    badge: "⭐",
    accent: "from-slate-600 to-slate-700",
    aliases: ["champions league", "uefa champions", "champions"],
    priority: 95,
  },
  {
    slug: "libertadores",
    title: "Libertadores",
    shortTitle: "Libertadores",
    country: "América do Sul",
    badge: "🏆",
    accent: "from-slate-600 to-slate-700",
    aliases: ["libertadores", "copa libertadores", "conmebol libertadores"],
    priority: 94,
  },
  {
    slug: "premier-league",
    title: "Premier League",
    shortTitle: "Premier",
    country: "Inglaterra",
    badge: "🇬🇧",
    accent: "from-slate-600 to-slate-700",
    aliases: ["premier league", "england premier", "epl"],
    priority: 90,
  },
  {
    slug: "la-liga",
    title: "La Liga",
    shortTitle: "La Liga",
    country: "Espanha",
    badge: "🇪🇸",
    accent: "from-slate-600 to-slate-700",
    aliases: ["la liga", "laliga", "spain primera", "primera división"],
    priority: 88,
  },
  {
    slug: "serie-a-italia",
    title: "Serie A Itália",
    shortTitle: "Serie A ITA",
    country: "Itália",
    badge: "🇮🇹",
    accent: "from-slate-600 to-slate-700",
    aliases: ["serie a italy", "serie a", "italy serie a", "italian serie a"],
    priority: 86,
  },
  {
    slug: "bundesliga",
    title: "Bundesliga",
    shortTitle: "Bundesliga",
    country: "Alemanha",
    badge: "🇩🇪",
    accent: "from-slate-600 to-slate-700",
    aliases: ["bundesliga", "germany bundesliga", "alemania bundesliga"],
    priority: 84,
  },
  {
    slug: "ligue-1",
    title: "Ligue 1",
    shortTitle: "Ligue 1",
    country: "França",
    badge: "🇫🇷",
    accent: "from-slate-600 to-slate-700",
    aliases: ["ligue 1", "france ligue 1", "ligue one"],
    priority: 82,
  },
];

export function getLeagueBySlug(slug?: string | null) {
  return MAIN_LEAGUES.find((league) => league.slug === slug) || MAIN_LEAGUES[0];
}

export function matchLeagueName(value: unknown, league: MainLeagueConfig) {
  const text = String(value || "").toLowerCase();
  if (!text) return false;
  return league.aliases.some((alias) => text.includes(alias.toLowerCase()));
}
