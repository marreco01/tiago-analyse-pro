import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  MapPin,
  RefreshCcw,
  Search,
  Shield,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";








const BR_FORM_ICON = (r: string) => r === "V" ? "🟢" : r === "E" ? "🟡" : "🔴";

const BR_CALC_MATCH = (home: any, away: any) => {
  const homeScore = home.index + home.gf * 1.4 - home.ga * 0.9 + home.wins * 2;
  const awayScore = away.index + away.gf * 1.3 - away.ga * 0.9 + away.wins * 2;
  const drawBase = 28;
  const total = homeScore + awayScore + drawBase;
  const homePct = Math.round((homeScore / total) * 100);
  const awayPct = Math.round((awayScore / total) * 100);
  const drawPct = Math.max(10, 100 - homePct - awayPct);
  const over15 = Math.min(88, Math.max(48, Math.round(((home.gf + away.gf) / 20) * 55 + 25)));
  const btts = Math.min(82, Math.max(35, Math.round(((home.gf + away.gf) / (home.ga + away.ga + 1)) * 18 + 35)));
  const favorite = homePct > awayPct + 3 ? home.name : awayPct > homePct + 3 ? away.name : "Equilíbrio";
  return { homePct, drawPct, awayPct, over15, btts, favorite };
};

// BRASILEIRAO_ANALISE_IA_REFEITA_PADRAO_COPA


type Tab = "classificacao" | "rodadas" | "resultados" | "ao-vivo" | "analise";

type Match = {
  fixtureId: string;
  date: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  round: string;
  stadium?: string;
  city?: string;
};

type Standing = {
  rank: number;
  team: string;
  logo?: string;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form?: string;
  last5?: Array<"W" | "D" | "L">;
};

type Club = { team: string; logo?: string };
type ClubOption = { name: string; logo?: string };

type Dashboard = {
  season: number;
  title: string;
  matches: Match[];
  standings: Standing[];
  clubGrid: Club[];
  totals: { matches: number; completed: number; live: number; upcoming: number; clubs: number };
  updatedAt: string;
};

type ApiResponse = { success: boolean; dashboard?: Dashboard; error?: string };
type BrasileiraoTopScorer = { rank: number; player: string; team: string; goals: number; photo?: string };
type BrasileiraoNextMatch = { id: string; round: string; date: string; time: string; home: string; away: string; homeLogo?: string; awayLogo?: string; homeGoals?: number | null; awayGoals?: number | null; elapsed?: number | null; stadium?: string; city?: string; status?: string };
type BrasileiraoTableRobotResponse = { success: boolean; standings?: Standing[]; updatedAt?: string; fixturesUpdatedAt?: string; source?: string; error?: string; topScorers?: BrasileiraoTopScorer[]; nextRound?: BrasileiraoNextMatch[]; robot?: { lastRunAt?: string; lastSuccessAt?: string; lastExecutionMs?: number; status?: string; fixturesIntervalMinutes?: number } };

type TeamHistory = {
  team: string;
  last10: Array<"W" | "D" | "L">;
  goalsFor: number;
  goalsAgainst: number;
  attack: number;
  defense: number;
  moment: string;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "rodadas", label: "Grade de jogos" },
  { id: "analise", label: "Análise IA" },
  { id: "classificacao", label: "Classificação" },
  { id: "resultados", label: "Resultados" },
  { id: "ao-vivo", label: "Ao vivo" },
];

const LIVE_STATUSES = ["1H", "2H", "HT", "LIVE", "ET", "IN_PROGRESS", "STATUS_IN_PROGRESS", "STATUS_FIRST_HALF", "STATUS_SECOND_HALF", "STATUS_HALFTIME"];
const DONE_STATUSES = ["FT", "AET", "PEN", "FINAL", "STATUS_FINAL"];
function isLiveStatus(status?: string) {
  return LIVE_STATUSES.includes(String(status || "").toUpperCase());
}
function isDoneStatus(status?: string) {
  return DONE_STATUSES.includes(String(status || "").toUpperCase());
}

// V45: removido fallbackClubs. Clubes só vêm do Robô Brasileirão Série B Master.




function normalizeClubName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const BR_MASTER_ALIASES: Record<string, string[]> = {
  atleticomg: ["atlético-mg", "atletico-mg", "atlético mineiro", "atletico mineiro", "cam"],
  athleticopr: ["athletico-pr", "athletico pr", "athletico paranaense", "atlético pr", "atletico pr", "cap"],
  bragantino: ["red bull bragantino", "rb bragantino", "bragantino", "redbull bragantino"],
  vasco: ["vasco", "vasco da gama", "cr vasco da gama"],
  saopaulo: ["são paulo", "sao paulo", "spfc", "sao paulo fc"],
  vitoria: ["vitória", "vitoria", "ec vitória", "ec vitoria"],
  gremio: ["grêmio", "gremio", "grêmio fbpa", "gremio fbpa"],
  ceara: ["ceará", "ceara", "ceará sc", "ceara sc"],
  coritiba: ["coritiba", "coritiba fc", "cfc"],
  chapecoense: ["chapecoense", "chapecoense af"],
  mirassol: ["mirassol", "mirassol fc"],
  remo: ["remo", "clube do remo"],
};

function masterClubKey(value: string) {
  const normalized = normalizeClubName(value);
  for (const [canonical, aliases] of Object.entries(BR_MASTER_ALIASES)) {
    if (aliases.some((alias) => normalizeClubName(alias) === normalized)) return canonical;
  }
  return normalized;
}

