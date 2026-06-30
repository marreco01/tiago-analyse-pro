import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Goal,
  History,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";
import { GlassCard, PremiumAppShell } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";
import { getTeamLogoCandidates, teams, type Team } from "@/data/teams";

type LastGame = {
  opponent: string;
  score: string;
  result: "V" | "E" | "D";
  source?: string;
  date?: string;
};

type TeamStats = {
  goalsFor?: number;
  goalsAgainst?: number;
  corners?: number;
  form?: Array<"V" | "E" | "D">;
  lastGames?: LastGame[];
};

type CompareResponse = {
  success?: boolean;
  error?: string;
  analysis?: {
    confidence?: number;
    sourceMode?: string;
    summary?: string;
    stats?: {
      over15?: number;
      over25?: number;
      btts?: number;
      averageCorners?: number;
      cards?: number;
      teamA?: TeamStats;
      teamB?: TeamStats;
    };
    h2h?: {
      teamAWins: number;
      draws: number;
      teamBWins: number;
      teamAGoals: number;
      teamBGoals: number;
      estimated?: boolean;
    };
  };
};

export default function Compare() {
  const [teamAName, setTeamAName] = useState("Flamengo");
  const [teamBName, setTeamBName] = useState("Palmeiras");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState("");

  const teamA = teams.find((team) => team.name === teamAName) || null;
  const teamB = teams.find((team) => team.name === teamBName) || null;
  const analysis = result?.analysis;
  const statsA = analysis?.stats?.teamA;
  const statsB = analysis?.stats?.teamB;
  const h2h = analysis?.h2h;
  const canCompare = Boolean(teamA && teamB && teamA.id !== teamB.id);

  async function compareTeams() {
    if (!teamA || !teamB || teamA.id === teamB.id) {
      setError("Selecione duas equipas diferentes.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/web-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamA: teamA.name,
          teamB: teamB.name,
          teamAId: teamA.id,
          teamBId: teamB.id,
        }),
      });
      const data = (await response.json()) as CompareResponse;
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Não foi possível carregar a comparação.");
      }
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Erro ao comparar equipas.");
    } finally {
      setLoading(false);
    }
  }

  function swapTeams() {
    setTeamAName(teamBName);
    setTeamBName(teamAName);
    setResult(null);
    setError("");
  }

  const analysisUrl = `/analyze?home=${encodeURIComponent(teamAName)}&away=${encodeURIComponent(teamBName)}`;

  return (
    <PremiumAppShell>
      {loading ? (
        <AnalysisProcessLoader
          title="Comparando equipes..."
          message="Carregando forma recente, confronto direto e médias estatísticas."
        />
      ) : null}
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-[#06080c] p-6 shadow-[0_0_70px_rgba(250,204,21,0.08)] md:p-8">
          <div className="absolute inset-0 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/55" />
          <div className="relative z-10">
            <Link href="/analyze" className="inline-flex items-center gap-2 text-sm font-black text-yellow-400 transition hover:text-yellow-300">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Análise
            </Link>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.26em] text-yellow-400">Comparação real</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
              Comparar Times
            </h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Compare forma recente, médias, escanteios e confronto direto com dados carregados da API.
            </p>
          </div>
        </section>

        <GlassCard className="overflow-hidden border-yellow-400/30 p-5 md:p-7">
          <div className="grid items-end gap-4 lg:grid-cols-[1fr_120px_1fr]">
            <TeamSelector label="TIME A" side="Casa" value={teamAName} onChange={(name) => { setTeamAName(name); setResult(null); }} team={teamA} />
            <button
              type="button"
              onClick={swapTeams}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 text-yellow-400 transition hover:bg-yellow-400/20 lg:mb-8"
              aria-label="Trocar os times de lado"
            >
              <RefreshCcw className="h-5 w-5" />
            </button>
            <TeamSelector label="TIME B" side="Visitante" value={teamBName} onChange={(name) => { setTeamBName(name); setResult(null); }} team={teamB} />
          </div>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={compareTeams}
              disabled={!canCompare || loading}
              className="inline-flex min-w-[250px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-7 py-4 font-black uppercase text-black shadow-[0_0_28px_rgba(250,204,21,0.2)] transition hover:from-yellow-300 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <BarChart3 className="h-5 w-5" />}
              {loading ? "Carregando dados..." : "Comparar agora"}
            </button>
            <Link
              href={analysisUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 px-7 py-4 font-black text-yellow-300 transition hover:bg-yellow-400/10"
            >
              Abrir análise completa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {error ? (
            <p className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</p>
          ) : null}
        </GlassCard>

        {!analysis && !loading ? (
          <GlassCard className="p-10 text-center">
            <History className="mx-auto h-12 w-12 text-yellow-400" />
            <h2 className="mt-4 text-2xl font-black">Escolha os times e compare</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-400">
              A comparação mostrará os últimos jogos, médias por equipa e o histórico do confronto.
            </p>
          </GlassCard>
        ) : null}

        {analysis ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={<Goal />} label="Gols Time A" value={number(statsA?.goalsFor)} tone="yellow" />
              <MetricCard icon={<Goal />} label="Gols Time B" value={number(statsB?.goalsFor)} tone="orange" />
              <MetricCard icon={<Target />} label="Gols das equipas" value={percent(analysis.stats?.btts)} tone="yellow" />
              <MetricCard icon={<Trophy />} label="Média escanteios" value={number(analysis.stats?.averageCorners)} tone="orange" />
              <MetricCard icon={<ShieldCheck />} label="Qualidade dados" value={percent(analysis.confidence)} tone="green" />
            </section>

            <GlassCard className="p-5 md:p-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">Confronto direto</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Histórico entre as equipas</h2>
                </div>
                <p className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-2 text-xs font-black text-green-300">
                  DADOS REAIS DA API
                </p>
              </div>

              <div className="mt-7 grid items-center gap-4 md:grid-cols-[1fr_120px_1fr]">
                <HeadToHeadTeam team={teamA} wins={h2h?.teamAWins || 0} goals={h2h?.teamAGoals || 0} />
                <div className="text-center">
                  <p className="text-xs font-bold uppercase text-slate-400">Empates</p>
                  <p className="mt-2 text-4xl font-black text-yellow-400">{h2h?.draws || 0}</p>
                </div>
                <HeadToHeadTeam team={teamB} wins={h2h?.teamBWins || 0} goals={h2h?.teamBGoals || 0} />
              </div>
            </GlassCard>

            <section className="grid gap-5 xl:grid-cols-2">
              <TeamComparison team={teamA} stats={statsA} otherStats={statsB} />
              <TeamComparison team={teamB} stats={statsB} otherStats={statsA} />
            </section>

            <GlassCard className="p-5 md:p-7">
              <p className="text-sm text-slate-400">
                Fonte de dados: <span className="font-bold text-slate-200">API-Football</span>. As métricas são informativas e refletem as partidas disponíveis na API.
              </p>
            </GlassCard>
          </>
        ) : null}
      </div>
    </PremiumAppShell>
  );
}

