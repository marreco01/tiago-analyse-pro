import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Flag,
  LoaderCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
  Flame,
  Medal,
  Newspaper,
  BarChart3,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { fetchWorldCupRobot } from "@/lib/worldCupRobot";

type Tab = "overview" | "groups" | "games" | "knockout" | "analysis" | "master";

type Team = {
  code: string;
  name: string;
  group: string;
  flag: string;
};

type Match = {
  id: string;
  date: string;
  time: string;
  group?: string;
  stage: string;
  home: string;
  away: string;
  status: string;
  competition: "Copa 2026";
  homeGoals?: number | null;
  awayGoals?: number | null;
};

type Standing = {
  group: string;
  team: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type Analysis = {
  matchId: string;
  favorite: string;
  confidence: number;
  over15: number;
  over25: number;
  btts: number;
  corners: number;
  reason: string;
};

type WorldCupOpportunity = {
  matchId: string;
  home: string;
  away: string;
  date: string;
  time: string;
  market: string;
  confidence: number;
  risk: string;
  reason: string;
};

type WorldCupTeamMasterStat = {
  team: string;
  group: string;
  flag: string;
  fifaRank: number;
  elo: number;
  power: number;
  attack: number;
  defense: number;
  form20: number;
  goalsAvg: number;
  btts: number;
  over15: number;
  over25: number;
  cornersAvg: number;
  cardsAvg: number;
  last5: Array<"W" | "D" | "L">;
};

type WorldCupPlayerStat = {
  player: string;
  team: string;
  flag: string;
  position: string;
  goals: number;
  assists: number;
  goalParticipation: number;
  mvpScore: number;
};

type WorldCupChampionProjection = {
  team: string;
  flag: string;
  chance: number;
  path: string;
};

type WorldCupMasterData = {
  updatedAt: string;
  ranking: WorldCupTeamMasterStat[];
  players: WorldCupPlayerStat[];
  simulator: WorldCupChampionProjection[];
  scanner: WorldCupOpportunity[];
  topOver15: WorldCupOpportunity[];
  topOver25: WorldCupOpportunity[];
  topBtts: WorldCupOpportunity[];
  topCorners: WorldCupOpportunity[];
  bestFavorites: WorldCupOpportunity[];
  livePriority: Match[];
};

type WorldCupData = {
  updatedAt: string;
  groups: string[];
  teams: Team[];
  matches: Match[];
  groupMatches: Match[];
  knockoutMatches: Match[];
  standings: Standing[];
  analyses: Analysis[];
  master?: WorldCupMasterData;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Resumo" },
  { id: "groups", label: "Grupos" },
  { id: "games", label: "Jogos" },
  { id: "knockout", label: "Mata-mata" },
  { id: "analysis", label: "Análise IA" },
  { id: "master", label: "Copa Master" },
];

function brDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOnly(value?: string) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    groups: "Fase de grupos",
    round32: "16 avos",
    round16: "Oitavas",
    quarterfinal: "Quartas",
    semifinal: "Semifinal",
    third_place: "3º lugar",
    final: "Final",
  };
  return labels[stage] || stage;
}

function teamFlag(teams: Team[], name: string) {
  return teams.find((team) => team.name === name)?.flag || "/favicon.png";
}

