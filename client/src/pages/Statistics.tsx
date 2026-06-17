import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Flag,
  Goal,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";
import { getCurrentUser, getSavedAnalyses } from "@/lib/localAuth";
import { normalizedPlan } from "@/data/dailyTips";

type Game = {
  fixtureId: string;
  time: string;
  status: string;
  league: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

type League = { id: number; name: string; country?: string; games: number };

type DashboardData = {
  date: string;
  leagueId: number | null;
  leagues: League[];
  totalGames: number;
  liveGames: number;
  finishedGames: number;
  scoredGames: number;
  averageGoals: number | null;
  bothScoredPct: number | null;
  averageCorners: number | null;
  cornerSamples: number;
  quality: number;
  matches: Game[];
};

type ApiResponse = {
  success: boolean;
  dashboard?: DashboardData;
  updatedAt?: string;
  error?: string;
};

export default function Statistics() {
  const user = getCurrentUser();
  const plan = normalizedPlan(user);
  const analyses = getSavedAnalyses();
  const [league, setLeague] = useState("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(selectedLeague = league) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedLeague !== "all") params.set("league", selectedLeague);
      const response = await fetch(`/api/football/statistics-dashboard?${params.toString()}`, { cache: "no-store" });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success || !result.dashboard) {
        throw new Error(result.error || "Não foi possível carregar os dados.");
      }
      setData(result.dashboard);
      setUpdatedAt(result.updatedAt || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard("all");
  }, []);

  function selectLeague(value: string) {
    setLeague(value);
    loadDashboard(value);
  }

  const mostAnalysed = useMemo(() => {
    const counts = new Map<string, number>();
    analyses.forEach((item) => {
      counts.set(item.teamA, (counts.get(item.teamA) || 0) + 1);
      counts.set(item.teamB, (counts.get(item.teamB) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team))
      .slice(0, 5);
  }, [analyses]);

  return (
    <PremiumAppShell>
      {loading ? (
        <AnalysisProcessLoader
          title="Carregando estatísticas..."
          message="Consultando jogos e indicadores reais da API."
        />
      ) : null}

      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-yellow-400">Estatísticas reais</p>
              <h1 className="mt-2 text-4xl font-black md:text-5xl">Painel estatístico</h1>
              <p className="mt-3 max-w-3xl text-slate-400">
                Indicadores calculados com jogos retornados pela API-Football e histórico das suas análises.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </GlassCard>

        {error ? <GlassCard className="border-red-400/30 bg-red-500/10 p-5 text-sm font-bold text-red-200">{error}</GlassCard> : null}

        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3 text-slate-300">
              <CalendarDays className="h-5 w-5 text-yellow-400" />
              <span className="font-bold">Jogos de hoje</span>
              {updatedAt ? <span className="text-xs text-slate-500">Atualizado às {new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
            </div>
            <select
              value={league}
              onChange={(event) => selectLeague(event.target.value)}
              className="min-w-[280px] rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-bold text-white outline-none focus:border-yellow-400"
            >
              <option value="all">Todas as competições</option>
              {(data?.leagues || []).map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name} ({item.games})
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Plano" value={plan} icon={<Trophy className="h-5 w-5" />} tone="yellow" />
          <StatCard label="Jogos disponíveis" value={String(data?.totalGames ?? "--")} icon={<CalendarDays className="h-5 w-5" />} tone="yellow" />
          <StatCard label="Ao vivo agora" value={String(data?.liveGames ?? "--")} icon={<Activity className="h-5 w-5" />} tone="green" />
          <StatCard label="Média de gols" value={decimal(data?.averageGoals)} icon={<Goal className="h-5 w-5" />} tone="orange" />
          <StatCard label="Qualidade dos dados" value={data ? `${data.quality}%` : "--"} icon={<ShieldCheck className="h-5 w-5" />} tone="green" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Indicadores reais do dia</h2>
              <BarChart3 className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="mt-6 space-y-5">
              <Indicator label="Gols das duas equipas" value={percent(data?.bothScoredPct)} pct={data?.bothScoredPct || 0} />
              <Indicator label="Média de gols por jogo com placar" value={decimal(data?.averageGoals)} pct={metricBar(data?.averageGoals, 5)} />
              <Indicator label="Média de escanteios" value={decimal(data?.averageCorners)} pct={metricBar(data?.averageCorners, 14)} />
              <Indicator label="Cobertura dos dados" value={data ? `${data.quality}%` : "--"} pct={data?.quality || 0} />
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Escanteios calculados sobre {data?.cornerSamples || 0} partida(s) com estatísticas detalhadas disponíveis.
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Equipas mais analisadas</h2>
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="mt-2 text-sm text-slate-400">Baseado no seu histórico salvo.</p>
            <div className="mt-5 space-y-3">
              {mostAnalysed.length ? mostAnalysed.map((item, index) => (
                <div key={item.team} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-black ${index === 0 ? "bg-yellow-400 text-black" : "bg-white/10 text-white"}`}>{index + 1}</span>
                    <span className="font-black text-white">{item.team}</span>
                  </div>
                  <span className="font-black text-yellow-400">{item.count}</span>
                </div>
              )) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm text-slate-400">Gere análises para formar seu histórico.</p>
              )}
            </div>
            <p className="mt-5 text-sm text-slate-400">Análises salvas: <span className="font-black text-white">{analyses.length}</span></p>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Partidas da competição selecionada</h2>
            <Flag className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="mt-5 space-y-3">
            {(data?.matches || []).length ? data!.matches.map((game) => (
              <div key={game.fixtureId} className="grid items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[110px_1fr_120px]">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{game.league}</p>
                  <p className="mt-1 font-black text-yellow-400">{game.time}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-black text-white">
                  <TeamLogo src={game.homeLogo} name={game.home} />
                  <span>{game.home}</span>
                  <span className="text-yellow-400">{score(game)}</span>
                  <span>{game.away}</span>
                  <TeamLogo src={game.awayLogo} name={game.away} />
                </div>
                <Link href={`/analyze?home=${encodeURIComponent(game.home)}&away=${encodeURIComponent(game.away)}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 px-4 py-3 text-sm font-black text-yellow-300 hover:bg-yellow-400/10">
                  Analisar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400">Nenhuma partida disponível nesta seleção hoje.</p>
            )}
          </div>
        </GlassCard>

        <p className="text-sm text-slate-500">
          Fonte: API-Football. Indicadores são informativos e dependem dos dados disponíveis para as partidas.
        </p>
      </div>
    </PremiumAppShell>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone: "yellow" | "orange" | "green" }) {
  const colour = tone === "green" ? "text-green-400" : tone === "orange" ? "text-orange-400" : "text-yellow-400";
  return (
    <GlassCard className="p-5">
      <div className={`flex items-center gap-2 ${colour}`}>{icon}<span className="text-xs font-bold uppercase text-slate-400">{label}</span></div>
      <p className={`mt-3 text-3xl font-black ${colour}`}>{value}</p>
    </GlassCard>
  );
}

function Indicator({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <span className="font-bold text-slate-200">{label}</span>
        <span className="font-black text-yellow-400">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  return (
    <img
      src={src || "/favicon.png"}
      alt={name}
      className="h-8 w-8 rounded-full bg-white object-contain p-1"
      onError={(event) => { event.currentTarget.src = "/favicon.png"; }}
    />
  );
}

function decimal(value?: number | null) {
  return value == null ? "--" : value.toFixed(2).replace(".", ",");
}

function percent(value?: number | null) {
  return value == null ? "--%" : `${Math.round(value)}%`;
}

function metricBar(value: number | null | undefined, max: number) {
  return value == null ? 0 : Math.min(100, Math.round((value / max) * 100));
}

function score(game: Game) {
  return game.homeGoals == null || game.awayGoals == null ? "x" : `${game.homeGoals} x ${game.awayGoals}`;
}