const BRASILEIRAO_LOGOS: Record<string, string> = {
  flamengo: "/api/brasileirao/logo/flamengo",
  palmeiras: "/api/brasileirao/logo/palmeiras",
  botafogo: "/api/brasileirao/logo/botafogo",
  cruzeiro: "/api/brasileirao/logo/cruzeiro",
  bahia: "/api/brasileirao/logo/bahia",
  saopaulo: "/api/brasileirao/logo/saopaulo",
  corinthians: "/api/brasileirao/logo/corinthians",
  fluminense: "/api/brasileirao/logo/fluminense",
  gremio: "/api/brasileirao/logo/gremio",
  internacional: "/api/brasileirao/logo/internacional",
  atletico: "/api/brasileirao/logo/atleticomg",
  atleticoac: "/api/brasileirao/logo/atleticomg",
  atleticomg: "/api/brasileirao/logo/atleticomg",
  atleticomineiro: "/api/brasileirao/logo/atleticomg",
  atleticoparanaense: "/api/brasileirao/logo/athleticopr",
  athleticopr: "/api/brasileirao/logo/athleticopr",
  athleticoparanaense: "/api/brasileirao/logo/athleticopr",
  bragantino: "/api/brasileirao/logo/redbullbragantino",
  redbullbragantino: "/api/brasileirao/logo/redbullbragantino",
  vasco: "/api/brasileirao/logo/vasco",
  vascodagama: "/api/brasileirao/logo/vasco",
  santos: "/api/brasileirao/logo/santos",
  fortaleza: "/api/brasileirao/logo/fortaleza",
  ceara: "/api/brasileirao/logo/ceara",
  vitoria: "/api/brasileirao/logo/vitoria",
  sport: "/api/brasileirao/logo/sport",
  juventude: "/api/brasileirao/logo/juventude",
  coritiba: "/api/brasileirao/logo/coritiba",
  chapecoense: "/api/brasileirao/logo/chapecoense",
  remo: "/api/brasileirao/logo/remo",
  mirassol: "/api/brasileirao/logo/mirassol",
  goias: "/api/brasileirao/logo/goias",
  guarani: "/api/brasileirao/logo/guarani",
  cuiaba: "/api/brasileirao/logo/cuiaba",
};

function mappedBrasileiraoLogo(name: string) {
  const key = masterClubKey(name);
  return BRASILEIRAO_LOGOS[key] || BRASILEIRAO_LOGOS[key.replace(/^redbull/, "")] || undefined;
}

function normalizeFormToken(value: unknown): "W" | "D" | "L" | null {
  const token = String(value ?? "").trim().toUpperCase();
  if (["W", "V", "WIN", "VITORIA", "VITÓRIA"].includes(token)) return "W";
  // Corrigido: em feeds de futebol o token "D" normalmente significa DRAW/empate.
  // Antes o "D" caía como derrota e deixava bolinhas vermelhas falsas.
  if (["D", "E", "DRAW", "EMPATE"].includes(token)) return "D";
  if (["L", "LOSS", "DERROTA"].includes(token)) return "L";
  return null;
}

