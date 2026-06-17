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
import { fetchRobotGames, type RobotGame } from "@/lib/robotGames";
import { fetchWorldCupCompare } from "@/lib/worldCupRobot";
import { fetchStatisticsCompare, type StatisticalOpportunity } from "@/lib/statisticsRobot";
import { fetchCornersCompare, type CornerOpportunity } from "@/lib/cornersRobot";
import { fetchCardsCompare, type CardOpportunity } from "@/lib/cardsRobot";
import { fetchGoalsCompare, type GoalOpportunity } from "@/lib/goalsRobot";
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
  const [robotGames, setRobotGames] = useState<RobotGame[]>([]);
  const [worldCupHint, setWorldCupHint] = useState<any>(null);
  const [statHint, setStatHint] = useState<StatisticalOpportunity | null>(null);
  const [cornerHint, setCornerHint] = useState<CornerOpportunity | null>(null);
  const [cardHint, setCardHint] = useState<CardOpportunity | null>(null);
  const [goalHint, setGoalHint] = useState<GoalOpportunity | null>(null);

  useEffect(() => {
    fetchRobotGames(12).then(setRobotGames).catch(() => setRobotGames([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchWorldCupCompare(teamAName, teamBName)
      .then((data) => {
        if (!cancelled) setWorldCupHint(data.found || null);
      })
      .catch(() => {
        if (!cancelled) setWorldCupHint(null);
      });
    return () => { cancelled = true; };
  }, [teamAName, teamBName]);

  useEffect(() => {
    let cancelled = false;
    fetchStatisticsCompare(teamAName, teamBName)
      .then((data) => {
        if (!cancelled) setStatHint(data.opportunity || null);
      })
      .catch(() => {
        if (!cancelled) setStatHint(null);
      });
    return () => { cancelled = true; };
  }, [teamAName, teamBName]);

  const teamA = teams.find((team) => team.name === teamAName) || { id: 900001, name: teamAName, logo: "/favicon.png" } as Team;
  const teamB = teams.find((team) => team.name === teamBName) || { id: 900002, name: teamBName, logo: "/favicon.png" } as Team;
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
      const response = await fetch("/api/master-search/compare", {
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

  useEffect(() => {
    let cancelled = false;
    fetchCornersCompare(teamAName, teamBName)
      .then((data) => {
        if (!cancelled) setCornerHint(data.opportunity || null);
      })
      .catch(() => {
        if (!cancelled) setCornerHint(null);
      });
    return () => { cancelled = true; };
  }, [teamAName, teamBName]);

  useEffect(() => {
    let cancelled = false;
    fetchCardsCompare(teamAName, teamBName)
      .then((data) => {
        if (!cancelled) setCardHint(data.opportunity || null);
      })
      .catch(() => {
        if (!cancelled) setCardHint(null);
      });
    return () => { cancelled = true; };
  }, [teamAName, teamBName]);

  useEffect(() => {
    let cancelled = false;
    fetchGoalsCompare(teamAName, teamBName)
      .then((data) => {
        if (!cancelled) setGoalHint(data.opportunity || null);
      })
      .catch(() => {
        if (!cancelled) setGoalHint(null);
      });
    return () => { cancelled = true; };
  }, [teamAName, teamBName]);

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
              Compare forma recente, médias, escanteios e confronto direto com a Busca Master Global.
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

          {worldCupHint?.analysis ? (
            <div className="mt-6 rounded-2xl border border-green-400/25 bg-green-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">Copa 2026</p>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <div><p className="text-xs text-slate-400">Favorito</p><p className="font-black text-white">{worldCupHint.analysis.favorite}</p></div>
                <div><p className="text-xs text-slate-400">Confiança</p><p className="font-black text-yellow-300">{worldCupHint.analysis.confidence}%</p></div>
                <div><p className="text-xs text-slate-400">Over 1.5</p><p className="font-black text-white">{worldCupHint.analysis.over15}%</p></div>
                <div><p className="text-xs text-slate-400">BTTS</p><p className="font-black text-white">{worldCupHint.analysis.btts}%</p></div>
                <div><p className="text-xs text-slate-400">Escanteios</p><p className="font-black text-white">{worldCupHint.analysis.corners}+</p></div>
              </div>
            </div>
          ) : null}

          {statHint ? (
            <div className="mt-6 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Estatísticas</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                <div><p className="text-xs text-slate-400">Melhor mercado</p><p className="font-black text-white">{statHint.bestMarket}</p></div>
                <div><p className="text-xs text-slate-400">Confiança</p><p className="font-black text-yellow-300">{statHint.confidence}%</p></div>
                <div><p className="text-xs text-slate-400">Over 1.5</p><p className="font-black text-white">{statHint.goals.over15.probability}%</p></div>
                <div><p className="text-xs text-slate-400">BTTS</p><p className="font-black text-white">{statHint.goals.btts.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Cantos 8.5</p><p className="font-black text-white">{statHint.corners.over85.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Cantos 9.5</p><p className="font-black text-white">{statHint.corners.over95.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Cartões 3.5</p><p className="font-black text-white">{statHint.cards.over35.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Risco</p><p className="font-black text-white">{statHint.risk}</p></div>
              </div>
            </div>
          ) : null}

          {cornerHint ? (
            <div className="mt-6 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">🚩 Escanteios</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                <div><p className="text-xs text-slate-400">Melhor linha</p><p className="font-black text-white">{cornerHint.bestLine}</p></div>
                <div><p className="text-xs text-slate-400">Confiança</p><p className="font-black text-yellow-300">{cornerHint.confidence}%</p></div>
                <div><p className="text-xs text-slate-400">Previstos</p><p className="font-black text-white">{cornerHint.expectedCorners}</p></div>
                <div><p className="text-xs text-slate-400">Over 7.5</p><p className="font-black text-white">{cornerHint.lines.over75.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 8.5</p><p className="font-black text-white">{cornerHint.lines.over85.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 9.5</p><p className="font-black text-white">{cornerHint.lines.over95.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 10.5</p><p className="font-black text-white">{cornerHint.lines.over105.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Risco</p><p className="font-black text-white">{cornerHint.risk}</p></div>
              </div>
            </div>
          ) : null}

          {cardHint ? (
            <div className="mt-6 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">🟨 Cartões</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                <div><p className="text-xs text-slate-400">Melhor linha</p><p className="font-black text-white">{cardHint.bestLine}</p></div>
                <div><p className="text-xs text-slate-400">Confiança</p><p className="font-black text-yellow-300">{cardHint.confidence}%</p></div>
                <div><p className="text-xs text-slate-400">Previstos</p><p className="font-black text-white">{cardHint.expectedCards}</p></div>
                <div><p className="text-xs text-slate-400">Over 2.5</p><p className="font-black text-white">{cardHint.lines.over25.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 3.5</p><p className="font-black text-white">{cardHint.lines.over35.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 4.5</p><p className="font-black text-white">{cardHint.lines.over45.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 5.5</p><p className="font-black text-white">{cardHint.lines.over55.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Risco</p><p className="font-black text-white">{cardHint.risk}</p></div>
              </div>
            </div>
          ) : null}

          {goalHint ? (
            <div className="mt-6 rounded-2xl border border-green-400/25 bg-green-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">⚽ Gols</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                <div><p className="text-xs text-slate-400">Melhor linha</p><p className="font-black text-white">{goalHint.bestLine}</p></div>
                <div><p className="text-xs text-slate-400">Confiança</p><p className="font-black text-yellow-300">{goalHint.confidence}%</p></div>
                <div><p className="text-xs text-slate-400">Gols esperados</p><p className="font-black text-white">{goalHint.expectedGoals}</p></div>
                <div><p className="text-xs text-slate-400">Over HT</p><p className="font-black text-white">{goalHint.lines.over05HT.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 1.5</p><p className="font-black text-white">{goalHint.lines.over15.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Over 2.5</p><p className="font-black text-white">{goalHint.lines.over25.probability}%</p></div>
                <div><p className="text-xs text-slate-400">BTTS</p><p className="font-black text-white">{goalHint.lines.btts.probability}%</p></div>
                <div><p className="text-xs text-slate-400">Risco</p><p className="font-black text-white">{goalHint.risk}</p></div>
              </div>
            </div>
          ) : null}

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
          <>
          {robotGames.length ? (
            <GlassCard className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">Busca Master</p>
              <h2 className="mt-2 text-2xl font-black text-white">Confrontos sincronizados pelo Master Global</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {robotGames.slice(0, 6).map((game) => (
                  <button
                    key={game.id}
                    onClick={() => {
                      setTeamAName(game.home);
                      setTeamBName(game.away);
                      setResult(null);
                      setError("");
                    }}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-yellow-400/50"
                  >
                    <p className="text-xs font-black uppercase text-slate-500">{game.league} · {game.time}</p>
                    <p className="mt-2 text-lg font-black text-white">{game.home} x {game.away}</p>
                    <p className="mt-1 text-xs font-bold text-green-300">Fonte: jogos recentes</p>
                  </button>
                ))}
              </div>
            </GlassCard>
          ) : null}
          <GlassCard className="p-10 text-center">
            <History className="mx-auto h-12 w-12 text-yellow-400" />
            <h2 className="mt-4 text-2xl font-black">Escolha os times e compare</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-400">
              A comparação mostrará os últimos jogos, médias por equipa e o histórico do confronto.
            </p>
          </GlassCard>
          </>
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
                Fonte de dados: <span className="font-bold text-slate-200">Busca Master Global</span>. Calendário, forma recente, escudos e estatísticas usam o mesmo cache central do sistema.
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