function TeamSelector({ label, side, value, onChange, team }: { label: string; side: string; value: string; onChange: (name: string) => void; team: Team | null }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label} • {side}</p>
      <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
        <div className="mb-4 flex items-center gap-4">
          <TeamLogo team={team} />
          <div>
            <p className="text-xl font-black text-white">{team?.name || "Selecione"}</p>
            <p className="text-sm font-bold text-yellow-400">{team?.league || side}</p>
          </div>
        </div>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#06090f] px-4 py-3 font-bold text-white outline-none focus:border-yellow-400"
        >
          {teams.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name} — {option.league}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TeamLogo({ team }: { team: Team | null }) {
  const [index, setIndex] = useState(0);
  const candidates = team ? getTeamLogoCandidates(team.name) : ["/favicon.png"];

  useEffect(() => {
    setIndex(0);
  }, [team?.name]);
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-yellow-400/25 bg-black/60 p-2">
      <img
        key={`${team?.name || "none"}-${index}`}
        src={candidates[Math.min(index, candidates.length - 1)]}
        onError={() => setIndex((current) => Math.min(current + 1, candidates.length - 1))}
        alt={team?.name || "Analyse Pro"}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "yellow" | "orange" | "green" }) {
  const text = tone === "green" ? "text-green-400" : tone === "orange" ? "text-orange-400" : "text-yellow-400";
  return (
    <GlassCard className="p-4">
      <div className={`flex items-center gap-2 ${text}`}>{icon}<p className="text-xs font-black uppercase text-slate-400">{label}</p></div>
      <p className={`mt-3 text-3xl font-black ${text}`}>{value}</p>
    </GlassCard>
  );
}