function teamSeed(name: string) {
  return normalizeClubName(name).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function buildVariedFormFromRecord(name: string, wins = 0, draws = 0, losses = 0): Array<"W" | "D" | "L"> {
  // V44: removido gerador de forma falsa. Forma só vem do Robô Master.
  return [];
}

function formFromStanding(row?: Standing): Array<"W" | "D" | "L"> | null {
  if (!row) return null;
  const fromLast5 = Array.isArray(row.last5) ? row.last5.map(normalizeFormToken).filter(Boolean) as Array<"W" | "D" | "L"> : [];
  const fromForm = row.form ? String(row.form).split("").map(normalizeFormToken).filter(Boolean) as Array<"W" | "D" | "L"> : [];
  const direct = (fromLast5.length >= 5 ? fromLast5 : fromForm).slice(-5);
  return direct.length >= 5 ? direct : null;
}

function findClubHistory(name: string, standings: Standing[] = []): TeamHistory {
  const row = standings.find((item) => masterClubKey(item.team) === masterClubKey(name));
  if (row) {
    const played = Math.max(1, row.played || row.win + row.draw + row.lose || 10);
    const attack = Math.max(45, Math.min(95, Math.round(50 + ((row.goalsFor || 0) / played) * 18 + ((row.points || 0) / played) * 5)));
    const defense = Math.max(45, Math.min(95, Math.round(86 - ((row.goalsAgainst || 0) / played) * 14 + ((row.goalsDiff || 0) / played) * 3)));
    return {
      team: row.team,
      last10: formFromStanding(row) || [],
      goalsFor: row.goalsFor || 10,
      goalsAgainst: row.goalsAgainst || 10,
      attack,
      defense,
      moment: row.rank <= 4 ? "Fase forte e briga no topo da tabela." : row.rank >= 17 ? "Momento de alerta e pressão contra rebaixamento." : "Campanha intermediária com oscilação de rendimento.",
    };
  }
  return { team: name, last10: [], goalsFor: 0, goalsAgainst: 0, attack: 0, defense: 0, moment: "Histórico real em atualização pelo Robô Master." };
}

function getClubLogo(name: string, logo?: string) {
  // V45: sem fallback local de clube. Usa logo do Master ou rota real do robô de escudos.
  return logo || mappedBrasileiraoLogo(name);
}

function enrichClubGrid(source?: Club[]) {
  // V44: o Brasileirão não usa mais base interna para preencher clube falso.
  // Se o Robô Master não entregar clubes, a grade fica vazia até a próxima coleta.
  const base = source?.length ? source : [];
  const seen = new Set<string>();
  return base.filter((club) => {
    const key = masterClubKey(club.team);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20).map((club) => ({ ...club, logo: getClubLogo(club.team, club.logo) }));
}

function brasileiraoNextRoundToMatches(nextRound: BrasileiraoNextMatch[]): Match[] {
  return nextRound.map((match, index) => ({
    fixtureId: match.id || `brasileirao-next-${index + 1}`,
    date: match.date,
    time: match.time,
    status: match.status || "NS",
    elapsed: null,
    league: "Brasileirão Série B",
    home: match.home,
    away: match.away,
    homeLogo: match.homeLogo,
    awayLogo: match.awayLogo,
    homeGoals: match.homeGoals ?? null,
    awayGoals: match.awayGoals ?? null,
    elapsed: match.elapsed ?? null,
    round: match.round || "Próximos jogos",
    stadium: match.stadium,
    city: match.city,
  }));
}

function buildInternalStandings(): Standing[] {
  return [];
}

function buildInternalDashboard(): Dashboard {
  // V44: dashboard vazio quando o Master falhar. Não injeta mock/local.
  const standings = buildInternalStandings();
  return {
    season: 2026,
    title: "Brasileirão Série B",
    matches: [],
    standings,
    clubGrid: [],
    totals: { matches: 0, completed: 0, live: 0, upcoming: 0, clubs: 0 },
    updatedAt: new Date().toISOString(),
  };
}



const renderBrasileiraoClubCard = (club: any, selected = false, onClick?: () => void) => (
  <button
    key={club.name}
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
      selected ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-black/30 hover:border-yellow-400/60"
    }`}
  >
    <span className="flex h-12 w-12 items-center justify-center text-2xl drop-shadow-lg">
      {club.logo ? <img src={club.logo} alt={club.name} className="h-12 w-12 object-contain" /> : (club.crest || club.badge || "⚽")}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-white truncate">{club.name}</span>
      <span className="block text-[11px] font-bold text-slate-400">{club.short}</span>
    </span>
  </button>
);

export default function BrasileiraoBB() {
  const [tab, setTab] = useState<Tab>("rodadas");
  const [data, setData] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [round, setRound] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClubA, setSelectedClubA] = useState<ClubOption | null>(null);
  const [selectedClubB, setSelectedClubB] = useState<ClubOption | null>(null);
  const [topScorers, setTopScorers] = useState<BrasileiraoTopScorer[]>([]);
  const [nextRound, setNextRound] = useState<BrasileiraoNextMatch[]>([]);
  const [robotInfo, setRobotInfo] = useState<BrasileiraoTableRobotResponse["robot"] | null>(null);

  function selectClubForAnalysis(club: ClubOption) {
    setTab("analise");
    setQuery("");
    if (!selectedClubA || (selectedClubA.name && selectedClubB)) {
      setSelectedClubA(club);
      setSelectedClubB(null);
      return;
    }
    if (selectedClubA.name === club.name) return;
    setSelectedClubB(club);
  }

  async function loadBrasileiraoTableRobot() {
    try {
      const response = await fetch("/api/brasileirao-b/table", { cache: "no-store" });
      const json = (await response.json()) as BrasileiraoTableRobotResponse;
      if (!response.ok || !json.success || !json.standings?.length) return null;
      return json;
    } catch {
      return null;
    }
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const robotData = await loadBrasileiraoTableRobot();
      if (!robotData?.standings?.length) {
        setData(buildInternalDashboard());
        setTopScorers([]);
        setNextRound([]);
        setRobotInfo(null);
        setError("Robô Brasileirão Série B Master ainda sem snapshot válido.");
        return;
      }

      const robotNextRound = robotData.nextRound || [];
      const robotMatches = brasileiraoNextRoundToMatches(robotNextRound);
      const clubsFromStandings = robotData.standings.map((row) => ({ team: row.team, logo: row.logo }));
      const clubGrid = enrichClubGrid(clubsFromStandings);

      setData({
        season: 2026,
        title: "Brasileirão Série B",
        matches: robotMatches,
        standings: robotData.standings,
        clubGrid,
        totals: {
          matches: robotMatches.length,
          completed: robotMatches.filter((m) => isDoneStatus(m.status)).length,
          live: robotMatches.filter((m) => isLiveStatus(m.status)).length,
          upcoming: robotMatches.filter((m) => !isDoneStatus(m.status)).length,
          clubs: robotData.standings.length,
        },
        updatedAt: robotData.updatedAt || new Date().toISOString(),
      });
      setTopScorers(robotData.topScorers || []);
      setNextRound(robotNextRound);
      setRobotInfo(robotData.robot || null);
    } catch {
      setData(buildInternalDashboard());
      setTopScorers([]);
      setNextRound([]);
      setRobotInfo(null);
      setError("Robô Brasileirão Série B Master indisponível.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const clubs = useMemo(() => enrichClubGrid(data?.clubGrid), [data]);

  useEffect(() => {
    if (!data?.standings?.length) return;
    const available = enrichClubGrid(data.standings.map((row) => ({ team: row.team, logo: row.logo })));
    if (available.length < 2) return;
    const selectedAStillExists = selectedClubA && available.some((club) => masterClubKey(club.team) === masterClubKey(selectedClubA.name));
    const selectedBStillExists = selectedClubB && available.some((club) => masterClubKey(club.team) === masterClubKey(selectedClubB.name));
    if (!selectedAStillExists) setSelectedClubA({ name: available[0].team, logo: available[0].logo });
    if (!selectedBStillExists) {
      const second = available.find((club) => masterClubKey(club.team) !== masterClubKey(available[0].team)) || available[1];
      setSelectedClubB({ name: second.team, logo: second.logo });
    }
  }, [data?.standings?.length]);

  const nextMatch = (data?.matches || []).find((match) => !isDoneStatus(match.status));
  const bestRoundMatch = useMemo(() => pickBestRoundMatch(data?.matches || [], data?.standings || []), [data]);

  const rounds = useMemo(() => {
    const set = new Set((data?.matches || []).map((match) => match.round).filter(Boolean));
    return Array.from(set).slice(0, 38);
  }, [data]);

  const filteredMatches = useMemo(() => {
    const source = tab === "resultados"
      ? (data?.matches || []).filter((match) => isDoneStatus(match.status))
      : tab === "ao-vivo"
        ? (data?.matches || []).filter((match) => isLiveStatus(match.status))
        : (data?.matches || []);

    const q = query.trim().toLowerCase();
    return source.filter((match) => {
      const text = `${match.home} ${match.away} ${match.round} ${match.city || ""}`.toLowerCase();
      return (!q || text.includes(q)) && (round === "all" || match.round === round);
    });
  }, [data, tab, query, round]);

  const groupedByRound = useMemo(() => {
    return filteredMatches.reduce<Record<string, Match[]>>((acc, match) => {
      const key = match.round || "Rodada";
      acc[key] = acc[key] || [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [filteredMatches]);

  return (
    <PremiumAppShell>
      {loading ? <AnalysisProcessLoader title="Carregando Brasileirão Série B..." message="Buscando snapshot validado do Robô Brasileirão Série B Master." /> : null}

      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[1.35rem] border border-emerald-400/30 bg-[#030907] p-3 shadow-[0_0_70px_rgba(16,185,129,0.12)] sm:p-4 md:rounded-[1.5rem] md:p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.20),transparent_28%),radial-gradient(circle_at_12%_90%,rgba(16,185,129,0.18),transparent_33%),linear-gradient(120deg,#020805,#061510,#020506)]" />
          <div className="absolute -right-8 top-8 h-48 w-48 rounded-full border border-yellow-400/15 bg-yellow-400/[0.035]" />

          <div className="relative z-10 grid gap-4 md:gap-7 xl:grid-cols-[1fr_minmax(280px,390px)_260px] xl:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-yellow-300">
                <Trophy className="h-4 w-4" /> Brasileirão Série B 2026
              </p>
              <h1 className="mt-2 text-2xl font-black text-white sm:mt-3 sm:text-4xl md:text-5xl">
                BRASILEIRÃO <span className="text-yellow-400">SÉRIE B</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300 sm:mt-3 sm:text-base">
                Classificação, rodadas, análise IA, histórico dos últimos 10 jogos e probabilidades por confronto.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide sm:mt-4 sm:gap-2 sm:text-[11px]">
                <span className="rounded-full bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-white">Brasil</span>
                <span className="rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-slate-900">20 clubes</span>
                <span className="rounded-full bg-yellow-400 px-3 py-1.5 sm:px-4 sm:py-2 text-black">Master Série B</span>
              </div>
              {nextMatch ? (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs sm:mt-4 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs font-bold text-slate-200">
                  <CalendarDays className="h-4 w-4 text-yellow-300" /> Próximo jogo: <span className="truncate text-white">{nextMatch.home} x {nextMatch.away}</span>
                </div>
              ) : null}
            </div>

            <BestRoundMatchCard match={bestRoundMatch} standings={data?.standings || []} onAnalyze={(match) => {
              setSelectedClubA({ name: match.home, logo: match.homeLogo });
              setSelectedClubB({ name: match.away, logo: match.awayLogo });
              setTab("analise");
            }} />

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <HeroStat label="Jogos" value={String(data?.totals.matches || "--")} icon={<CalendarDays />} />
              <HeroStat label="Ao vivo" value={String(data?.totals.live ?? "--")} icon={<Activity />} />
              <HeroStat label="Finalizados" value={String(data?.totals.completed ?? "--")} icon={<Trophy />} />
              <HeroStat label="Clubes" value={String(data?.totals.clubs || clubs.length)} icon={<Shield />} />
            </div>
          </div>
        </section>

        

        <GlassCard className="overflow-hidden p-0">
          <div className="sticky top-0 z-20 flex flex-col justify-between gap-3 border-b border-white/10 bg-[#050b08]/95 p-3 backdrop-blur md:flex-row md:items-center md:p-4">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {tabs.map((item) => (
                <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition sm:px-3 sm:py-2.5 sm:text-xs ${tab === item.id ? "bg-gradient-to-r from-green-500 to-yellow-400 text-black" : "border border-white/10 text-slate-200 hover:border-green-400/35"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-black sm:px-5 sm:py-3 sm:text-sm text-emerald-300 hover:bg-emerald-500/20">
              <RefreshCcw className="h-4 w-4" /> Atualizar
            </button>
          </div>

          {tab === "classificacao" ? (
            <StandingsTable rows={data?.standings || []} clubs={clubs} topScorers={topScorers} nextRound={nextRound} robotInfo={robotInfo} />
          ) : tab === "analise" ? (
            <BrasileiraoBAnalysis clubs={clubs} standings={data?.standings || []} selectedA={selectedClubA} selectedB={selectedClubB} onSelect={selectClubForAnalysis} />
          ) : (
            <div className="p-4 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar clube, estádio ou cidade" className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none focus:border-emerald-400" />
                </label>
                <select value={round} onChange={(event) => setRound(event.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-emerald-400">
                  <option value="all">Todas as rodadas</option>
                  {rounds.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedByRound).map(([roundName, games]) => (
                  <div key={roundName}>
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.23em] text-green-400">{roundName}</p>
                    <div className="space-y-3">{games.map((match) => <MatchRow key={match.fixtureId} match={match} />)}</div>
                  </div>
                ))}
                {!filteredMatches.length ? <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-slate-400">Nenhum jogo disponível nesta seleção. Clique em Atualizar para tentar carregar novamente.</div> : null}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}



function safePercent(value: unknown, fallback = 65) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function getRiskLevel(confidence: number) {
  if (confidence >= 78) return { label: "Baixo", className: "bg-emerald-500/10 text-emerald-300" };
  if (confidence >= 64) return { label: "Médio", className: "bg-yellow-400/10 text-yellow-300" };
  return { label: "Alto", className: "bg-red-500/10 text-red-300" };
}

function getBestMarketLabel(calc: ReturnType<typeof calculateAnalysis>) {
  if (calc.over15 >= calc.btts) return `🔥 Over 1.5 ${safePercent(calc.over15, 72)}%`;
  return `🔥 BTTS ${safePercent(calc.btts, 62)}%`;
}

function lastFiveIcons(history: TeamHistory) {
  const recent = history.last10.slice(-5);
  if (!recent.length) return <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-slate-500">sem dados reais</span>;
  return recent.map((r, i) => <span key={i}>{r === "W" ? "🟢" : r === "D" ? "🟡" : "🔴"}</span>);
}

function friendlyLeagueLabel(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "Brasileirão Série B 2026";
  if (/brasileir|serie-a|série a|bra\.1/i.test(text)) return "Brasileirão Série B 2026";
  return text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// V45: removido gerador de jogo inventado por ranking. Melhor partida só vem da grade real.

function matchQualityBonus(match: Match, standings: Standing[]) {
  const homeRank = standings.find((row) => masterClubKey(row.team) === masterClubKey(match.home))?.rank || 20;
  const awayRank = standings.find((row) => masterClubKey(row.team) === masterClubKey(match.away))?.rank || 20;
  const leagueBonus = /brasileir|série a|serie a/i.test(`${match.league} ${match.round}`) ? 12 : 0;
  const rankBonus = Math.max(0, 38 - homeRank - awayRank);
  return leagueBonus + rankBonus;
}

function pickBestRoundMatch(matches: Match[], standings: Standing[] = []) {
  const upcoming = matches.filter((match) => !isDoneStatus(match.status));
  const candidates = (upcoming.length ? upcoming : matches).filter((match) => match.home && match.away && match.date && match.time);
  const scored = candidates.map((match) => {
    const home = findClubHistory(match.home, standings);
    const away = findClubHistory(match.away, standings);
    const calc = calculateAnalysis(home, away);
    const balanceBonus = 100 - Math.abs(calc.homePct - calc.awayPct);
    const goalsBonus = calc.over15 + calc.btts;
    const bigGameBonus = (home.attack + away.attack + home.defense + away.defense) / 4;
    const rawScore = Math.round(balanceBonus * 0.30 + goalsBonus * 0.30 + bigGameBonus * 0.25 + matchQualityBonus(match, standings));
    const score = safePercent(rawScore, calc.confidence || 68);
    return { match, calc, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

function BestRoundMatchCard({ match, standings, onAnalyze }: { match: ReturnType<typeof pickBestRoundMatch>; standings: Standing[]; onAnalyze: (match: Match) => void }) {
  if (!match) {
    return <div className="rounded-2xl border border-yellow-400/20 bg-black/25 p-4 backdrop-blur sm:rounded-3xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">🔥 Melhor partida da rodada</p>
      <p className="mt-4 text-sm font-bold text-slate-400">A melhor partida será exibida assim que houver jogos disponíveis.</p>
    </div>;
  }
  const { match: game, calc } = match;
  const homeHistory = findClubHistory(game.home, standings);
  const awayHistory = findClubHistory(game.away, standings);
  const confidence = safePercent(calc.confidence || match.score, 68);
  const risk = getRiskLevel(confidence);
  const favoriteLabel = calc.favorite === "Equilíbrio" ? "🤝 Equilibrado" : `⭐ Favorito: ${calc.favorite}`;
  return (
    <div className="rounded-2xl border border-yellow-400/25 bg-black/25 p-3 backdrop-blur sm:rounded-3xl sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">Melhor partida da rodada</p>
        <div className="h-px flex-1 bg-gradient-to-r from-yellow-400/30 to-transparent" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">🤖 escolha automática da IA</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div className="min-w-0">
            <TeamLogo src={game.homeLogo} name={game.home} small />
            <p className="mt-2 truncate text-sm font-black text-white">{game.home}</p>
            <div className="mt-1 flex justify-center gap-1 text-sm">{lastFiveIcons(homeHistory)}</div>
          </div>
          <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-300">VS</div>
          <div className="min-w-0">
            <TeamLogo src={game.awayLogo} name={game.away} small />
            <p className="mt-2 truncate text-sm font-black text-white">{game.away}</p>
            <div className="mt-1 flex justify-center gap-1 text-sm">{lastFiveIcons(awayHistory)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
          <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">📅 {formatMatchDate(game.date)}</span>
          <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">⏰ {game.time || "A confirmar"}</span>
          <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">🏟️ {game.stadium || "Estádio a confirmar"}</span>
          <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">🏆 {friendlyLeagueLabel(game.league || game.round)}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black sm:grid-cols-4">
          <span className="rounded-xl bg-emerald-500/10 px-2 py-2 text-emerald-300">Confiança IA {confidence}%</span>
          <span className={`${risk.className} rounded-xl px-2 py-2`}>Risco {risk.label}</span>
          <span className="rounded-xl bg-blue-500/10 px-2 py-2 text-blue-300">{favoriteLabel}</span>
          <span className="rounded-xl bg-yellow-400/10 px-2 py-2 text-yellow-300">{getBestMarketLabel(calc)}</span>
        </div>

        <button type="button" onClick={() => onAnalyze(game)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-yellow-400 px-4 py-3 text-xs font-black uppercase text-black hover:brightness-110">
          Analisar agora <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ClubStrip({ clubs, selectedA, selectedB, onSelect }: { clubs: Club[]; selectedA?: string; selectedB?: string; onSelect: (club: ClubOption) => void }) {
  const visibleClubs = enrichClubGrid(clubs);
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-black/25 p-3 backdrop-blur sm:rounded-3xl sm:p-4">
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <Shield className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">Todos os clubes</p>
        <div className="h-px flex-1 bg-gradient-to-r from-yellow-400/30 to-transparent" />
      </div>
      <div className="grid max-h-[168px] grid-cols-5 gap-1.5 overflow-hidden sm:max-h-[220px] sm:grid-cols-8 sm:gap-2 xl:grid-cols-8 2xl:grid-cols-10">
        {visibleClubs.map((club) => {
          const selected = selectedA === club.team || selectedB === club.team;
          return (
            <button key={club.team} type="button" title={club.team} onClick={() => onSelect({ name: club.team, logo: club.logo })} className={`group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-black/20 transition hover:scale-105 hover:border-yellow-400 ${selected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/10"}`}>
              <TeamLogo src={club.logo} name={club.team} small />
              <span className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center rounded-md border border-yellow-400/40 bg-black/85 px-1 text-center text-[10px] font-black leading-tight text-white shadow-xl group-hover:flex">{club.team}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => visibleClubs[0] && onSelect({ name: visibleClubs[0].team, logo: visibleClubs[0].logo })} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs sm:mt-5 sm:px-3 sm:py-2.5 sm:text-xs font-black text-slate-200 hover:border-yellow-400/30">
        <span><span className="text-yellow-400">{visibleClubs.length}</span> clubes do Robô Master</span><span className="text-yellow-400">›</span>
      </button>
    </div>
  );
}

function BrasileiraoBAnalysis({ clubs, standings, selectedA, selectedB, onSelect }: { clubs: Club[]; standings: Standing[]; selectedA: ClubOption | null; selectedB: ClubOption | null; onSelect: (club: ClubOption) => void }) {
  const analysisClubs = clubs.length ? clubs : standings.map((row) => ({ team: row.team, logo: row.logo }));
  const autoA = selectedA || (analysisClubs[0] ? { name: analysisClubs[0].team, logo: analysisClubs[0].logo } : null);
  const autoB = selectedB || (analysisClubs.find((club) => masterClubKey(club.team) !== masterClubKey(autoA?.name || "")) ? { name: analysisClubs.find((club) => masterClubKey(club.team) !== masterClubKey(autoA?.name || ""))!.team, logo: analysisClubs.find((club) => masterClubKey(club.team) !== masterClubKey(autoA?.name || ""))!.logo } : null);
  const ready = Boolean(autoA && autoB);
  const a = ready && autoA ? findClubHistory(autoA.name, standings) : null;
  const b = ready && autoB ? findClubHistory(autoB.name, standings) : null;
  const calc = ready && a && b ? calculateAnalysis(a, b) : null;

  return (
    <div className="p-3 md:p-4">
      <div className="mb-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4">
        <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">ANÁLISE IA DO CONFRONTO</p>
            <p className="mt-1 text-sm font-bold text-slate-400">Selecione dois clubes para gerar relatório, últimos 10 jogos, gols marcados, gols sofridos e probabilidades.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-xl border border-green-400/25 bg-green-500/10 px-3 py-2 text-green-300">Clube A: {autoA?.name || "Selecionar"}</span>
            <span className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-yellow-300">Clube B: {autoB?.name || "Selecionar"}</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 sm:gap-2 md:grid-cols-8 lg:grid-cols-10">
          {analysisClubs.length ? analysisClubs.map((club) => {
            const selected = selectedA?.name === club.team || selectedB?.name === club.team;
            return <button key={club.team} type="button" title={club.team} onClick={() => onSelect({ name: club.team, logo: club.logo })} className={`group relative flex aspect-square items-center justify-center rounded-lg border bg-black/35 p-1.5 transition sm:rounded-xl sm:p-2 hover:-translate-y-0.5 hover:border-yellow-400 ${selected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/10"}`}><TeamLogo src={club.logo} name={club.team} small /><span className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center rounded-xl border border-yellow-400/40 bg-black/85 px-2 text-center text-[11px] font-black leading-tight text-white shadow-xl group-hover:flex">{club.team}</span></button>;
          }) : <div className="col-span-full rounded-xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-slate-400">Robô Master Série B sem clubes validados no momento. Clique em Atualizar para carregar novamente.</div>}
        </div>
      </div>

      {ready && a && b && calc ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-400/20 bg-black/30 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">Análise IA do confronto</p>
              <p className="text-xs font-black text-slate-500">Base: dados validados pelo Robô Master</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <TeamReport name={autoA!.name} logo={autoA!.logo} history={a} />
              <div className="text-center text-3xl font-black text-yellow-400">VS</div>
              <TeamReport name={autoB!.name} logo={autoB!.logo} history={b} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <MiniStat label="Favorito" value={calc.favorite} />
              <MiniStat label="Confiança" value={`${calc.confidence}%`} />
              <MiniStat label="Over 1.5" value={`${calc.over15}%`} />
              <MiniStat label="Ambas marcam" value={`${calc.btts}%`} />
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.035] p-5">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-yellow-300">Probabilidade do confronto</p>
            <ProbabilityBar label={`Vitória ${autoA!.name}`} value={calc.home} />
            <ProbabilityBar label="Empate" value={calc.draw} />
            <ProbabilityBar label={`Vitória ${autoB!.name}`} value={calc.away} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-green-300">Comparação completa</p>
              <CompareLine label="Ataque" left={a.attack} right={b.attack} leftName={autoA!.name} rightName={autoB!.name} />
              <CompareLine label="Defesa" left={a.defense} right={b.defense} leftName={autoA!.name} rightName={autoB!.name} />
              <CompareLine label="Forma" left={calc.formA} right={calc.formB} leftName={autoA!.name} rightName={autoB!.name} />
            </div>
            <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.055] p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">🔥 Melhor oportunidade</p>
              <h3 className="mt-4 text-2xl font-black text-white">{calc.bestMarket}</h3>
              <p className="mt-2 font-black text-yellow-300">Confiança: {calc.marketConfidence}%</p>
              <p className="mt-4 text-sm font-bold leading-relaxed text-slate-400">Justificativa: {autoA!.name} marcou {a.goalsFor} gols e sofreu {a.goalsAgainst}; {autoB!.name} marcou {b.goalsFor} gols e sofreu {b.goalsAgainst} nos últimos 10 jogos cadastrados.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Como a IA calculou</p>
            <p className="mt-3 text-sm font-bold leading-relaxed text-slate-300">A análise usa somente o snapshot validado do Robô Brasileirão Série B Master: classificação, gols, saldo, forma recente real/cache e próximos jogos oficiais.</p>
          </div>
        </div>
      ) : <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-slate-400">Selecione Time A e Time B para gerar a análise IA do Brasileirão.</p>}
    </div>
  );
}