export default function WorldCup() {
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<WorldCupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetchWorldCupRobot();
      setData({
        updatedAt: response.updatedAt,
        groups: response.groups || [],
        teams: response.teams || [],
        matches: response.matches || [],
        groupMatches: response.groupMatches || [],
        knockoutMatches: response.knockoutMatches || [],
        standings: response.standings || [],
        analyses: response.analyses || [],
        master: response.master,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar Copa do Mundo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const teams = data?.teams || [];
  const groups = data?.groups || [];
  const matches = data?.matches || [];
  const groupMatches = data?.groupMatches || [];
  const knockoutMatches = data?.knockoutMatches || [];
  const standings = data?.standings || [];
  const analyses = data?.analyses || [];
  const master = data?.master;

  const groupedTeams = useMemo(() => {
    return groups.map((group) => ({
      group,
      teams: teams.filter((team) => team.group === group),
    }));
  }, [groups, teams]);

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((match) =>
      [match.home, match.away, match.group, stageLabel(match.stage)].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [matches, query]);

  const analysisRows = useMemo(() => analyses.slice(0, 60).map((analysis) => {
    const match = matches.find((item) => item.id === analysis.matchId);
    return { analysis, match };
  }).filter((item) => item.match), [analyses, matches]);

  const featuredGroup = useMemo(() => {
    const withGames = groups.find((group) => standings.some((row) => row.group === group && row.played > 0));
    return withGames || groups.find((group) => group.includes("D")) || groups[0] || "Grupo D";
  }, [groups, standings]);

  const featuredRows = useMemo(() => {
    return standings.filter((row) => row.group === featuredGroup).sort((a, b) => a.position - b.position);
  }, [standings, featuredGroup]);

  const spotlightMatches = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const live = matches.filter((match) => match.status === "live");
    const today = matches.filter((match) => match.date === todayKey && match.status !== "finished");
    const scheduled = matches.filter((match) => match.status !== "finished");
    const finished = matches.filter((match) => match.status === "finished").slice(-2);
    const unique = [...live, ...today, ...scheduled, ...finished].filter((match, index, arr) => arr.findIndex((item) => item.id === match.id) === index);
    return unique.slice(0, 4);
  }, [matches]);

  const leaders = useMemo(() => {
    return groups.map((group) => standings.find((row) => row.group === group && row.position === 1)).filter(Boolean) as Standing[];
  }, [groups, standings]);

  const cupStats = useMemo(() => {
    const finished = matches.filter((match) => match.status === "finished");
    const goals = finished.reduce((sum, match) => sum + (match.homeGoals || 0) + (match.awayGoals || 0), 0);
    const avg = finished.length ? (goals / finished.length).toFixed(2) : "0.00";
    return { finished: finished.length, goals, avg };
  }, [matches]);

  const countdownDays = useMemo(() => {
    const start = new Date("2026-06-11T00:00:00-03:00");
    const diff = start.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, []);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-yellow-400/25 bg-[#020407] p-0 shadow-[0_0_120px_rgba(250,204,21,0.12)]">
          <div className="absolute inset-0 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_30%,rgba(250,204,21,0.34),transparent_23%),radial-gradient(circle_at_82%_58%,rgba(16,185,129,0.20),transparent_30%),linear-gradient(90deg,#020407_0%,rgba(2,4,7,0.90)_34%,rgba(2,4,7,0.72)_62%,rgba(4,21,14,0.92)_100%)]" />
          <div className="absolute left-8 top-7 z-10 hidden h-1 w-24 rounded-full bg-yellow-400/80 md:block" />

          <div className="relative z-10 grid gap-5 p-5 md:p-8 xl:grid-cols-[1fr_310px_430px] xl:items-stretch">
            <div className="flex min-h-[390px] flex-col justify-center">
              <p className="w-fit rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-1 text-xs font-black uppercase tracking-[0.28em] text-yellow-300">
                Especial 2026
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-white md:text-6xl xl:text-7xl">
                COPA DO MUNDO <span className="text-yellow-400">2026</span>
              </h1>
              <p className="mt-4 flex flex-wrap items-center gap-3 text-sm font-black text-slate-200 md:text-base">
                Estados Unidos, Canadá e México
                <span className="inline-flex gap-2 text-xl">🇺🇸 🇨🇦 🇲🇽</span>
              </p>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-300 md:text-base">
                Central premium com classificação ao vivo, jogos do dia, líderes dos grupos, mata-mata, notícias e análises IA atualizadas pelos robôs do Analyse Pro.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <HeroMetric icon={<CalendarDays className="h-5 w-5" />} value={countdownDays > 0 ? countdownDays : "AO VIVO"} label={countdownDays > 0 ? "dias para começar" : "competição ativa"} />
                <HeroMetric icon={<Flag className="h-5 w-5" />} value={teams.length} label="seleções" />
                <HeroMetric icon={<Trophy className="h-5 w-5" />} value={groups.length} label="grupos" />
                <HeroMetric icon={<Target className="h-5 w-5" />} value={matches.length} label="jogos" />
                <HeroMetric icon={<Zap className="h-5 w-5" />} value={analyses.length} label="análises IA" />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.25)] hover:bg-yellow-300">
                  <RefreshCcw className="h-4 w-4" /> Atualizar agora
                </button>
                <button onClick={() => setTab("games")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white hover:bg-white/10">
                  <PlayCircle className="h-4 w-4" /> Ver jogos
                </button>
              </div>
            </div>

            <div className="hidden items-center justify-center xl:flex">
              <div className="relative h-[390px] w-[310px]">
                <div className="absolute inset-0 rounded-full bg-yellow-400/10 blur-3xl" />
                <img src="/world-cup-trophy-real.png" alt="Taça da Copa do Mundo" className="relative z-10 h-full w-full object-contain drop-shadow-[0_0_55px_rgba(250,204,21,0.75)]" />
              </div>
            </div>

            <GlassCard className="p-5 bg-black/60 shadow-[0_0_55px_rgba(16,185,129,0.10)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-3xl font-black uppercase tracking-tight text-yellow-400">{featuredGroup}</h2>
                <span className="rounded-full bg-green-400/15 px-3 py-1 text-xs font-black uppercase text-green-300">● Ao vivo</span>
              </div>
              <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500">Classificação atual</p>
              <div className="mt-5 space-y-3">
                {featuredRows.slice(0, 4).map((row) => (
                  <div key={`${row.group}-${row.team}`} className="grid grid-cols-[30px_1fr_48px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <span className="text-sm font-black text-slate-400">{row.position}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={teamFlag(teams, row.team)} alt={row.team} className="h-7 w-10 rounded object-cover shadow" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                      <span className="truncate font-black text-white">{row.team}</span>
                    </div>
                    <span className="text-right text-xl font-black text-white">{row.points}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setTab("groups")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-black text-white hover:bg-white/10">
                Ver classificação completa <ChevronRight className="h-4 w-4" />
              </button>
            </GlassCard>
          </div>
        </section>

        {message ? (
          <GlassCard className="border-red-400/30 p-5 text-red-200">{message}</GlassCard>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-4 py-3 text-sm font-black ${tab === item.id ? "bg-yellow-400 text-black" : "bg-white/[0.05] text-slate-300 hover:bg-white/10"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-slate-300">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar seleção ou fase" className="bg-transparent text-sm font-bold outline-none" />
          </div>
        </div>

        {loading ? (
          <GlassCard className="p-8 text-center text-yellow-300"><LoaderCircle className="mx-auto h-8 w-8 animate-spin" /><p className="mt-3 font-black">Carregando Copa do Mundo...</p></GlassCard>
        ) : null}

        {tab === "overview" ? (
          <section className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.9fr_0.92fr]">
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-400" />
                  <h2 className="text-xl font-black uppercase text-white">Jogos em destaque</h2>
                </div>
                <div className="space-y-2">
                  {spotlightMatches.map((match) => (
                    <MatchRow key={match.id} match={match} teams={teams} onAnalyze={() => setTab("analysis")} />
                  ))}
                  {!spotlightMatches.length ? <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-slate-400">Nenhum jogo encontrado no momento.</p> : null}
                </div>
                <button onClick={() => setTab("games")} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-black text-sky-300 hover:bg-white/10">Ver todos os jogos</button>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Medal className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-black uppercase text-white">Líderes dos grupos</h2>
                </div>
                <div className="space-y-2">
                  {leaders.slice(0, 8).map((row) => (
                    <div key={`${row.group}-${row.team}`} className="grid grid-cols-[72px_1fr_46px] items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                      <span className="text-[10px] font-black uppercase text-slate-500">{row.group}</span>
                      <div className="flex min-w-0 items-center gap-3">
                        <img src={teamFlag(teams, row.team)} alt={row.team} className="h-6 w-9 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                        <span className="truncate font-black text-white">{row.team}</span>
                      </div>
                      <span className="text-right font-black text-yellow-300">{row.points} pts</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setTab("groups")} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-black text-sky-300 hover:bg-white/10">Ver todos os grupos</button>
              </GlassCard>

              <GlassCard className="overflow-hidden p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-black uppercase text-white">Destaques</h2>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                  <div className="h-40 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-yellow-300 backdrop-blur">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 p-5">
                    <p className="rounded-full bg-green-400/20 px-3 py-1 text-[10px] font-black uppercase text-green-300 w-fit">Análise IA</p>
                    <h3 className="mt-2 text-xl font-black text-white">Quem são os favoritos ao título?</h3>
                    <p className="mt-1 text-sm font-bold text-slate-300">Projeções do robô Copa Master.</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <h2 className="text-xl font-black uppercase text-white">Todos os grupos</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                {groupedTeams.map((item) => (
                  <GroupMiniCard key={item.group} group={item.group} teams={item.teams} />
                ))}
              </div>
            </GlassCard>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.85fr_0.85fr]">
              <GlassCard className="p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Target className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-black uppercase text-white">Caminho até a final</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <FinalStep icon="⚽" title="Oitavas" desc="16 seleções" />
                  <FinalStep icon="🏆" title="Quartas" desc="8 seleções" />
                  <FinalStep icon="🥇" title="Semifinais" desc="4 seleções" />
                  <FinalStep icon="🏆" title="Final" desc="2 seleções" active />
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-black uppercase text-white">Notícias em destaque</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="font-black text-white">Seleções favoritas se preparam para a estreia.</p>
                  <p className="mt-1 text-sm font-bold text-slate-400">Resumo do robô de notícias do Analyse Pro.</p>
                </div>
                <button onClick={() => { window.location.href = "/news"; }} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-black text-sky-300 hover:bg-white/10">Ver notícias</button>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-black uppercase text-white">Estatísticas gerais</h2>
                </div>
                <StatLine label="Gols marcados" value={cupStats.goals} />
                <StatLine label="Média de gols/jogo" value={cupStats.avg} />
                <StatLine label="Jogos finalizados" value={cupStats.finished} />
                <StatLine label="Análises disponíveis" value={analyses.length} />
              </GlassCard>
            </div>
          </section>
        ) : null}

        {tab === "groups" ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {groups.map((group) => {
              const rows = standings.filter((row) => row.group === group).sort((a, b) => a.position - b.position);
              return (
                <GlassCard key={group} className="overflow-hidden">
                  <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                    <h2 className="text-xl font-black text-white">{group}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Seleção</th>
                          <th className="px-4 py-3">PTS</th>
                          <th className="px-4 py-3">J</th>
                          <th className="px-4 py-3">V</th>
                          <th className="px-4 py-3">E</th>
                          <th className="px-4 py-3">D</th>
                          <th className="px-4 py-3">GP</th>
                          <th className="px-4 py-3">GC</th>
                          <th className="px-4 py-3">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {rows.map((row) => (
                          <tr key={`${row.group}-${row.team}`} className={row.position <= 2 ? "bg-green-400/[0.04]" : ""}>
                            <td className="px-4 py-3 font-black text-yellow-300">{row.position}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3 font-black text-white">
                                <img src={teamFlag(teams, row.team)} alt={row.team} className="h-7 w-9 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                                {row.team}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-black text-white">{row.points}</td>
                            <td className="px-4 py-3">{row.played}</td>
                            <td className="px-4 py-3">{row.wins}</td>
                            <td className="px-4 py-3">{row.draws}</td>
                            <td className="px-4 py-3">{row.losses}</td>
                            <td className="px-4 py-3">{row.goalsFor}</td>
                            <td className="px-4 py-3">{row.goalsAgainst}</td>
                            <td className="px-4 py-3">{row.goalDifference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              );
            })}
          </section>
        ) : null}

        {tab === "games" ? <MatchesList matches={filteredMatches.filter((m) => m.stage === "groups")} teams={teams} /> : null}
        {tab === "knockout" ? <MatchesList matches={filteredMatches.filter((m) => m.stage !== "groups")} teams={teams} /> : null}

        {tab === "analysis" ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {analysisRows.map(({ analysis, match }) => match ? (
              <GlassCard key={analysis.matchId} className="p-5">
                <p className="text-xs font-black uppercase text-yellow-400">{match.group || stageLabel(match.stage)} · {dateOnly(match.date)} às {match.time}</p>
                <h3 className="mt-2 text-xl font-black text-white">{match.home} x {match.away}</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Mini label="Favorito" value={analysis.favorite} />
                  <Mini label="Confiança" value={`${analysis.confidence}%`} />
                  <Mini label="Over 1.5" value={`${analysis.over15}%`} />
                  <Mini label="BTTS" value={`${analysis.btts}%`} />
                  <Mini label="Escanteios" value={`${analysis.corners}+`} />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-400">{analysis.reason}</p>
              </GlassCard>
            ) : null)}
          </section>
        ) : null}

        {tab === "master" ? <WorldCupMasterPanel master={master} /> : null}
      </div>
    </PremiumAppShell>
  );
}


function HeroMetric({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="text-yellow-400">{icon}</div>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function MatchRow({ match, teams, onAnalyze }: { match: Match; teams: Team[]; onAnalyze: () => void }) {
  const score = typeof match.homeGoals === "number" && typeof match.awayGoals === "number" ? `${match.homeGoals} x ${match.awayGoals}` : "x";
  return (
    <div className="grid grid-cols-[70px_1fr_76px] items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
      <div>
        <p className="text-xs font-black text-slate-300">{match.time || "--:--"}</p>
        <p className="text-[10px] font-black uppercase text-green-300">{match.status === "live" ? "Ao vivo" : match.status === "finished" ? "Final" : dateOnly(match.date)}</p>
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 font-black text-white"><img src={teamFlag(teams, match.home)} alt={match.home} className="h-5 w-8 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} /><span className="truncate">{match.home}</span></span>
          <span className="shrink-0 rounded-lg bg-black/60 px-3 py-1 text-sm font-black text-white">{score}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 font-black text-white"><img src={teamFlag(teams, match.away)} alt={match.away} className="h-5 w-8 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} /><span className="truncate">{match.away}</span></div>
      </div>
      <button onClick={onAnalyze} className="rounded-lg bg-yellow-400 px-3 py-2 text-[10px] font-black uppercase text-black hover:bg-yellow-300">Analisar</button>
    </div>
  );
}

function GroupMiniCard({ group, teams }: { group: string; teams: Team[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 hover:border-yellow-400/35">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-yellow-300">{group}</p>
      <div className="space-y-2">
        {teams.map((team) => (
          <div key={`${group}-${team.name}`} className="flex min-w-0 items-center gap-2 text-sm font-black text-white">
            <img src={team.flag} alt={team.name} className="h-5 w-8 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
            <span className="truncate">{team.name}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-black text-sky-300">Ver grupo ›</p>
    </div>
  );
}

function FinalStep({ icon, title, desc, active }: { icon: string; title: string; desc: string; active?: boolean }) {
  return (
    <div className={`relative rounded-2xl border p-4 text-center ${active ? "border-yellow-400/40 bg-yellow-400/10" : "border-white/10 bg-black/25"}`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-3xl">{icon}</div>
      <p className="mt-3 text-sm font-black uppercase text-white">{title}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{desc}</p>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm font-black uppercase text-slate-400">{label}</span>
      <span className="text-lg font-black text-white">{value}</span>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <GlassCard className="p-5">
      <div className="text-yellow-400">{icon}</div>
      <p className="mt-3 text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-4xl font-black text-white">{value}</p>
    </GlassCard>
  );
}

function MetricCard({ title, value, desc }: { title: string; value: number | string; desc: string }) {
  return (
    <GlassCard className="p-5">
      <ShieldCheck className="h-7 w-7 text-green-300" />
      <p className="mt-3 text-sm font-bold text-slate-400">{title}</p>
      <p className="mt-1 text-4xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{desc}</p>
    </GlassCard>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}


function FormDots({ form }: { form: Array<"W" | "D" | "L"> }) {
  const cls: Record<string, string> = { W: "bg-green-400", D: "bg-yellow-400", L: "bg-red-500" };
  const label: Record<string, string> = { W: "Vitória", D: "Empate", L: "Derrota" };
  return <div className="flex gap-1">{form.map((item, index) => <span key={`${item}-${index}`} title={label[item]} className={`h-3 w-3 rounded-full ${cls[item]}`} />)}</div>;
}

function OpportunityList({ title, items }: { title: string; items: WorldCupOpportunity[] }) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.slice(0, 6).map((item) => (
          <div key={`${item.matchId}-${item.market}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-white">{item.home} x {item.away}</p>
              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">{item.confidence}%</span>
            </div>
            <p className="mt-1 text-sm font-black text-green-300">{item.market}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">{dateOnly(item.date)} · {item.time} · Risco {item.risk}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function WorldCupMasterPanel({ master }: { master?: WorldCupMasterData }) {
  if (!master) return <GlassCard className="p-6 text-center font-black text-yellow-300">Carregando Robô Copa Master...</GlassCard>;
  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard className="p-5 xl:col-span-2">
          <h2 className="text-2xl font-black text-white">🏆 Ranking Master das Seleções</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Seleção</th><th className="px-3 py-2">FIFA</th><th className="px-3 py-2">Elo</th><th className="px-3 py-2">Ataque</th><th className="px-3 py-2">Defesa</th><th className="px-3 py-2">Over 1.5</th><th className="px-3 py-2">Forma</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {master.ranking.slice(0, 16).map((row, index) => (
                  <tr key={row.team}>
                    <td className="px-3 py-3 font-black text-yellow-300">{index + 1}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-3 font-black text-white"><img src={row.flag} className="h-6 w-9 rounded object-cover" />{row.team}</div></td>
                    <td className="px-3 py-3 font-black text-white">{row.fifaRank}</td><td className="px-3 py-3">{row.elo}</td><td className="px-3 py-3">{row.attack}%</td><td className="px-3 py-3">{row.defense}%</td><td className="px-3 py-3">{row.over15}%</td><td className="px-3 py-3"><FormDots form={row.last5} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h2 className="text-2xl font-black text-white">🎯 Simulador de Campeão</h2>
          <div className="mt-4 space-y-3">
            {master.simulator.slice(0, 8).map((item) => (
              <div key={item.team} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-3 font-black text-white"><img src={item.flag} className="h-6 w-9 rounded object-cover" />{item.team}</div>
                <span className="text-lg font-black text-yellow-300">{item.chance}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <OpportunityList title="🔥 Top Over 1.5 Copa" items={master.topOver15} />
        <OpportunityList title="🔥 Top Over 2.5 Copa" items={master.topOver25} />
        <OpportunityList title="✅ Top Ambas Marcam" items={master.topBtts} />
        <OpportunityList title="🚩 Top Escanteios" items={master.topCorners} />
      </div>
      <GlassCard className="p-5">
        <h2 className="text-2xl font-black text-white">⭐ Jogadores em destaque</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {master.players.slice(0, 12).map((player) => (
            <div key={`${player.team}-${player.player}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3"><img src={player.flag} className="h-6 w-9 rounded object-cover" /><div><p className="font-black text-white">{player.player}</p><p className="text-xs font-bold text-slate-400">{player.team} · {player.position}</p></div></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black"><Mini label="Gols" value={player.goals} /><Mini label="Assist." value={player.assists} /><Mini label="MVP" value={player.mvpScore} /></div>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

function MatchesList({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  return (
    <section className="grid gap-4">
      {matches.map((match) => (
        <GlassCard key={match.id} className="p-5">
          <div className="grid gap-4 md:grid-cols-[180px_1fr_150px] md:items-center">
            <div>
              <p className="text-xs font-black uppercase text-yellow-400">{match.group || stageLabel(match.stage)}</p>
              <p className="mt-1 text-sm font-bold text-slate-400">{dateOnly(match.date)} · {match.time}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xl font-black text-white">
              <img src={teamFlag(teams, match.home)} alt={match.home} className="h-8 w-11 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
              <span>{match.home}</span>
              <span className="rounded-xl bg-yellow-400 px-3 py-1 text-black">{typeof match.homeGoals === "number" && typeof match.awayGoals === "number" ? `${match.homeGoals} x ${match.awayGoals}` : "x"}</span>
              <img src={teamFlag(teams, match.away)} alt={match.away} className="h-8 w-11 rounded object-cover" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
              <span>{match.away}</span>
            </div>
            <div className="text-right">
              <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black uppercase text-green-200">
                {match.status === "finished" ? "Finalizado" : match.status === "live" ? "Ao vivo" : "Agendado"}
              </span>
            </div>
          </div>
        </GlassCard>
      ))}
    </section>
  );
}