function HeadToHeadTeam({ team, wins, goals }: { team: Team | null; wins: number; goals: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-center">
      <div className="mx-auto w-fit"><TeamLogo team={team} /></div>
      <p className="mt-3 text-lg font-black">{team?.name || "--"}</p>
      <div className="mt-4 flex justify-center gap-7">
        <div><p className="text-xs text-slate-400">Vitórias</p><p className="text-2xl font-black text-yellow-400">{wins}</p></div>
        <div><p className="text-xs text-slate-400">Gols</p><p className="text-2xl font-black text-white">{goals}</p></div>
      </div>
    </div>
  );
}

function TeamComparison({ team, stats, otherStats }: { team: Team | null; stats?: TeamStats; otherStats?: TeamStats }) {
  const form = stats?.form || [];
  return (
    <GlassCard className="p-5 md:p-6">
      <div className="flex items-center gap-4">
        <TeamLogo team={team} />
        <div>
          <h3 className="text-xl font-black">{team?.name || "--"}</h3>
          <p className="text-sm text-slate-400">Últimos jogos e médias</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {form.length ? form.map((entry, index) => <FormBadge key={`${entry}-${index}`} result={entry} />) : <p className="text-sm text-slate-500">Sem forma disponível.</p>}
      </div>

      <div className="mt-6 space-y-4">
        <CompareBar label="Média de gols feitos" value={stats?.goalsFor || 0} max={Math.max(stats?.goalsFor || 0, otherStats?.goalsFor || 0, 1)} />
        <CompareBar label="Média de gols sofridos" value={stats?.goalsAgainst || 0} max={Math.max(stats?.goalsAgainst || 0, otherStats?.goalsAgainst || 0, 1)} />
        <CompareBar label="Média de escanteios" value={stats?.corners || 0} max={Math.max(stats?.corners || 0, otherStats?.corners || 0, 1)} />
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Resultados recentes</p>
        <div className="space-y-2">
          {(stats?.lastGames || []).slice(0, 5).map((game, index) => (
            <div key={`${game.opponent}-${index}`} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <FormBadge result={game.result} compact />
                <span className="text-slate-300">{game.opponent}</span>
              </div>
              <span className="font-black text-white">{game.score}</span>
            </div>
          ))}
          {!stats?.lastGames?.length ? <p className="text-sm text-slate-500">Nenhum resultado retornado.</p> : null}
        </div>
      </div>
    </GlassCard>
  );
}

function FormBadge({ result, compact = false }: { result: "V" | "E" | "D"; compact?: boolean }) {
  const style = result === "V" ? "bg-green-500/15 text-green-400" : result === "D" ? "bg-red-500/15 text-red-400" : "bg-yellow-400/15 text-yellow-400";
  return (
    <span className={`${compact ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm"} inline-flex items-center justify-center rounded-lg font-black ${style}`}>
      {result}
    </span>
  );
}

function CompareBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(4, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-black text-yellow-400">{number(value)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10">
        <div className="h-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function number(value?: number) {
  return value == null || !Number.isFinite(value) ? "--" : Number(value).toFixed(2).replace(".", ",");
}

function percent(value?: number) {
  return value == null || !Number.isFinite(value) ? "--%" : `${Math.round(value)}%`;
}