function calculateAnalysis(a: TeamHistory, b: TeamHistory) {
  const score = (h: TeamHistory) => h.attack * 0.35 + h.defense * 0.30 + formScore(h) * 0.35;
  const aScore = score(a);
  const bScore = score(b);
  const total = aScore + bScore + 56;
  const home = Math.round((aScore / total) * 100);
  const away = Math.round((bScore / total) * 100);
  const draw = Math.max(20, 100 - home - away);
  const adjustedHome = Math.max(20, Math.min(55, home));
  const adjustedAway = Math.max(20, Math.min(55, away));
  const adjustedDraw = 100 - adjustedHome - adjustedAway;
  const over15 = Math.min(88, Math.round(((a.goalsFor + b.goalsFor) / 20) * 38 + 30));
  const btts = Math.min(82, Math.round(((a.goalsFor + b.goalsFor + a.goalsAgainst + b.goalsAgainst) / 40) * 42 + 25));
  return {
    home: adjustedHome,
    draw: adjustedDraw,
    away: adjustedAway,
    favorite: Math.abs(aScore - bScore) < 4 ? "Equilíbrio" : aScore > bScore ? a.team : b.team,
    confidence: Math.min(89, Math.round(58 + Math.abs(aScore - bScore) / 2)),
    over15,
    btts,
    bestMarket: over15 >= btts ? "Over 1.5 gols" : "Ambas marcam",
    marketConfidence: Math.max(over15, btts),
    formA: formScore(a),
    formB: formScore(b),
  };
}

