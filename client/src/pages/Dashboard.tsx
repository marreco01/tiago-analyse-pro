import { useEffect, useMemo, useState } from "react";
import { PremiumAppShell, GlassCard, MiniStat } from "@/components/PremiumShell";
import { Activity, BarChart3, Crown, Flame, Radio, ShieldCheck, Target, Trophy, Wallet, X, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/localAuth";
import { dailyTips, normalizedPlan, visibleTipsFromList, type DailyTip } from "@/data/dailyTips";
import { teams } from "@/data/teams";
import { fetchTodayGames } from "@/lib/footballLive";

type RealGame = {
  id: string;
  fixtureId?: string;
  date?: string;
  time: string;
  status?: string;
  league?: string;
  country?: string;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

type AnalyseScore = {
  home: number;
  draw: number;
  away: number;
  confidence: number;
  market: string;
  warning?: string;
};

export default function Dashboard() {
  const user = getCurrentUser();
  const [realGames, setRealGames] = useState<RealGame[]>([]);
  const [realGamesError, setRealGamesError] = useState("");
  const [selectedGame, setSelectedGame] = useState<RealGame | null>(null);
  const [dailyReports, setDailyReports] = useState<DailyTip[]>(dailyTips);

  useEffect(() => {
    let cancelled = false;
    fetchTodayGames(30)
      .then((games) => { if (!cancelled) setRealGames(games as RealGame[]); })
      .catch((error) => { if (!cancelled) setRealGamesError(error instanceof Error ? error.message : "Erro ao carregar jogos reais."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/football/reports?limit=10")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.reports) && data.reports.length) {
          setDailyReports(data.reports as DailyTip[]);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const plan = normalizedPlan(user);
  const reports = visibleTipsFromList(dailyReports, user);
  const avgConfidence = Math.round(reports.reduce((sum, report) => sum + report.confidence, 0) / Math.max(1, reports.length));
  const smartGames = useMemo(() => buildSmartAnalyses(realGames), [realGames]);
  const topAnalyses = smartGames.slice(0, 5);
  const liveGames = smartGames.filter((item) => isLiveStatus(item.status)).slice(0, 5);
  const topOver = [...smartGames].sort((a, b) => b.over15 - a.over15).slice(0, 3);
  const topBtts = [...smartGames].sort((a, b) => b.btts - a.btts).slice(0, 3);
  const topCorners = [...smartGames].sort((a, b) => b.corners - a.corners).slice(0, 3);
  const topConfidence = topAnalyses[0]?.score.confidence || 0;

  return (
    <PremiumAppShell>
      <div className="space-y-4">
        <GlassCard className="p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-3xl font-black">
                Bem-vindo, {user?.name?.split(" ")[0] || "Usuário"}! <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm text-black">♛ {plan}</span>
              </h1>
              <p className="mt-2 text-slate-400">
                {plan === "FREE" ? "Plano grátis: 5 relatórios estatísticos liberados por dia." : "Plano premium: relatórios estatísticos completos liberados."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-slate-400">Plano Atual</p>
              <div className="flex items-center gap-5">
                <p className="text-xl font-black text-yellow-400">{plan}</p>
                <a href="/plans" className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-black text-black">Gerenciar Plano</a>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MiniStat label="Jogos analisados" value={String(realGames.length || "...")} icon={<Target className="h-5 w-5" />} tone="yellow" />
            <MiniStat label="Top confiança" value={topConfidence ? `${topConfidence}%` : "--"} icon={<ShieldCheck className="h-5 w-5" />} tone="orange" />
            <MiniStat label="Ao vivo" value={String(realGames.filter((game) => isLiveStatus(game.status)).length)} icon={<Radio className="h-5 w-5" />} tone="yellow" />
            <MiniStat label="Jogos analisados" value={String(smartGames.filter((item) => item.over15 >= 74).length)} icon={<Zap className="h-5 w-5" />} tone="orange" />
            <MiniStat label="Ranking" value={plan === "FREE" ? "Público" : "Premium"} icon={<Crown className="h-5 w-5" />} tone="red" />
          </div>
        </GlassCard>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="overflow-hidden p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black"><Flame className="h-5 w-5 text-orange-400" /> Top 5 Leituras do Dia</h2>
                <p className="mt-1 text-sm text-slate-400">Ranking inicial gerado com os jogos reais carregados da API.</p>
              </div>
              <span className="rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-black text-yellow-400">IA</span>
            </div>
            <div className="space-y-2">
              {topAnalyses.length ? topAnalyses.map((item, index) => (
                <SmartGameRow key={item.id} item={item} index={index} onClick={() => { if (item.fixtureId) window.location.href = `/match-center?fixture=${encodeURIComponent(item.fixtureId)}&home=${encodeURIComponent(item.home)}&away=${encodeURIComponent(item.away)}`; else setSelectedGame(item); }} />
              )) : <EmptySmartMessage text="Carregando ranking inteligente..." />}
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden p-6">
            <div className="mb-5">
              <h2 className="flex items-center gap-2 text-xl font-black"><Trophy className="h-5 w-5 text-yellow-400" /> Indicadores comparativos</h2>
              <p className="mt-1 text-sm text-slate-400">Leituras estatísticas para comparar jogos do dia.</p>
            </div>
            <MarketBlock title="Média de gols" items={topOver} field="over15" onSelect={setSelectedGame} />
            <MarketBlock title="Gols das duas equipas" items={topBtts} field="btts" onSelect={setSelectedGame} />
            <MarketBlock title="Escanteios" items={topCorners} field="corners" onSelect={setSelectedGame} />
          </GlassCard>
        </div>

        {liveGames.length ? (
          <GlassCard className="overflow-hidden p-6">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black"><Activity className="h-5 w-5 text-green-400" /> Jogos ao vivo com potencial</h2>
                <p className="mt-1 text-sm text-slate-400">Partidas em andamento com leitura rápida do Índice Analyse Pro.</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {liveGames.map((item) => <LivePotentialCard key={item.id} item={item} onClick={() => { if (item.fixtureId) window.location.href = `/match-center?fixture=${encodeURIComponent(item.fixtureId)}&home=${encodeURIComponent(item.home)}&away=${encodeURIComponent(item.away)}`; else setSelectedGame(item); }} />)}
            </div>
          </GlassCard>
        ) : null}

        <GlassCard className="overflow-hidden p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black">Jogos reais de hoje</h2>
              <p className="mt-1 text-sm text-slate-400">Dados puxados da API-Football. Clique num jogo para abrir o Índice Analyse Pro.</p>
            </div>
            <a href="/upcoming" className="text-sm font-black text-yellow-400 hover:text-orange-300">Ver calendário completo</a>
          </div>
          {realGamesError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{realGamesError}</div>
          ) : realGames.length ? (
            <div className="space-y-2">
              {realGames.map((game) => (
                <div onClick={() => { if (game.fixtureId) window.location.href = `/match-center?fixture=${encodeURIComponent(game.fixtureId)}&home=${encodeURIComponent(game.home)}&away=${encodeURIComponent(game.away)}`; else setSelectedGame(game); }} key={game.id} className="grid cursor-pointer items-center gap-4 rounded-xl border border-white/5 bg-white/[0.035] px-4 py-3 text-sm transition hover:border-yellow-400/25 hover:bg-yellow-400/[0.045] md:grid-cols-[1.1fr_80px_2fr_90px]">
                  <div>
                    <p className="font-bold text-slate-200">{game.league}</p>
                    <p className="text-xs text-slate-500">{game.country || "Competição"}</p>
                  </div>
                  <p className="font-black text-white">{game.time}</p>
                  <div className="flex min-w-0 items-center gap-3 text-slate-200">
                    <TeamLogo src={game.homeLogo || "/favicon.png"} name={game.home} />
                    <span className="truncate font-bold">{game.home}</span>
                    <span className="shrink-0 text-yellow-400">x</span>
                    <TeamLogo src={game.awayLogo || "/favicon.png"} name={game.away} />
                    <span className="truncate font-bold">{game.away}</span>
                  </div>
                  <p className="rounded-lg bg-yellow-400/15 px-2 py-1 text-center font-black text-yellow-400">{game.status || "NS"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">Carregando jogos reais...</div>
          )}
        </GlassCard>

        <GlassCard className="overflow-hidden p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black">Relatórios</h2>
              <p className="mt-1 text-sm text-slate-400">{plan === "FREE" ? "Você está vendo 5 relatórios básicos. PRO e VIP liberam os 10 relatórios completos." : `Você está vendo os ${dailyReports.length} relatórios completos disponíveis para assinantes.`}</p>
            </div>
            <a href="/reports" className="text-sm font-black text-yellow-400 hover:text-orange-300">Ver página completa</a>
          </div>
          <div className="space-y-2">
            {reports.map((report) => <TipRow key={report.id} tip={report} />)}
          </div>
          {plan === "FREE" ? (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
              Existem mais 5 relatórios bloqueados hoje. Assine PRO ou VIP para liberar a lista completa.
            </div>
          ) : null}
        </GlassCard>

        <div className="grid gap-4 lg:grid-cols-3">
          <GlassCard className="p-6"><Trophy className="mb-4 h-8 w-8 text-yellow-400" /><h3 className="font-black">Análises Profissionais</h3><p className="mt-2 text-sm text-slate-400">Modelos e estatísticas para acompanhar confrontos com mais informação.</p></GlassCard>
          <GlassCard className="p-6"><BarChart3 className="mb-4 h-8 w-8 text-yellow-400" /><h3 className="font-black">Estatísticas Avançadas</h3><p className="mt-2 text-sm text-slate-400">Dados organizados para tomar leituras mais completas antes dos jogos.</p></GlassCard>
          <GlassCard className="p-6"><Target className="mb-4 h-8 w-8 text-yellow-400" /><h3 className="font-black">Relatórios Premium</h3><p className="mt-2 text-sm text-slate-400">Relatórios premium com indicadores, amostras e qualidade dos dados.</p></GlassCard>
        </div>
      </div>

      {selectedGame ? <AnalyseModal game={selectedGame} onClose={() => setSelectedGame(null)} /> : null}
    </PremiumAppShell>
  );
}

type SmartGame = RealGame & {
  score: AnalyseScore;
  over15: number;
  btts: number;
  corners: number;
};

function SmartGameRow({ item, index, onClick }: { item: SmartGame; index: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.035] px-4 py-3 text-left text-sm transition hover:border-yellow-400/25 hover:bg-yellow-400/[0.045] md:grid-cols-[44px_1fr_110px_120px]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/15 font-black text-yellow-400">#{index + 1}</div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo src={item.homeLogo || "/favicon.png"} name={item.home} />
          <p className="truncate font-black text-white">{item.home} x {item.away}</p>
          <TeamLogo src={item.awayLogo || "/favicon.png"} name={item.away} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{item.league} • {item.country || "Competição"} • {item.status || "NS"}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Leitura estatística</p>
        <p className="font-black text-yellow-400">{item.score.market.replace("Pré-jogo: ", "")}</p>
      </div>
      <div className="rounded-xl bg-green-400/10 px-3 py-2 text-center">
        <p className="text-xs text-slate-400">Qualidade dos dados</p>
        <p className="text-xl font-black text-green-400">{item.score.confidence}%</p>
      </div>
    </button>
  );
}

function MarketBlock({ title, items, field, onSelect }: { title: string; items: SmartGame[]; field: "over15" | "btts" | "corners"; onSelect: (game: RealGame) => void }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-black text-slate-200">{title}</p>
        <p className="text-xs font-bold text-slate-500">Top 3</p>
      </div>
      <div className="space-y-2">
        {items.length ? items.map((item) => (
          <button key={`${title}-${item.id}`} onClick={() => onSelect(item)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-left transition hover:border-yellow-400/25">
            <span className="min-w-0 truncate text-sm font-bold text-slate-200">{item.home} x {item.away}</span>
            <span className="shrink-0 rounded-lg bg-yellow-400/15 px-2 py-1 text-sm font-black text-yellow-400">{item[field]}%</span>
          </button>
        )) : <EmptySmartMessage text="Aguardando dados..." compact />}
      </div>
    </div>
  );
}

function LivePotentialCard({ item, onClick }: { item: SmartGame; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-green-400/10 bg-green-400/[0.035] p-4 text-left transition hover:border-green-400/30">
      <div className="flex items-center justify-between gap-3">
        <p className="rounded-lg bg-green-400/10 px-2 py-1 text-xs font-black text-green-400">{item.status}</p>
        <p className="text-sm font-black text-yellow-400">{item.score.confidence}% IA</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <TeamLogo src={item.homeLogo || "/favicon.png"} name={item.home} />
        <p className="min-w-0 flex-1 truncate font-black">{item.home}</p>
        <span className="font-black text-yellow-400">{typeof item.homeGoals === "number" ? item.homeGoals : "-"}</span>
        <span className="text-slate-500">x</span>
        <span className="font-black text-yellow-400">{typeof item.awayGoals === "number" ? item.awayGoals : "-"}</span>
        <p className="min-w-0 flex-1 truncate text-right font-black">{item.away}</p>
        <TeamLogo src={item.awayLogo || "/favicon.png"} name={item.away} />
      </div>
      <p className="mt-3 text-sm text-slate-400">{item.score.market}</p>
    </button>
  );
}

function EmptySmartMessage({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`rounded-xl border border-white/10 bg-black/20 text-sm text-slate-400 ${compact ? "p-2" : "p-4"}`}>{text}</div>;
}

function AnalyseModal({ game, onClose }: { game: RealGame; onClose: () => void }) {
  const score = useMemo(() => calculateAnalyseScore(game), [game]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-3xl border border-yellow-400/25 bg-[#0b1222] p-6 text-white shadow-[0_0_70px_rgba(250,204,21,0.15)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-yellow-400">Índice Analyse Pro</p>
            <h2 className="mt-1 text-2xl font-black">{game.home} x {game.away}</h2>
            <p className="mt-1 text-sm text-slate-400">{game.league || "Competição"} • {game.country || ""} • {game.status || "NS"}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:border-yellow-400/40 hover:text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-[1fr_auto_1fr]">
          <TeamModalSide name={game.home} logo={game.homeLogo} label="Casa" goals={game.homeGoals} />
          <div className="text-center text-3xl font-black text-yellow-400">VS</div>
          <TeamModalSide name={game.away} logo={game.awayLogo} label="Fora" goals={game.awayGoals} right />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <ScoreBox label="Casa" value={`${score.home}%`} />
          <ScoreBox label="Empate" value={`${score.draw}%`} />
          <ScoreBox label="Fora" value={`${score.away}%`} />
          <ScoreBox label="Qualidade dos dados" value={`${score.confidence}%`} highlight />
        </div>

        <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
          <p className="font-black text-yellow-300">Leitura inicial: {score.market}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {score.warning || "Cálculo inicial usando status do jogo, mandante/visitante, placar atual quando disponível e IDs reais da API-Football. Sem dados suficientes de forma/H2H nesta versão, o sistema reduz a confiança automaticamente."}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamModalSide({ name, logo, label, goals, right = false }: { name: string; logo?: string; label: string; goals?: number | null; right?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${right ? "md:flex-row-reverse md:text-right" : ""}`}>
      <TeamLogo src={logo || "/favicon.png"} name={name} size="lg" />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-slate-400">{label}</p>
        <p className="truncate text-xl font-black">{name}</p>
        {typeof goals === "number" ? <p className="text-sm font-bold text-yellow-400">Gols: {goals}</p> : null}
      </div>
    </div>
  );
}

function ScoreBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-green-400/20 bg-green-400/10" : "border-white/10 bg-black/30"}`}>
      <p className="text-sm text-slate-300">{label}</p>
      <p className={`mt-1 text-3xl font-black ${highlight ? "text-green-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function buildSmartAnalyses(games: RealGame[]): SmartGame[] {
  return games
    .filter((game) => String(game.status || "").toUpperCase() !== "FT")
    .map((game) => {
      const score = calculateAnalyseScore(game);
      return {
        ...game,
        score,
        over15: estimateOver15(game, score),
        btts: estimateBtts(game, score),
        corners: estimateCorners(game, score),
      };
    })
    .sort((a, b) => b.score.confidence - a.score.confidence);
}

function isLiveStatus(status?: string) {
  return ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(String(status || "").toUpperCase());
}

function estimateOver15(game: RealGame, score: AnalyseScore) {
  const goals = (typeof game.homeGoals === "number" ? game.homeGoals : 0) + (typeof game.awayGoals === "number" ? game.awayGoals : 0);
  const liveBoost = isLiveStatus(game.status) ? 10 : 0;
  return Math.max(48, Math.min(91, Math.round(58 + goals * 9 + liveBoost + (score.confidence - 50) * 0.35)));
}

function estimateBtts(game: RealGame, score: AnalyseScore) {
  const bothScored = typeof game.homeGoals === "number" && typeof game.awayGoals === "number" && game.homeGoals > 0 && game.awayGoals > 0;
  const oneScored = (typeof game.homeGoals === "number" && game.homeGoals > 0) || (typeof game.awayGoals === "number" && game.awayGoals > 0);
  return Math.max(34, Math.min(84, Math.round(45 + (bothScored ? 24 : oneScored ? 9 : 0) + (score.confidence - 50) * 0.25)));
}

function estimateCorners(game: RealGame, score: AnalyseScore) {
  const liveBoost = isLiveStatus(game.status) ? 8 : 0;
  const tiedBoost = game.homeGoals === game.awayGoals && isLiveStatus(game.status) ? 6 : 0;
  return Math.max(38, Math.min(86, Math.round(50 + liveBoost + tiedBoost + (score.confidence - 50) * 0.28)));
}

function calculateAnalyseScore(game: RealGame): AnalyseScore {
  const status = String(game.status || "NS").toUpperCase();
  const live = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(status);
  const homeGoals = typeof game.homeGoals === "number" ? game.homeGoals : null;
  const awayGoals = typeof game.awayGoals === "number" ? game.awayGoals : null;

  let home = 42;
  let draw = 28;
  let away = 30;
  let confidence = 54;
  let market = "Dados insuficientes para tendência forte";

  if (game.homeId && game.awayId) confidence += 8;
  if (game.homeLogo && game.awayLogo) confidence += 5;

  if (live && homeGoals !== null && awayGoals !== null) {
    const diff = homeGoals - awayGoals;
    confidence += 15;
    if (diff > 0) {
      home = Math.min(78, 48 + diff * 12);
      draw = Math.max(12, 26 - diff * 5);
      away = Math.max(10, 100 - home - draw);
      market = `Mandante em vantagem no jogo ao vivo (${homeGoals} x ${awayGoals})`;
    } else if (diff < 0) {
      away = Math.min(78, 48 + Math.abs(diff) * 12);
      draw = Math.max(12, 26 - Math.abs(diff) * 5);
      home = Math.max(10, 100 - away - draw);
      market = `Visitante em vantagem no jogo ao vivo (${homeGoals} x ${awayGoals})`;
    } else {
      home = 37; draw = 34; away = 29;
      market = `Jogo equilibrado ao vivo (${homeGoals} x ${awayGoals})`;
    }
  } else if (status === "NS" || status === "TBD") {
    home = 44; draw = 28; away = 28;
    market = "Pré-jogo: leve vantagem do mandante";
  }

  const total = home + draw + away;
  home = Math.round((home / total) * 100);
  draw = Math.round((draw / total) * 100);
  away = 100 - home - draw;
  confidence = Math.max(35, Math.min(82, Math.round(confidence)));

  const warning = confidence < 65 ? "Dados reais recebidos, mas ainda faltam forma recente e H2H para uma leitura forte. Use como pré-análise, não como decisão final." : undefined;
  return { home, draw, away, confidence, market, warning };
}

export function TipRow({ tip, locked = false }: { tip: DailyTip; locked?: boolean }) {
  const homeTeam = teams.find((team) => team.name === tip.home);
  const awayTeam = teams.find((team) => team.name === tip.away);
  const homeLogo = tip.homeLogo || homeTeam?.logo || "/favicon.png";
  const awayLogo = tip.awayLogo || awayTeam?.logo || "/favicon.png";

  return (
    <div
      className={`grid items-center gap-4 rounded-xl border px-4 py-3 text-sm md:grid-cols-[1.1fr_80px_2fr_1fr_70px_110px] ${
        locked
          ? "pointer-events-none select-none border-white/5 bg-black/20 opacity-10 blur-[5px] grayscale"
          : "border-white/5 bg-white/[0.035] hover:border-yellow-400/20 hover:bg-yellow-400/[0.035]"
      }`}
    >
      <div>
        <p className="font-bold text-slate-200">{tip.league}</p>
        <p className="text-xs text-slate-500">{tip.access === "FREE" ? "Básico" : tip.access}</p>
      </div>

      <p className="font-black text-white">{tip.time}</p>

      <div className="flex min-w-0 items-center gap-3 text-slate-200">
        <TeamLogo src={homeLogo} name={tip.home} />
        <span className="truncate font-bold">{tip.home}</span>
        <span className="shrink-0 text-yellow-400">x</span>
        <TeamLogo src={awayLogo} name={tip.away} />
        <span className="truncate font-bold">{tip.away}</span>
      </div>

      <p className="font-semibold text-slate-200">{tip.indicator}</p>
      <p className="font-black text-white">{tip.value}</p>
      <p className="rounded-lg bg-green-500/15 px-2 py-1 text-center font-black text-green-400">{tip.confidence}%</p>
    </div>
  );
}

function TeamLogo({ src, name, size = "sm" }: { src: string; name: string; size?: "sm" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const finalSrc = src?.includes("media.api-sports.io") ? `/api/football/logo?url=${encodeURIComponent(src)}` : src;
  const className = size === "lg" ? "h-16 w-16 rounded-full bg-white object-contain p-1" : "h-7 w-7 rounded-full bg-white object-contain p-0.5";
  return (
    <img
      src={failed ? "/favicon.png" : finalSrc}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
