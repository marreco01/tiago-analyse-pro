import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Flag,
  Globe2,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";

type Tab = "games" | "groups" | "teams" | "knockout" | "results";

type Match = {
  fixtureId: string;
  date: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  round: string;
  stadium?: string;
  city?: string;
};

type GroupRow = {
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
};

type Group = { name: string; rows: GroupRow[] };

type Dashboard = {
  season: number;
  title: string;
  matches: Match[];
  groupGames: Match[];
  knockout: Match[];
  groups: Group[];
  totals: { matches: number; completed: number; live: number; upcoming: number; groups: number };
  updatedAt: string;
};

type ApiResponse = { success: boolean; dashboard?: Dashboard; error?: string };
type TeamOption = { name: string; logo?: string };

type TeamAnalysis = {
  name: string;
  logo?: string;
  group?: string;
  rank?: number;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  matches: Match[];
  nextMatch?: Match;
  lastMatch?: Match;
  attackLevel: "Baixo" | "Médio" | "Alto";
  defenseLevel: "Baixo" | "Médio" | "Alto";
  moment: "Aguardando estreia" | "Em evolução" | "Regular" | "Forte";
  confidence: number;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "games", label: "Grade de jogos" },
  { id: "groups", label: "Grupos" },
  { id: "teams", label: "Análise de times" },
  { id: "knockout", label: "Mata-mata" },
  { id: "results", label: "Resultados" },
];