function formScore(h: TeamHistory) {
  if (!h.last10.length) {
    const attackPart = safePercent(h.attack, 50);
    const defensePart = safePercent(h.defense, 50);
    return Math.round((attackPart + defensePart) / 2);
  }
  const maxPoints = Math.max(3, h.last10.length * 3);
  const points = h.last10.reduce((acc, item) => acc + (item === "W" ? 3 : item === "D" ? 1 : 0), 0);
  return Math.round((points / maxPoints) * 100);
}

function TeamReport({ name, logo, history }: { name: string; logo?: string; history: TeamHistory }) {
  const wins = history.last10.filter((x) => x === "W").length;
  const draws = history.last10.filter((x) => x === "D").length;
  const losses = history.last10.filter((x) => x === "L").length;
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-3"><TeamLogo src={logo} name={name} /><div><p className="text-[10px] font-black uppercase text-slate-500">Clube</p><p className="text-xl font-black text-white">{name}</p></div></div><div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Últimos 10 jogos</p><div className="mt-2 flex gap-1 text-lg">{history.last10.length ? history.last10.map((r, i) => <span key={i}>{r === "W" ? "🟢" : r === "D" ? "🟡" : "🔴"}</span>) : <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-slate-500">forma em atualização</span>}</div><p className="mt-2 font-black text-slate-200">{wins}V • {draws}E • {losses}D</p><p className="mt-1 text-sm font-bold text-slate-500">{history.goalsFor} gols marcados • {history.goalsAgainst} sofridos</p><p className="mt-3 text-sm font-bold text-slate-400">{history.moment}</p></div></div>;
}

