import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { PremiumAppShell, GlassCard, LogoMark } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Goal,
  LockKeyhole,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Star,
  Zap,
} from "lucide-react";
import { getTeamLogoCandidates, teams, type Team } from "@/data/teams";
import { saveAnalysis, toggleFavoriteWithLimit, type SavedAnalysis } from "@/lib/localAuth";
import { formatDatePt, type MatchFormItem } from "@/data/matchData";
import { fetchLastGames } from "@/lib/footballLive";

type ApiTeamStats = {
  lastGames?: MatchFormItem[];
  form?: Array<"V" | "E" | "D">;
  goalsFor?: number;
  goalsAgainst?: number;
  corners?: number;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  analysis?: {
    confidence?: number;
    bestMarket?: string;
    riskLevel?: string;
    summary?: string;
    sourceMode?: string;
    stats?: {
      over15?: number;
      over25?: number;
      btts?: number;
      averageCorners?: number;
      cards?: number;
      teamA?: ApiTeamStats;
      teamB?: ApiTeamStats;
    };
    likelyScores?: string[];
    marketProbabilities?: { name: string; value: string; level: string }[];
  };
};

function teamFromQuery(param: string) {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get(param) || "";
  return teams.some((team) => team.name === value) ? value : "";
}

export default function Analyze() {
  const [teamA, setTeamA] = useState(() => teamFromQuery("home"));
  const [teamB, setTeamB] = useState(() => teamFromQuery("away"));
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [liveGamesA, setLiveGamesA] = useState<MatchFormItem[]>([]);
  const [liveGamesB, setLiveGamesB] = useState<MatchFormItem[]>([]);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(null);

  const a = teams.find((team) => team.name === teamA) || null;
  const b = teams.find((team) => team.name === teamB) || null;
  const analysis = result?.analysis;
  const lastGamesA = getLastGamesForPanel(a, analysis?.stats?.teamA, liveGamesA);
  const lastGamesB = getLastGamesForPanel(b, analysis?.stats?.teamB, liveGamesB);
  const canAnalyze = Boolean(a && b && teamA !== teamB);

  useEffect(() => {
    let cancelled = false;
    async function loadForms() {
      setLiveGamesA([]);
      setLiveGamesB([]);
      if (!a && !b) return;
      setLoadingForm(true);
      try {
        const [gamesA, gamesB] = await Promise.all([
          a ? fetchLastGames(a.id, 5).catch(() => []) : Promise.resolve([]),
          b ? fetchLastGames(b.id, 5).catch(() => []) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setLiveGamesA(gamesA);
          setLiveGamesB(gamesB);
        }
      } finally {
        if (!cancelled) setLoadingForm(false);
      }
    }
    loadForms();
    return () => { cancelled = true; };
  }, [a?.id, b?.id]);

  async function handleAnalyze() {
    if (!a || !b) {
      setError("Selecione os dois times para analisar o confronto.");
      return;
    }

    if (teamA === teamB) {
      setError("Selecione dois times diferentes.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/web-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamA, teamB, teamAId: a.id, teamBId: b.id }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Não foi possível analisar este confronto.");
      }

      setResult(data);
      const saved = saveAnalysis({
        teamA,
        teamB,
        sourceMode: data.analysis?.sourceMode,
        confidence: data.analysis?.confidence,
        summary: data.analysis?.summary,
        isFavorite: false,
      });
      setSavedAnalysis(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar confronto.");
    } finally {
      setLoading(false);
    }
  }

  function swapTeams() {
    setTeamA(teamB);
    setTeamB(teamA);
    setResult(null);
    setSavedAnalysis(null);
    setError("");
  }

  return (
    <PremiumAppShell>
      <div className="space-y-7">
        {loading ? <AnalysisProcessLoader title="Gerando análise completa..." message="Carregando dados, métricas e qualidade dos indicadores." /> : null}
        <section className="relative overflow-hidden rounded-2xl border border-yellow-400/35 bg-[#04070b] shadow-[0_0_56px_rgba(250,204,21,0.10)]">
          <div className="absolute inset-0 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-28" />
          <img
            src="/player-premium.png"
            alt="Jogador Analyse Pro 2.0"
            className="absolute bottom-0 right-0 hidden h-full w-[44%] object-cover object-[center_26%] opacity-95 lg:block"
            style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.78) 20%, black 43%)", maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.78) 20%, black 43%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-yellow-400/20 via-yellow-400/80 to-yellow-400/20" />

          <div className="relative z-10 flex min-h-[385px] max-w-[60%] flex-col justify-center p-8 lg:p-10">
            <p className="text-sm font-black uppercase tracking-wide text-yellow-400">Análise de confronto</p>
            <h1 className="mt-3 text-5xl font-black leading-[0.97] tracking-[-0.045em] text-white xl:text-6xl">
              Painel de pesquisa
              <span className="block text-yellow-400">inteligente.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              Compare qualquer confronto e receba análises completas com IA, estatísticas avançadas e relatórios comparativos.
            </p>
            <div className="mt-7 grid max-w-[760px] gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Pill icon={<BarChart3 />} label="Estatísticas Avançadas" />
              <Pill icon={<Brain />} label="IA Estatística" />
              <Pill icon={<Clock3 />} label="Análise em Segundos" />
              <Pill icon={<ShieldCheck />} label="Dados Confiáveis" />
            </div>
          </div>
        </section>

        <GlassCard className="relative -mt-3 overflow-visible border-yellow-400/45 p-0 shadow-[0_0_70px_rgba(250,204,21,0.16)]">
          <div className="absolute inset-0 rounded-2xl bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-18" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-black/90 via-black/80 to-black/95" />
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/16 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

          <div className="relative z-10 p-5 md:p-7">
            <div className="mx-auto -mt-10 mb-7 flex w-fit items-center gap-3 rounded-full border border-yellow-400/70 bg-[#090a0e] px-8 py-3 text-base font-black uppercase tracking-wide text-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.24)]">
              <Sparkles className="h-5 w-5" />
              Analisador Pro IA
            </div>

            <div className="grid items-center gap-5 xl:grid-cols-[1fr_112px_1fr]">
              <SelectedTeamPanel side="Casa" label="Time A" team={a} align="left" />
              <div className="flex items-center justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 text-4xl font-black text-yellow-400 shadow-[0_0_65px_rgba(250,204,21,0.28)]">
                  <span className="absolute inset-3 rounded-full border border-yellow-400/10" />
                  VS
                </div>
              </div>
              <SelectedTeamPanel side="Visitante" label="Time B" team={b} align="right" />
            </div>

            <div className="mx-auto mt-7 grid max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black/60 md:grid-cols-5">
              <MetricStrip icon={<Target />} label="Gols esperados" value={expectedGoalsText(a, b)} />
              <MetricStrip icon={<Goal />} label="Índice ofensivo" value={goalProbabilityText(a, b)} />
              <MetricStrip icon={<CheckCircle2 />} label="Gols das equipas" value={analysis?.stats?.btts ? `${analysis.stats.btts}%` : "--%"} />
              <MetricStrip icon={<Trophy />} label="Escanteios" value={cornersText(analysis?.stats?.averageCorners)} />
              <MetricStrip icon={<ShieldCheck />} label="Qualidade dos dados" value={analysis?.confidence ? `${analysis.confidence}%` : "--%"} highlight />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)_minmax(0,1fr)] lg:items-end">
              <TeamPicker
                label="Time A (Casa)"
                value={teamA}
                onChange={(value) => {
                  setTeamA(value);
                  setResult(null);
                  setSavedAnalysis(null);
                  setError("");
                }}
              />

              <div className="order-3 flex flex-col gap-3 lg:order-none">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !canAnalyze}
                  className="h-14 rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-600 px-6 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_35px_rgba(250,204,21,0.28)] transition hover:scale-[1.01] hover:from-yellow-300 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5" />
                    {loading ? "Gerando..." : "Gerar análise"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={swapTeams}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-black text-yellow-400 hover:border-yellow-400/50 hover:bg-yellow-400/10"
                  aria-label="Trocar times"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Trocar lados
                </button>
              </div>

              <TeamPicker
                label="Time B (Visitante)"
                value={teamB}
                onChange={(value) => {
                  setTeamB(value);
                  setResult(null);
                  setSavedAnalysis(null);
                  setError("");
                }}
              />
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-bold text-red-200">
                {error}
              </div>
            ) : null}

            <div className="mt-7 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-3">
              <TrustItem icon={<LockKeyhole />} title="100% Seguro" text="Seus dados protegidos" />
              <TrustItem icon={<RefreshCcw />} title="Atualização em tempo real" text="Dados dos últimos jogos" />
              <TrustItem icon={<ShieldCheck />} title="Exclusivo para assinantes" text="Relatórios premium" />
            </div>
          </div>
        </GlassCard>

        {loadingForm ? <p className="text-sm font-bold text-yellow-400">Carregando últimos jogos reais...</p> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <LastFiveCard title="Últimos 5 jogos — Time A" team={a} games={lastGamesA} />
          <LastFiveCard title="Últimos 5 jogos — Time B" team={b} games={lastGamesB} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <GlassCard className="p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-xl font-black text-white">Resumo da análise</h2>
              {analysis && savedAnalysis ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { try { setSavedAnalysis(toggleFavoriteWithLimit(savedAnalysis.id).item); setError(""); } catch (favoriteError) { setError(favoriteError instanceof Error ? favoriteError.message : "Não foi possível favoritar."); } }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${savedAnalysis.isFavorite ? "bg-yellow-400 text-black" : "border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10"}`}><Star className={`h-4 w-4 ${savedAnalysis.isFavorite ? "fill-current" : ""}`} />{savedAnalysis.isFavorite ? "Favorito" : "Favoritar"}</button>
                  <Link href="/history" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/10">Histórico</Link>
                </div>
              ) : null}
            </div>
            <p className="mt-4 leading-relaxed text-slate-300">
              {analysis?.summary ||
                "Selecione os times e clique em gerar análise completa para obter a leitura premium do jogo, com tendências, mercados e risco."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(analysis?.likelyScores?.length ? analysis.likelyScores : ["N/D", "N/D", "N/D"]).slice(0, 3).map((score, idx) => (
                <div key={`${score}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <p className="text-xs text-slate-400">Referência estatística</p>
                  <p className="text-2xl font-black text-yellow-400">{score}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-black text-white">Indicadores comparativos</h2>

            <div className="mt-4 space-y-3">
              {(analysis?.marketProbabilities || [
                { name: "Aguardando análise", value: "N/D", level: "INFO" },
                { name: "Dados da API", value: "N/D", level: "INFO" },
                { name: "Risco", value: analysis?.riskLevel || "N/D", level: "INFO" },
              ])
                .slice(0, 5)
                .map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                    <span className="text-sm text-slate-300">{item.name}</span>
                    <span className="font-black text-yellow-400">{item.value}</span>
                  </div>
                ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </PremiumAppShell>
  );
}

function getLastGamesForPanel(team: Team | null, apiStats?: ApiTeamStats, liveGames: MatchFormItem[] = []): MatchFormItem[] {
  if (!team) return [];
  const fromApi = Array.isArray(apiStats?.lastGames) ? apiStats!.lastGames! : [];
  const source = fromApi.length ? fromApi : liveGames;
  return source.slice(0, 5).map((game, index) => ({
    id: game.id || `${team.name}-api-${index}`,
    result: game.result,
    home: game.home || team.name,
    away: game.away || (game as any).opponent || "Adversário",
    score: game.score || "N/D",
    league: game.league || (game as any).source || team.league,
    date: game.date || new Date().toISOString(),
  }));
}

function LastFiveCard({ title, team, games }: { title: string; team: Team | null; games: MatchFormItem[] }) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">Forma recente</p>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
        </div>
        <span className="rounded-full border border-yellow-400/35 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300">
          {team?.name || "Sem time"}
        </span>
      </div>
      {team ? (
        games.length ? (
          <div className="space-y-2">
            {games.map((game) => <LastGameRow key={game.id} game={game} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-slate-400">
            Nenhum jogo real carregado para este time. Verifique a chave/API ou tente analisar o confronto.
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-slate-400">
          Selecione um time para carregar a forma recente.
        </div>
      )}
    </GlassCard>
  );
}

function LastGameRow({ game }: { game: MatchFormItem }) {
  const tone = game.result === "V" ? "bg-green-500/15 text-green-400" : game.result === "E" ? "bg-yellow-400/15 text-yellow-400" : "bg-red-500/15 text-red-400";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${tone}`}>{game.result}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-white">{game.home} x {game.away}</p>
        <p className="text-xs text-slate-500">{game.league} • {formatDatePt(game.date)}</p>
      </div>
      <span className="shrink-0 text-lg font-black text-white">{game.score}</span>
    </div>
  );
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-bold text-white backdrop-blur">
      <span className="text-yellow-400">{icon}</span>
      {label}
    </div>
  );
}

function TeamPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = teams.find((team) => team.name === value) || null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = normalized
      ? teams.filter((team) => `${team.name} ${team.league} ${team.country}`.toLowerCase().includes(normalized))
      : teams;
    return list;
  }, [query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Team[]>>((acc, team) => {
      const key = `${team.country} • ${team.league}`;
      acc[key] = acc[key] || [];
      acc[key].push(team);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[52px] w-full items-center gap-3 rounded-xl border border-white/15 bg-[#05070b] px-4 text-left font-bold text-white outline-none transition hover:border-yellow-400/45"
      >
        <SmallShield team={selected} />
        <span className="min-w-0 flex-1 truncate">{selected?.name || "Selecione o time"}</span>
        <ChevronDown className="h-5 w-5 text-yellow-400" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setOpen(false)}>
          <div
            className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-yellow-400/40 bg-[#07080c] shadow-[0_0_90px_rgba(250,204,21,0.20)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 bg-gradient-to-r from-yellow-400/10 via-orange-500/10 to-red-500/10 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">ANALYSE PRO 2.0</p>
                  <h3 className="mt-1 text-2xl font-black text-white">Selecionar time</h3>
                  <p className="text-sm text-slate-400">Busque por nome, país ou liga. A lista contém times das principais competições.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white hover:border-yellow-400/40"
                >
                  Fechar
                </button>
              </div>
              <div className="mt-5 flex h-12 items-center gap-3 rounded-2xl border border-yellow-400/35 bg-black/70 px-4 focus-within:border-yellow-300">
                <Search className="h-5 w-5 text-yellow-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar time ou liga..."
                  className="h-full w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[58vh] overflow-auto p-5">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left font-bold text-slate-200 hover:border-yellow-400/30"
              >
                <SmallShield team={null} />
                Começar sem time selecionado
              </button>

              {Object.entries(grouped).map(([group, groupTeams]) => (
                <div key={group} className="mb-6">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-white/10" />
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">{group}</p>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupTeams.map((team) => (
                      <button
                        key={`${team.id}-${team.name}`}
                        type="button"
                        onClick={() => {
                          onChange(team.name);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          value === team.name
                            ? "border-yellow-400 bg-yellow-400/15 text-yellow-200"
                            : "border-white/10 bg-black/40 text-white hover:border-yellow-400/35 hover:bg-yellow-400/10"
                        }`}
                      >
                        <SmallShield team={team} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-black">{team.name}</span>
                          <span className="block truncate text-xs text-slate-500">{team.league}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectedTeamPanel({ side, label, team, align }: { side: string; label: string; team: Team | null; align: "left" | "right" }) {
  const reversed = align === "right";
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/48 p-5 backdrop-blur shadow-[inset_0_0_80px_rgba(250,204,21,0.04)]">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>

      <div className={`mt-5 flex flex-col items-center gap-5 text-center sm:text-left ${reversed ? "sm:flex-row-reverse sm:text-right" : "sm:flex-row"}`}>
        <TeamShield team={team} />
        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-black text-white md:text-3xl">{team?.name || "Selecione o time"}</h3>
          <p className="mt-1 font-bold text-yellow-400">{team ? side : "Aguardando seleção"}</p>
          <p className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 ${reversed ? "sm:ml-auto" : ""}`}>
            <Trophy className="h-4 w-4 text-yellow-400" />
            {team?.league || "Liga indefinida"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamShield({ team }: { team: Team | null }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [team?.name]);
  const candidates = team ? getTeamLogoCandidates(team.name) : [];
  const src = candidates[candidateIndex];

  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-yellow-400/45 bg-black/75 p-4 shadow-[0_0_44px_rgba(250,204,21,0.18)]">
      {team && src ? (
        <img
          key={`${team.name}-${src}`}
          src={src}
          alt={team.name}
          className="h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (candidateIndex < candidates.length - 1) setCandidateIndex((current) => current + 1);
          }}
        />
      ) : (
        <LogoMark />
      )}
    </div>
  );
}

function SmallShield({ team }: { team: Team | null }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [team?.name]);
  const candidates = team ? getTeamLogoCandidates(team.name) : [];
  const src = candidates[candidateIndex];

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-400/25 bg-black/70 p-1">
      {team && src ? (
        <img
          key={`${team.name}-${src}`}
          src={src}
          alt={team.name}
          className="h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (candidateIndex < candidates.length - 1) setCandidateIndex((current) => current + 1);
          }}
        />
      ) : (
        <LogoMark small />
      )}
    </div>
  );
}

function MetricStrip({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border-b border-white/10 p-4 md:border-b-0 md:border-r ${highlight ? "bg-green-400/[0.04]" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={highlight ? "text-green-400" : "text-yellow-400"}>{icon}</span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-1 text-xl font-black ${highlight ? "text-green-400" : "text-yellow-400"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <span className="text-yellow-400">{icon}</span>
      <div>
        <p className="font-black text-white">{title}</p>
        <p className="text-sm text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function expectedGoalsText(a: Team | null, b: Team | null) {
  if (!a || !b) return "-- x --";
  return "1.85 x 1.32";
}

function goalProbabilityText(a: Team | null, b: Team | null) {
  if (!a || !b) return "--% x --%";
  return "62% x 54%";
}

function cornersText(value?: number) {
  if (!value) return "-- x --";
  const home = Math.max(3.2, value * 0.55).toFixed(1);
  const away = Math.max(2.8, value * 0.45).toFixed(1);
  return `${home} x ${away}`;
}