export default function WorldCup() {
  const [tab, setTab] = useState<Tab>("games");
  const [data, setData] = useState<Dashboard | null>(null);
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeamA, setSelectedTeamA] = useState<TeamOption | null>(null);
  const [selectedTeamB, setSelectedTeamB] = useState<TeamOption | null>(null);

  function selectWorldCupTeam(team: TeamOption) {
    setTab("teams");
    setSearch("");
    if (!selectedTeamA || (selectedTeamA.name && selectedTeamB)) {
      setSelectedTeamA(team);
      setSelectedTeamB(null);
      return;
    }
    if (selectedTeamA.name === team.name) return;
    setSelectedTeamB(team);
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/football/world-cup", { cache: "no-store" });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success || !json.dashboard) throw new Error(json.error || "Não foi possível carregar a competição.");
      setData(json.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Copa do Mundo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredMatches = useMemo(() => {
    if (!data) return [];
    const source = tab === "results"
      ? data.matches.filter((match) => ["FT", "AET", "PEN"].includes(match.status))
      : tab === "knockout"
        ? data.knockout
        : data.matches;
    const query = search.trim().toLowerCase();
    return source.filter((match) => {
      const matchesStage = stage === "all" || stageKey(match.round) === stage;
      const matchesText = !query || `${match.home} ${match.away} ${match.round} ${match.city || ""}`.toLowerCase().includes(query);
      return matchesStage && matchesText;
    });
  }, [data, tab, stage, search]);


  const teamAnalyses = useMemo(() => buildTeamAnalyses(data), [data]);
  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teamAnalyses;
    return teamAnalyses.filter((team) => `${team.name} ${team.group || ""}`.toLowerCase().includes(query));
  }, [teamAnalyses, search]);

  const groupedByDate = useMemo(() => {
    return filteredMatches.reduce<Record<string, Match[]>>((acc, match) => {
      const key = new Date(match.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
      acc[key] = acc[key] || [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [filteredMatches]);

  const worldCupTeams = useMemo(() => {
    const teamsMap = new Map<string, { name: string; logo?: string }>();

    (data?.groups || []).forEach((group) => {
      group.rows.forEach((row) => {
        if (row.team) teamsMap.set(row.team, { name: row.team, logo: row.logo });
      });
    });

    (data?.matches || []).forEach((match) => {
      if (match.home) teamsMap.set(match.home, { name: match.home, logo: match.homeLogo });
      if (match.away) teamsMap.set(match.away, { name: match.away, logo: match.awayLogo });
    });

    return [...teamsMap.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 48);
  }, [data]);

  return (
    <PremiumAppShell>
      {loading ? <AnalysisProcessLoader title="Carregando Copa do Mundo..." message="Buscando calendário, grupos e resultados da competição." /> : null}

      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[1.35rem] border border-emerald-400/30 bg-[#030907] p-3 shadow-[0_0_70px_rgba(16,185,129,0.12)] sm:p-4 md:rounded-[2rem] md:p-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.20),transparent_28%),radial-gradient(circle_at_12%_90%,rgba(16,185,129,0.18),transparent_33%),linear-gradient(120deg,#020805,#061510,#020506)]" />
          <div className="absolute -right-8 top-8 h-48 w-48 rounded-full border border-yellow-400/15 bg-yellow-400/[0.035]" />
          <div className="absolute right-10 top-20 h-28 w-28 rounded-full border border-white/10" />

          <div className="relative z-10 grid gap-4 md:gap-7 xl:grid-cols-[1fr_minmax(360px,520px)_340px] xl:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-yellow-300">
                <Globe2 className="h-4 w-4" /> Especial 2026
              </p>
              <h1 className="mt-3 text-2xl font-black text-white sm:mt-5 sm:text-5xl md:text-6xl">
                COPA DO <span className="text-yellow-400">MUNDO</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300 sm:mt-3 sm:text-base">
                Jogos, grupos, mata-mata e resultados em uma área exclusiva do Analyse Pro.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide sm:mt-7 sm:gap-3 sm:text-xs">
                <span className="rounded-full bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-white">Canadá</span>
                <span className="rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-slate-900">Estados Unidos</span>
                <span className="rounded-full bg-red-600 px-3 py-1.5 sm:px-4 sm:py-2 text-white">México</span>
              </div>
            </div>

            <WorldCupFlags teams={worldCupTeams} selectedA={selectedTeamA?.name} selectedB={selectedTeamB?.name} onSelect={selectWorldCupTeam} />

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <HeroStat label="Jogos" value={String(data?.totals.matches ?? "--")} icon={<CalendarDays />} />
              <HeroStat label="Ao vivo" value={String(data?.totals.live ?? "--")} icon={<Activity />} />
              <HeroStat label="Finalizados" value={String(data?.totals.completed ?? "--")} icon={<Trophy />} />
              <HeroStat label="Grupos" value={String(data?.totals.groups ?? "--")} icon={<Flag />} />
            </div>
          </div>
        </section>

        {error ? (
          <GlassCard className="border-red-400/30 bg-red-500/10 p-5 text-sm font-bold text-red-200">{error}</GlassCard>
        ) : null}

        <GlassCard className="overflow-hidden p-0">
          <div className="sticky top-0 z-20 flex flex-col justify-between gap-3 border-b border-white/10 bg-[#050b08]/95 p-3 backdrop-blur md:flex-row md:items-center md:p-5">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setTab(item.id); setStage("all"); }}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition sm:px-4 sm:py-3 sm:text-sm ${
                    tab === item.id
                      ? "bg-gradient-to-r from-emerald-500 to-yellow-400 text-black"
                      : "border border-white/10 text-slate-200 hover:border-emerald-400/35"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-black sm:px-5 sm:py-3 sm:text-sm text-emerald-300 hover:bg-emerald-500/20">
              <RefreshCcw className="h-4 w-4" /> Atualizar
            </button>
          </div>

          {tab === "groups" ? (
            <GroupsView groups={data?.groups || []} />
          ) : tab === "teams" ? (
            <TeamsAnalysisView teams={filteredTeams} search={search} setSearch={setSearch} selectedA={selectedTeamA} selectedB={selectedTeamB} onSelect={selectWorldCupTeam} candidates={worldCupTeams} />
          ) : (
            <div className="p-4 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar seleção ou cidade"
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none focus:border-emerald-400"
                  />
                </label>
                {tab !== "results" ? (
                  <select value={stage} onChange={(event) => setStage(event.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-emerald-400">
                    <option value="all">Todas as fases</option>
                    <option value="group">Fase de grupos</option>
                    <option value="round32">16 avos</option>
                    <option value="round16">Oitavas</option>
                    <option value="quarter">Quartas</option>
                    <option value="semi">Semifinais</option>
                    <option value="third">3º lugar</option>
                    <option value="final">Final</option>
                  </select>
                ) : null}
              </div>

              <div className="space-y-5">
                {Object.entries(groupedByDate).map(([date, games]) => (
                  <div key={date}>
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.23em] text-emerald-400">{date}</p>
                    <div className="space-y-3">
                      {games.map((match) => <MatchRow key={match.fixtureId} match={match} />)}
                    </div>
                  </div>
                ))}
                {!filteredMatches.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
                    Nenhum jogo disponível nesta seleção.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col justify-between gap-3 border-emerald-400/20 bg-emerald-500/[0.04] p-5 text-sm text-slate-400 md:flex-row md:items-center">
          <p>Dados carregados pela API-Football para a Copa do Mundo 2026.</p>
          <p className="font-bold text-emerald-300">
            {data?.updatedAt ? `Atualizado às ${new Date(data.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function WorldCupFlags({ teams, selectedA, selectedB, onSelect }: { teams: TeamOption[]; selectedA?: string; selectedB?: string; onSelect: (team: TeamOption) => void }) {
  const flag = (code: string) => `https://flagcdn.com/w80/${code}.png`;

  const fallbackTeams = [
    { name: "Canadá", logo: flag("ca") },
    { name: "Estados Unidos", logo: flag("us") },
    { name: "México", logo: flag("mx") },
    { name: "Argentina", logo: flag("ar") },
    { name: "Brasil", logo: flag("br") },
    { name: "França", logo: flag("fr") },
    { name: "Alemanha", logo: flag("de") },
    { name: "Espanha", logo: flag("es") },
    { name: "Inglaterra", logo: "https://flagcdn.com/w80/gb-eng.png" },
    { name: "Portugal", logo: flag("pt") },
    { name: "Países Baixos", logo: flag("nl") },
    { name: "Bélgica", logo: flag("be") },
    { name: "Croácia", logo: flag("hr") },
    { name: "Itália", logo: flag("it") },
    { name: "Dinamarca", logo: flag("dk") },
    { name: "Uruguai", logo: flag("uy") },
    { name: "Suíça", logo: flag("ch") },
    { name: "Colômbia", logo: flag("co") },
    { name: "Japão", logo: flag("jp") },
    { name: "Senegal", logo: flag("sn") },
    { name: "Marrocos", logo: flag("ma") },
    { name: "Irã", logo: flag("ir") },
    { name: "Coreia do Sul", logo: flag("kr") },
    { name: "Austrália", logo: flag("au") },
    { name: "Arábia Saudita", logo: flag("sa") },
    { name: "Equador", logo: flag("ec") },
    { name: "Gana", logo: flag("gh") },
    { name: "Polônia", logo: flag("pl") },
    { name: "Tunísia", logo: flag("tn") },
    { name: "Sérvia", logo: flag("rs") },
    { name: "Noruega", logo: flag("no") },
    { name: "Ucrânia", logo: flag("ua") },
    { name: "Turquia", logo: flag("tr") },
    { name: "Suécia", logo: flag("se") },
    { name: "País de Gales", logo: "https://flagcdn.com/w80/gb-wls.png" },
    { name: "Catar", logo: flag("qa") },
    { name: "Costa Rica", logo: flag("cr") },
    { name: "Camarões", logo: flag("cm") },
    { name: "Egito", logo: flag("eg") },
    { name: "Costa do Marfim", logo: flag("ci") },
    { name: "África do Sul", logo: flag("za") },
    { name: "Paraguai", logo: flag("py") },
    { name: "Chile", logo: flag("cl") },
    { name: "Peru", logo: flag("pe") },
    { name: "Nova Zelândia", logo: flag("nz") },
    { name: "Jamaica", logo: flag("jm") },
    { name: "Panamá", logo: flag("pa") },
    { name: "Honduras", logo: flag("hn") },
  ];

  const visibleTeams = teams.length >= 12 ? teams.slice(0, 48) : fallbackTeams;

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-black/25 p-3 backdrop-blur sm:rounded-3xl sm:p-4">
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <Globe2 className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">Todas as seleções</p>
        <div className="h-px flex-1 bg-gradient-to-r from-yellow-400/30 to-transparent" />
      </div>

      <div className="grid max-h-[168px] grid-cols-6 gap-1.5 overflow-hidden sm:max-h-[220px] sm:grid-cols-10 sm:gap-2 xl:grid-cols-8 2xl:grid-cols-10">
        {visibleTeams.map((team) => {
          const selected = selectedA === team.name || selectedB === team.name;
          return (
          <button
            key={team.name}
            type="button"
            title={team.name}
            onClick={() => onSelect(team)}
            className={`group relative flex aspect-[1.45] items-center justify-center overflow-hidden rounded-md border bg-white shadow-[0_0_12px_rgba(0,0,0,0.20)] transition hover:scale-105 hover:border-yellow-400 ${selected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/10"}`}
          >
            {team.logo ? (
              <img
                src={team.logo}
                alt={team.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.parentElement?.classList.add("bg-slate-200");
                }}
              />
            ) : (
              <span className="px-1 text-center text-[9px] font-black text-slate-800">{team.name.slice(0, 3).toUpperCase()}</span>
            )}
            <span className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center rounded-md border border-yellow-400/40 bg-black/85 px-1 text-center text-[10px] font-black leading-tight text-white shadow-xl group-hover:flex">{team.name}</span>
          </button>
        );
        })}
      </div>

      <Link href="/world-cup?tab=groups" className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs sm:mt-5 sm:px-4 sm:py-3 sm:text-sm font-black text-slate-200 hover:border-yellow-400/30">
        <span><span className="text-yellow-400">{visibleTeams.length}</span> seleções rumo ao título</span>
        <span className="text-yellow-400">›</span>
      </Link>
    </div>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur sm:rounded-2xl sm:p-4">
      <div className="text-yellow-400">{icon}</div>
      <p className="mt-2 text-[10px] font-bold uppercase text-slate-400 sm:mt-3 sm:text-xs">{label}</p>
      <p className="mt-1 text-xl font-black text-white sm:text-3xl">{value}</p>
    </div>
  );
}

function openMatchChat(match: Match) {
  const fixture = String(match.fixtureId || `${match.home}-${match.away}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  window.dispatchEvent(new CustomEvent("tap-open-live-chat", {
    detail: {
      roomId: `match:${fixture}`,
      roomLabel: `Sala ${match.home} x ${match.away}`,
      matchLabel: `${match.elapsed ? `${match.elapsed}' • ` : ""}${match.home} ${match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`} ${match.away}`,
      fixtureId: fixture,
    },
  }));
}

function MatchRow({ match }: { match: Match }) {
  const live = ["1H", "2H", "HT", "LIVE", "ET"].includes(match.status);
  const done = ["FT", "AET", "PEN"].includes(match.status);
  const score = match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`;
  const query = `/match-center?fixture=${encodeURIComponent(match.fixtureId)}&home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`;

  return (
    <div className="grid items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-emerald-400/30 md:grid-cols-[150px_1fr_150px]">
      <div>
        <p className="text-xs font-bold uppercase text-slate-500">{match.round}</p>
        <p className="mt-1 font-black text-yellow-400">{match.time}</p>
        {match.city ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{match.city}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-center font-black text-white">
        <TeamLogo src={match.homeLogo} name={match.home} />
        <span>{match.home}</span>
        <span className={`rounded-lg px-3 py-2 text-lg ${live ? "bg-red-500/15 text-red-400" : done ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-400/10 text-yellow-400"}`}>{score}</span>
        <span>{match.away}</span>
        <TeamLogo src={match.awayLogo} name={match.away} />
      </div>
      <div className="flex flex-col gap-2">
        <Status status={match.status} elapsed={match.elapsed} />
        <button
          type="button"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); openMatchChat(match); }}
          data-chat-room-id={`match:${String(match.fixtureId || `${match.home}-${match.away}`).replace(/[^a-zA-Z0-9_-]/g, "-")}`}
          data-chat-room-label={`Sala ${match.home} x ${match.away}`}
          data-chat-match-label={`${match.home} ${score} ${match.away}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 px-3 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-400/10"
        >
          💬 Ativar chat
        </button>
        <Link href={query} className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/25 px-3 py-2 text-xs font-black text-yellow-300 hover:bg-yellow-400/10">
          Abrir jogo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}


function TeamsAnalysisView({ teams, search, setSearch, selectedA, selectedB, onSelect, candidates }: { teams: TeamAnalysis[]; search: string; setSearch: (value: string) => void; selectedA: TeamOption | null; selectedB: TeamOption | null; onSelect: (team: TeamOption) => void; candidates: TeamOption[] }) {
  const testTeams = candidates.length ? candidates : teams.map((team) => ({ name: team.name, logo: team.logo }));
  return (
    <div className="p-4 md:p-6">
      <SelectionTestPanel title="Modo teste: clique em 2 bandeiras para montar a análise" teams={testTeams} selectedA={selectedA} selectedB={selectedB} onSelect={onSelect} variant="world" />
      <HeadToHeadTest selectedA={selectedA} selectedB={selectedB} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar seleção para análise"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none focus:border-emerald-400"
          />
        </label>
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-xs font-black uppercase tracking-wide text-yellow-300">
          {teams.length} seleções analisadas
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {teams.map((team) => <TeamAnalysisCard key={team.name} team={team} />)}
      </div>

      {!teams.length ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
          Nenhuma seleção encontrada para análise.
        </div>
      ) : null}
    </div>
  );
}

function SelectionTestPanel({ title, teams, selectedA, selectedB, onSelect, variant }: { title: string; teams: TeamOption[]; selectedA: TeamOption | null; selectedB: TeamOption | null; onSelect: (team: TeamOption) => void; variant: "world" | "br" }) {
  return (
    <div className="mb-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4">
      <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">{title}</p>
          <p className="mt-1 text-sm font-bold text-slate-400">Passe o mouse para ver o nome. Clique primeiro no Time A e depois no Time B.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-emerald-300">A: {selectedA?.name || "Selecionar"}</span>
          <span className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-yellow-300">B: {selectedB?.name || "Selecionar"}</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {teams.map((team) => {
          const selected = selectedA?.name === team.name || selectedB?.name === team.name;
          return (
            <button
              key={team.name}
              type="button"
              title={team.name}
              onClick={() => onSelect(team)}
              className={`group relative flex aspect-square items-center justify-center rounded-xl border bg-black/35 p-1 transition hover:-translate-y-0.5 hover:border-yellow-400 ${selected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/10"}`}
            >
              <TeamLogo src={team.logo} name={team.name} />
              <span className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center rounded-xl border border-yellow-400/40 bg-black/85 px-2 text-center text-[11px] font-black leading-tight text-white shadow-xl group-hover:flex">{team.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeadToHeadTest({ selectedA, selectedB }: { selectedA: TeamOption | null; selectedB: TeamOption | null }) {
  const ready = selectedA && selectedB;
  const seed = ready ? (selectedA.name.length * 7 + selectedB.name.length * 5) : 0;
  const confidence = Math.min(87, 62 + (seed % 21));
  return (
    <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-black/30 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Análise rápida do confronto</p>
      {ready ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"><TeamLogo src={selectedA.logo} name={selectedA.name} /><p className="mt-2 font-black text-white">{selectedA.name}</p></div>
          <div className="text-center text-2xl font-black text-yellow-400">VS</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"><TeamLogo src={selectedB.logo} name={selectedB.name} /><p className="mt-2 font-black text-white">{selectedB.name}</p></div>
          <div className="md:col-span-3 grid gap-3 md:grid-cols-4">
            <MiniStat label="Favorito teste" value={seed % 2 === 0 ? selectedA.name : selectedB.name} />
            <MiniStat label="Confiança" value={`${confidence}%`} />
            <MiniStat label="Over 1.5" value={`${Math.min(91, confidence + 7)}%`} />
            <MiniStat label="Ambas marcam" value={`${Math.max(45, confidence - 9)}%`} />
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-slate-400">Selecione Time A e Time B para testar a análise sem depender da API.</p>
      )}
    </div>
  );
}

function TeamAnalysisCard({ team }: { team: TeamAnalysis }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/25 p-5 transition hover:border-yellow-400/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo src={team.logo} name={team.name} />
          <div>
            <h3 className="text-xl font-black text-white">{team.name}</h3>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {team.group ? `${team.group}${team.rank ? ` • ${team.rank}º lugar` : ""}` : "Seleção da Copa"}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase text-emerald-300">Confiança</p>
          <p className="text-2xl font-black text-white">{team.confidence}%</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        <MiniStat label="PTS" value={team.points} />
        <MiniStat label="J" value={team.played} />
        <MiniStat label="GP" value={team.goalsFor} />
        <MiniStat label="SG" value={team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <AnalysisPill icon={<TrendingUp className="h-4 w-4" />} label="Momento" value={team.moment} />
        <AnalysisPill icon={<Target className="h-4 w-4" />} label="Ataque" value={team.attackLevel} />
        <AnalysisPill icon={<ShieldCheck className="h-4 w-4" />} label="Defesa" value={team.defenseLevel} />
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <MatchSummary title="Próximo jogo" match={team.nextMatch} teamName={team.name} />
        <MatchSummary title="Último jogo" match={team.lastMatch} teamName={team.name} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-yellow-400">{value}</p>
    </div>
  );
}

function AnalysisPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-emerald-300">{icon}<span className="text-[10px] font-black uppercase tracking-wide">{label}</span></div>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function MatchSummary({ title, match, teamName }: { title: string; match?: Match; teamName: string }) {
  if (!match) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-500">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 font-bold">Sem jogo disponível</p>
      </div>
    );
  }

  const opponent = match.home === teamName ? match.away : match.home;
  const score = match.homeGoals == null || match.awayGoals == null ? "x" : `${match.homeGoals} x ${match.awayGoals}`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 font-black text-white">{opponent}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{match.time} • {score} • {match.round}</p>
    </div>
  );
}

function GroupsView({ groups }: { groups: Group[] }) {
  if (!groups.length) {
    return <div className="p-10 text-center text-slate-400">A classificação dos grupos ainda não foi retornada pela API.</div>;
  }

  return (
    <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-2">
      {groups.map((group) => (
        <div key={group.name} className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/25">
          <div className="border-b border-white/10 bg-emerald-500/10 px-5 py-4">
            <h3 className="font-black uppercase tracking-[0.18em] text-emerald-300">{group.name}</h3>
          </div>
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[410px] text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr><th className="pb-3 text-left">Seleção</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th></tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.team} className="border-t border-white/[0.06]">
                    <td className="py-3">
                      <span className="flex items-center gap-2 font-bold text-white">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${row.rank <= 2 ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-300"}`}>{row.rank}</span>
                        <TeamLogo src={row.logo} name={row.team} small />
                        {row.team}
                      </span>
                    </td>
                    <td className="text-center text-slate-300">{row.played}</td>
                    <td className="text-center text-slate-300">{row.win}</td>
                    <td className="text-center text-slate-300">{row.draw}</td>
                    <td className="text-center text-slate-300">{row.lose}</td>
                    <td className="text-center text-slate-300">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}</td>
                    <td className="text-center font-black text-yellow-400">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamLogo({ src, name, small = false }: { src?: string; name: string; small?: boolean }) {
  return (
    <img
      src={src || "/favicon.png"}
      alt={name}
      className={`${small ? "h-6 w-6" : "h-9 w-9"} rounded-full bg-white object-contain p-1`}
      onError={(event) => { event.currentTarget.src = "/favicon.png"; }}
    />
  );
}

function Status({ status, elapsed }: { status: string; elapsed: number | null }) {
  if (["1H", "2H", "HT", "LIVE", "ET"].includes(status)) {
    return <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-center text-xs font-black text-red-300">{elapsed ? `${elapsed}' • AO VIVO` : "AO VIVO"}</p>;
  }
  if (["FT", "AET", "PEN"].includes(status)) {
    return <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center text-xs font-black text-emerald-300">FINALIZADO</p>;
  }
  return <p className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-center text-xs font-black text-yellow-300">AGENDADO</p>;
}


function buildTeamAnalyses(data: Dashboard | null): TeamAnalysis[] {
  if (!data) return [];
  const teams = new Map<string, TeamAnalysis>();

  data.groups.forEach((group) => {
    group.rows.forEach((row) => {
      teams.set(row.team, {
        name: row.team,
        logo: row.logo,
        group: group.name,
        rank: row.rank,
        points: row.points,
        played: row.played,
        win: row.win,
        draw: row.draw,
        lose: row.lose,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalsDiff: row.goalsDiff,
        matches: [],
        attackLevel: levelFromAverage(row.played ? row.goalsFor / row.played : 0),
        defenseLevel: defensiveLevel(row.played ? row.goalsAgainst / row.played : 0),
        moment: row.played === 0 ? "Aguardando estreia" : row.win >= 2 ? "Forte" : row.points >= row.played ? "Regular" : "Em evolução",
        confidence: confidenceFromStats(row),
      });
    });
  });

  data.matches.forEach((match) => {
    [
      { name: match.home, logo: match.homeLogo },
      { name: match.away, logo: match.awayLogo },
    ].forEach((entry) => {
      if (!entry.name) return;
      if (!teams.has(entry.name)) {
        teams.set(entry.name, {
          name: entry.name,
          logo: entry.logo,
          points: 0,
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalsDiff: 0,
          matches: [],
          attackLevel: "Médio",
          defenseLevel: "Médio",
          moment: "Aguardando estreia",
          confidence: 50,
        });
      }
      teams.get(entry.name)?.matches.push(match);
    });
  });

  const now = Date.now();
  return [...teams.values()].map((team) => {
    const sorted = [...team.matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextMatch = sorted.find((match) => new Date(match.date).getTime() >= now && !["FT", "AET", "PEN"].includes(match.status));
    const lastMatch = [...sorted].reverse().find((match) => ["FT", "AET", "PEN"].includes(match.status));
    return { ...team, nextMatch, lastMatch };
  }).sort((a, b) => {
    if ((a.rank || 99) !== (b.rank || 99)) return (a.rank || 99) - (b.rank || 99);
    return b.confidence - a.confidence;
  }).slice(0, 48);
}

function levelFromAverage(value: number): "Baixo" | "Médio" | "Alto" {
  if (value >= 1.8) return "Alto";
  if (value >= 0.9) return "Médio";
  return "Baixo";
}

function defensiveLevel(value: number): "Baixo" | "Médio" | "Alto" {
  if (value <= 0.7) return "Alto";
  if (value <= 1.4) return "Médio";
  return "Baixo";
}

function confidenceFromStats(row: GroupRow): number {
  if (!row.played) return 50;
  const pointsRate = row.points / Math.max(row.played * 3, 1);
  const goalBalance = Math.max(-0.2, Math.min(0.2, row.goalsDiff / 10));
  return Math.max(35, Math.min(92, Math.round(50 + pointsRate * 35 + goalBalance * 100)));
}

function stageKey(round: string) {
  const value = round.toLowerCase();
  if (value.includes("group")) return "group";
  if (value.includes("round of 32")) return "round32";
  if (value.includes("round of 16")) return "round16";
  if (value.includes("quarter")) return "quarter";
  if (value.includes("semi")) return "semi";
  if (value.includes("third")) return "third";
  if (value.includes("final")) return "final";
  return "other";
}