function ProbabilityBar({ label, value }: { label: string; value: number }) {
  return <div className="mb-3"><div className="mb-1 flex justify-between text-sm font-black text-slate-200"><span>{label}</span><span className="text-yellow-300">{value}%</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-yellow-400" style={{ width: `${value}%` }} /></div></div>;
}

function CompareLine({ label, left, right, leftName, rightName }: { label: string; left: number; right: number; leftName: string; rightName: string }) {
  return <div className="mb-5"><div className="mb-2 flex justify-between text-xs font-black uppercase text-slate-500"><span>{label}</span><span>{left}% x {right}%</span></div><div className="grid grid-cols-2 gap-2"><div><p className="mb-1 text-sm font-black text-white">{leftName}</p><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${left}%` }} /></div></div><div><p className="mb-1 text-right text-sm font-black text-white">{rightName}</p><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${right}%` }} /></div></div></div></div>;
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-yellow-400">{value}</p></div>;
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur sm:rounded-2xl sm:p-4"><div className="text-yellow-400">{icon}</div><p className="mt-2 text-[10px] font-bold uppercase text-slate-400 sm:mt-3 sm:text-xs">{label}</p><p className="mt-1 text-xl font-black text-white sm:text-3xl" title={value}>{value}</p></div>;
}

function openMatchChat(match: Match) {
  const fixture = String(match.fixtureId || `${match.home}-${match.away}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  window.dispatchEvent(new CustomEvent("tap-open-live-chat", { detail: { roomId: `match:${fixture}`, roomLabel: `Sala ${match.home} x ${match.away}`, matchLabel: `${match.elapsed ? `${match.elapsed}' • ` : ""}${match.home} ${match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`} ${match.away}`, fixtureId: fixture } }));
}

function formatMatchDate(date: string) {
  if (!date) return "Data a confirmar";
  try {
    const [year, month, day] = date.slice(0, 10).split("-").map(Number);
    const parsed = new Date(year, (month || 1) - 1, day || 1);
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(parsed).replace(".", "");
  } catch {
    return date;
  }
}

function matchTimeLabel(match: { status?: string; elapsed?: number | null; time?: string }) {
  if (isLiveStatus(match.status)) return match.elapsed ? `${match.elapsed}' AO VIVO` : "AO VIVO";
  if (isDoneStatus(match.status)) return "FINALIZADO";
  return match.time || "A confirmar";
}

function MatchRow({ match }: { match: Match }) {
  const live = isLiveStatus(match.status);
  const done = isDoneStatus(match.status);
  const score = match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`;
  const query = `/match-center?fixture=${encodeURIComponent(match.fixtureId)}&home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`;
  return <div className="grid items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 transition hover:border-green-400/30 md:grid-cols-[150px_1fr_120px]"><div><p className="text-xs font-bold uppercase text-slate-500">{match.round}</p><p className="mt-1 text-xs font-black uppercase text-yellow-300">{formatMatchDate(match.date)}</p><p className={`mt-1 font-black ${live ? "text-red-400" : done ? "text-emerald-300" : "text-green-400"}`}>{live ? `${match.elapsed || "AO"}' AO VIVO` : done ? "Finalizado" : match.time}</p>{match.city ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{match.city}</p> : null}</div><div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm font-black text-white"><TeamLogo src={match.homeLogo} name={match.home} small /><span>{match.home}</span><span className={`rounded-md px-2.5 py-1.5 text-base ${live ? "bg-red-500/15 text-red-400" : done ? "bg-green-500/15 text-green-300" : "bg-yellow-400/10 text-yellow-400"}`}>{score}</span><span>{match.away}</span><TeamLogo src={match.awayLogo} name={match.away} small /></div><div className="flex flex-col gap-2"><Status status={match.status} elapsed={match.elapsed} /><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openMatchChat(match); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-yellow-400/25 px-2.5 py-1.5 text-xs font-black text-yellow-300 hover:bg-yellow-400/10">💬 Chat</button><Link href={query} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-400/25 px-2.5 py-1.5 text-xs font-black text-green-300 hover:bg-green-400/10">Abrir <ArrowRight className="h-3.5 w-3.5" /></Link></div></div>;
}


function zoneInfo(rank: number) {
  if (rank <= 4) return { label: "Acesso Série A", row: "border-l-4 border-l-slate-600", badge: "bg-slate-600 text-white" };
  if (rank <= 8) return { label: "Briga pelo acesso", row: "border-l-4 border-l-slate-600", badge: "bg-slate-600 text-white" };
  if (rank >= 17) return { label: "Rebaixamento", row: "border-l-4 border-l-slate-600", badge: "bg-slate-600 text-white" };
  return { label: "Meio da tabela", row: "border-l-4 border-l-white/10", badge: "bg-white/10 text-slate-300" };
}

function last5FromRow(row: Standing) {
  return formFromStanding(row) || [];
}

function brDateTime(value?: string) {
  if (!value) return "--";
  try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
}

function StandingsTable({ rows, clubs, topScorers, nextRound, robotInfo }: { rows: Standing[]; clubs: Club[]; topScorers: BrasileiraoTopScorer[]; nextRound: BrasileiraoNextMatch[]; robotInfo?: BrasileiraoTableRobotResponse["robot"] | null }) {
  const source = rows.length ? rows : [];
  const scorers = topScorers;
  const upcoming = nextRound.length ? nextRound : [];
  const liveTeams = new Set(nextRound.filter((match) => isLiveStatus(match.status)).flatMap((match) => [masterClubKey(match.home), masterClubKey(match.away)]));
  return <div className="p-3 md:p-4">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3 text-left">Posição / Clube</th><th>Últimos 5</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr></thead>
        <tbody>{source.length ? source.map((row) => { const zone = zoneInfo(row.rank); const last5 = last5FromRow(row); const liveNow = liveTeams.has(masterClubKey(row.team)); return <tr key={row.team} className={`border-t border-white/[0.06] ${zone.row} ${liveNow ? "animate-pulse bg-emerald-500/[0.08] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]" : ""}`}><td className="py-3 pl-2"><span className="flex items-center gap-3 font-bold text-white"><span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black ${liveNow ? "bg-emerald-400 text-black" : zone.badge}`}>{row.rank}</span><TeamLogo src={row.logo} name={row.team} small /><span><span className="flex items-center gap-2 text-base">{row.team}{liveNow ? <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">● Ao vivo</span> : null}</span><span className="text-[10px] font-black uppercase text-slate-500">{liveNow ? "Jogando agora" : zone.label}</span></span></span></td><td className="text-center"><span className="inline-flex gap-1 text-base">{last5.length ? last5.map((r, i) => <span key={i}>{r === "W" ? "🟢" : r === "D" ? "🟡" : "🔴"}</span>) : <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-slate-500">buscando</span>}</span></td><td className="text-center text-slate-300">{row.played}</td><td className="text-center text-slate-300">{row.win}</td><td className="text-center text-slate-300">{row.draw}</td><td className="text-center text-slate-300">{row.lose}</td><td className="text-center text-slate-300">{row.goalsFor}</td><td className="text-center text-slate-300">{row.goalsAgainst}</td><td className="text-center text-slate-300">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}</td><td className="text-center text-lg font-black text-yellow-400">{row.points}</td></tr>; }) : <tr><td colSpan={10} className="border-t border-white/[0.06] py-8 text-center text-sm font-bold text-slate-400">Classificação real indisponível no momento. O robô não vai exibir tabela inventada.</td></tr>}</tbody>
      </table>
    </div>
    <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold"><span className="rounded-full bg-green-500/15 px-3 py-2 text-green-300">🟢 Acesso Série A</span><span className="rounded-full bg-blue-500/15 px-3 py-2 text-blue-300">🔵 Briga pelo acesso</span><span className="rounded-full bg-emerald-500/15 px-3 py-2 text-emerald-300">● Jogando agora</span><span className="rounded-full bg-red-500/15 px-3 py-2 text-red-300">🔴 Rebaixamento</span></div>
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4"><h3 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">Artilharia do Brasileirão</h3><div className="mt-3 space-y-2">{scorers.length ? scorers.map((item) => <div key={`${item.rank}-${item.team}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-3"><span className="font-black text-white">{item.rank}. {item.player} <span className="text-slate-500">• {item.team}</span></span><span className="rounded-lg bg-yellow-400 px-3 py-1 text-sm font-black text-black">{item.goals} gols</span></div>) : <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-slate-400">Artilharia real indisponível no momento.</p>}</div></div>
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-4"><h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Rodada / Ao vivo Série B</h3><div className="mt-3 space-y-2">{upcoming.length ? upcoming.slice(0, 6).map((match) => <div key={match.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white"><span className="flex items-center gap-2"><TeamLogo src={match.homeLogo} name={match.home} small />{match.home}</span><span className={`${isLiveStatus(match.status) ? "text-red-300 animate-pulse" : isDoneStatus(match.status) ? "text-emerald-300" : "text-yellow-300"}`}>{matchTimeLabel(match)}</span><span className="flex items-center gap-2">{match.away}<TeamLogo src={match.awayLogo} name={match.away} small /></span></div>) : <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-slate-400">Próxima rodada indisponível no momento.</p>}</div></div>
    </div>
  </div>;
}

function TeamLogo({ src, name, small = false }: { src?: string; name: string; small?: boolean }) {
  const proxyLogo = mappedBrasileiraoLogo(name);
  const withVersion = (url?: string) => url && url.startsWith("/api/brasileirao/logo/") ? `${url}?v=23` : url;
  const candidates = useMemo(() => Array.from(new Set([withVersion(proxyLogo), withVersion(src)].filter(Boolean) as string[])), [proxyLogo, src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [name, src, proxyLogo]);
  const boxClass = small ? "h-12 w-12" : "h-20 w-20";
  const imageClass = small ? "h-10 w-10" : "h-16 w-16";
  const currentSrc = candidates[candidateIndex];

  if (!currentSrc) {
    return <div className={`${boxClass} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-yellow-400/20 bg-black/20 text-[10px] font-black text-yellow-300`}>{name.slice(0, 3).toUpperCase()}</div>;
  }

  return (
    <span className={`${boxClass} flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent`}>
      <img
        key={`${name}-${currentSrc}`}
        src={currentSrc}
        alt={name}
        className={`${imageClass} object-contain drop-shadow-lg`}
        style={{ maxWidth: small ? 42 : 66, maxHeight: small ? 42 : 66 }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setCandidateIndex((index) => Math.min(index + 1, candidates.length))}
      />
    </span>
  );
}


function Status({ status, elapsed }: { status: string; elapsed: number | null }) {
  if (isLiveStatus(status)) return <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-center text-xs font-black text-red-300">{elapsed ? `${elapsed}' • AO VIVO` : "AO VIVO"}</p>;
  if (isDoneStatus(status)) return <p className="rounded-lg border border-green-400/20 bg-green-500/10 px-3 py-2 text-center text-xs font-black text-green-300">FINALIZADO</p>;
  return <p className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-center text-xs font-black text-yellow-300">AGENDADO</p>;
}


// BRASILEIRAO_ESCUDOS_SEM_FUNDO_BRANCO_V3: escudos transparentes, maiores e sem bolacha branca.

// BRASILEIRAO_GRADE_PROXIMOS_JOGOS_V4: Grade de jogos carregada pelo robô público e exibida na aba Grade de jogos.

// BRASILEIRAO_V8_MELHOR_PARTIDA_IA_SEM_NAN: corrige IA NaN, adiciona favorito, risco, ultimos 5 e melhor mercado.
// BRASILEIRAO_V9_ESCUDOS_REAIS_PROXY: restaura escudos em classificacao, analise IA, melhor partida e proximos jogos usando proxy local sem cair no Shield amarelo.
