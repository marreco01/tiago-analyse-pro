import { useEffect, useMemo, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { fetchLiveRobotGames, refreshLiveRobotFromApi } from "@/lib/liveRobot";
import { Activity, AlertTriangle, Bell, BellOff, CornerDownRight, Filter, Flame, Goal, MessageCircle, RefreshCw, Search, ShieldCheck, Target, TrendingUp, Volume2, Zap } from "lucide-react";

type LiveStats = {
  shots: [number | null, number | null];
  shotsOnGoal: [number | null, number | null];
  corners: [number | null, number | null];
  yellowCards: [number | null, number | null];
  redCards: [number | null, number | null];
  possession: [number | null, number | null];
};

type LiveGame = {
  id: string;
  fixtureId: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  country?: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals: number | null;
  awayGoals: number | null;
  stats: LiveStats;
  pressure: { home: number; away: number };
  alerts: string[];
  observations: string[];
  activityIndex: number;
  liveRoom: string;
};

type LiveResponse = {
  success: boolean;
  games?: LiveGame[];
  updatedAt?: string;
  demoMode?: boolean;
  notice?: string;
  error?: string;
};

const importantLeagues = ["brasileirão", "libertadores", "champions", "premier league", "serie a", "série a"];

function n(value: number | null | undefined, fallback = "--") {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

function pct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value}%` : "--%";
}

function score(game: LiveGame) {
  return `${n(game.homeGoals, "0")} x ${n(game.awayGoals, "0")}`;
}


type AlertType = "goal" | "corner" | "both" | "card";
type TrendAlert = { type: AlertType; label: string; level: number; message: string };

const ALERT_STORAGE_KEY = "tap_live_sound_alerts";

function getAlertStorageDefault() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ALERT_STORAGE_KEY) === "1";
}

function buildTrendAlerts(game: LiveGame): TrendAlert[] {
  const alerts: TrendAlert[] = [];
  const pressureMax = Math.max(game.pressure.home || 0, game.pressure.away || 0);
  const shotsTotal = (game.stats.shots[0] || 0) + (game.stats.shots[1] || 0);
  const shotsOnGoalTotal = (game.stats.shotsOnGoal[0] || 0) + (game.stats.shotsOnGoal[1] || 0);
  const cornersTotal = (game.stats.corners[0] || 0) + (game.stats.corners[1] || 0);
  const cardsTotal = (game.stats.yellowCards[0] || 0) + (game.stats.yellowCards[1] || 0) + (game.stats.redCards[0] || 0) + (game.stats.redCards[1] || 0);
  const elapsed = game.elapsed || 0;
  const scoreTotal = (game.homeGoals || 0) + (game.awayGoals || 0);

  if (game.activityIndex >= 72 || pressureMax >= 76 || shotsOnGoalTotal >= 5) {
    alerts.push({ type: "goal", label: "Gol", level: Math.max(game.activityIndex, pressureMax), message: `Possibilidade de gol: pressão em ${pressureMax}% e atividade em ${game.activityIndex}%.` });
  }
  if (cornersTotal >= 6 || (pressureMax >= 68 && elapsed >= 20)) {
    alerts.push({ type: "corner", label: "Escanteio", level: Math.max(pressureMax, Math.min(95, cornersTotal * 10)), message: `Possibilidade de escanteio: volume ofensivo alto e ${cornersTotal} cantos no jogo.` });
  }
  if (elapsed >= 25 && scoreTotal >= 1 && game.activityIndex >= 58 && ((game.homeGoals || 0) === 0 || (game.awayGoals || 0) === 0)) {
    alerts.push({ type: "both", label: "Ambas", level: game.activityIndex, message: "Tendência para ambas marcam: jogo aberto e uma equipa ainda não marcou." });
  }
  if (cardsTotal >= 2 || (elapsed >= 30 && pressureMax >= 70)) {
    alerts.push({ type: "card", label: "Cartão", level: Math.max(55, pressureMax - 5), message: `Possibilidade de cartão: jogo intenso, pressão alta e ${cardsTotal} cartões.` });
  }

  if (!alerts.length && shotsTotal >= 8 && game.activityIndex >= 55) {
    alerts.push({ type: "goal", label: "Atenção", level: game.activityIndex, message: "Jogo ganhando ritmo ofensivo. Monitorar entrada ao vivo." });
  }

  return alerts.sort((a, b) => b.level - a.level).slice(0, 4);
}

function playTrendSound(type: AlertType) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const base = type === "goal" ? 880 : type === "corner" ? 660 : type === "both" ? 740 : 520;
    [0, 0.11, 0.22].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = base + index * 55;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  } catch {}
}

function openLiveRoom(game: LiveGame) {
  const fixture = String(game.fixtureId || game.id || `${game.home}-${game.away}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  window.dispatchEvent(new CustomEvent("tap-open-live-chat", {
    detail: {
      roomId: `match:${fixture}`,
      roomLabel: `Sala ${game.home} x ${game.away}`,
      matchLabel: `${game.elapsed ? `${game.elapsed}' • ` : ""}${game.home} ${score(game)} ${game.away}`,
      fixtureId: fixture,
    },
  }));
}

function isImportantLeague(game: LiveGame) {
  const text = `${game.league} ${game.country || ""}`.toLowerCase();
  return importantLeagues.some((league) => text.includes(league));
}

function filterGames(games: LiveGame[], filter: string, query: string) {
  const q = query.trim().toLowerCase();
  return games.filter((game) => {
    const text = `${game.home} ${game.away} ${game.league} ${game.country || ""}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (filter === "important") return isImportantLeague(game);
    if (filter === "pressure") return Math.max(game.pressure.home, game.pressure.away) >= 70;
    if (filter === "goal") return game.activityIndex >= 68;
    return true;
  });
}


const LIVE_FLAG_CODES: Record<string, string> = {
  "iraq": "iq", "iraque": "iq",
  "norway": "no", "noruega": "no",
  "united states": "us", "usa": "us", "estados unidos": "us",
  "paraguay": "py", "paraguai": "py",
  "australia": "au", "austrália": "au",
  "turkey": "tr", "turkiye": "tr", "turquia": "tr",
  "brazil": "br", "brasil": "br",
  "morocco": "ma", "marrocos": "ma",
  "haiti": "ht", "scotland": "gb-sct", "escócia": "gb-sct", "escocia": "gb-sct",
  "france": "fr", "frança": "fr", "franca": "fr", "senegal": "sn",
  "argentina": "ar", "algeria": "dz", "argélia": "dz", "argelia": "dz",
  "germany": "de", "alemanha": "de", "portugal": "pt", "spain": "es", "espanha": "es",
  "england": "gb-eng", "inglaterra": "gb-eng", "croatia": "hr", "croácia": "hr", "croacia": "hr",
  "japan": "jp", "japão": "jp", "japao": "jp", "sweden": "se", "suécia": "se", "suecia": "se",
  "netherlands": "nl", "holanda": "nl", "países baixos": "nl", "paises baixos": "nl",
  "belgium": "be", "bélgica": "be", "belgica": "be", "egypt": "eg", "egito": "eg",
  "iran": "ir", "irã": "ir", "new zealand": "nz", "nova zelândia": "nz", "nova zelandia": "nz",
};

function normalizeTeamName(value: string) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function flagUrlByTeamName(name: string) {
  const code = LIVE_FLAG_CODES[normalizeTeamName(name)] || "";
  return code ? `https://flagcdn.com/w80/${code}.png` : "";
}

function TeamLogo({ src, name, compact = false }: { src?: string; name: string; compact?: boolean }) {
  const effectiveSrc = src || flagUrlByTeamName(name);
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white ${compact ? "h-9 w-9" : "h-12 w-12"}`}>
      {effectiveSrc ? (
        <img
          src={effectiveSrc}
          alt={name}
          className="h-full w-full object-contain p-1"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : (
        <Activity className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-yellow-500`} />
      )}
    </div>
  );
}

function PressureBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-black">
        <span className="truncate text-slate-200">{label}</span>
        <span className={value >= 72 ? "text-green-400" : value >= 52 ? "text-yellow-400" : "text-slate-400"}>{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${value >= 72 ? "bg-green-400" : value >= 52 ? "bg-yellow-400" : "bg-slate-500"}`}
          style={{ width: `${Math.max(6, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4 text-yellow-400" />
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}


function MobileGameCard({ game }: { game: LiveGame }) {
  const cardsHome = (game.stats.yellowCards[0] || 0) + (game.stats.redCards[0] || 0);
  const cardsAway = (game.stats.yellowCards[1] || 0) + (game.stats.redCards[1] || 0);
  const matchUrl = `/match-center?fixture=${encodeURIComponent(game.fixtureId)}&home=${encodeURIComponent(game.home)}&away=${encodeURIComponent(game.away)}`;

  return (
    <a href={matchUrl} className="block rounded-[1.35rem] border border-white/10 bg-[#080b10]/95 p-4 shadow-xl md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-green-400">
            {game.status} {game.elapsed ? `• ${game.elapsed}'` : ""}
          </p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{game.league}</p>
        </div>
        <span className="rounded-full bg-green-500/15 px-3 py-1 text-[11px] font-black text-green-400">AO VIVO</span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_82px_1fr] items-center gap-2">
        <div className="min-w-0 text-center">
          <TeamLogo src={game.homeLogo} name={game.home} compact />
          <p className="mt-2 truncate text-sm font-black text-white">{game.home}</p>
        </div>

        <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-2 py-3 text-center">
          <p className="text-2xl font-black text-yellow-400">{score(game)}</p>
          <p className="mt-1 text-[10px] font-black uppercase text-slate-500">Placar</p>
        </div>

        <div className="min-w-0 text-center">
          <TeamLogo src={game.awayLogo} name={game.away} compact />
          <p className="mt-2 truncate text-sm font-black text-white">{game.away}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MobileStat label="Chutes" value={`${n(game.stats.shots[0])} x ${n(game.stats.shots[1])}`} />
        <MobileStat label="No gol" value={`${n(game.stats.shotsOnGoal[0])} x ${n(game.stats.shotsOnGoal[1])}`} />
        <MobileStat label="Cantos" value={`${n(game.stats.corners[0])} x ${n(game.stats.corners[1])}`} />
        <MobileStat label="Cartões" value={`${cardsHome} x ${cardsAway}`} />
      </div>

      <div className="mt-4">
        <MatchVote game={game} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-3">
          <p className="text-[10px] font-black uppercase text-green-400">Atividade</p>
          <p className="mt-1 text-2xl font-black text-green-400">{game.activityIndex}%</p>
        </div>
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
          <p className="text-[10px] font-black uppercase text-yellow-400">Maior pressão</p>
          <p className="mt-1 text-2xl font-black text-yellow-400">{Math.max(game.pressure.home, game.pressure.away)}%</p>
        </div>
      </div>

      {buildTrendAlerts(game).length ? (
        <div className="mt-3 space-y-2">
          {buildTrendAlerts(game).slice(0, 2).map((alert) => (
            <div key={`${game.id}-${alert.type}`} className="rounded-2xl border border-red-400/15 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">
              🔔 {alert.label}: {alert.message}
            </div>
          ))}
        </div>
      ) : game.alerts.length ? (
        <div className="mt-3 rounded-2xl border border-red-400/15 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">🚨 {game.alerts[0]}</div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openLiveRoom(game); }} aria-label={`Ativar chat da partida ${game.home} x ${game.away}`} title={`Ativar chat: ${game.home} x ${game.away}`} className="rounded-xl border border-yellow-400/25 py-3 text-center text-xs font-black text-yellow-400">Sala ao vivo</button>
        <div className="rounded-xl border border-green-400/25 py-3 text-center text-xs font-black text-green-400">Ver análise</div>
      </div>
    </a>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-2">
      <p className="text-[9px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-black text-white">{value}</p>
    </div>
  );
}


function MatchVote({ game }: { game: LiveGame }) {
  type VoteKey = "home" | "draw" | "away";
  const rawVoteId = [game.fixtureId || game.id, game.league, game.home, game.away, game.minute || game.status].filter(Boolean).join("-");
  const voteId = String(rawVoteId || `${game.home}-${game.away}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  const storageKey = `tap_match_vote:${voteId}`;

  const emptyVotes = { home: 0, draw: 0, away: 0, userVote: null as VoteKey | null };

  const getInitialVotes = () => {
    if (typeof window === "undefined") return emptyVotes;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          home: Math.max(0, Number(parsed.home) || 0),
          draw: Math.max(0, Number(parsed.draw) || 0),
          away: Math.max(0, Number(parsed.away) || 0),
          userVote: (parsed.userVote === "home" || parsed.userVote === "draw" || parsed.userVote === "away") ? parsed.userVote : null,
        };
      }
    } catch {}
    return emptyVotes;
  };

  const [votes, setVotes] = useState(getInitialVotes);
  const realTotalVotes = votes.home + votes.draw + votes.away;
  const totalVotes = Math.max(1, realTotalVotes);
  const percent = (value: number) => realTotalVotes === 0 ? 0 : Math.round((value / totalVotes) * 100);

  function vote(option: VoteKey) {
    setVotes((current) => {
      const next = { ...current };
      if (next.userVote && next[next.userVote] > 0) next[next.userVote] -= 1;
      next[option] += 1;
      next.userVote = option;
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const options: Array<{ key: VoteKey; label: string; short: string; value: number }> = [
    { key: "home", label: game.home, short: "Casa", value: votes.home },
    { key: "draw", label: "Empate", short: "Empate", value: votes.draw },
    { key: "away", label: game.away, short: "Fora", value: votes.away },
  ];

  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/8 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Quem vence?</p>
        <p className="text-[11px] font-black text-slate-500">{realTotalVotes} votos</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((item) => {
          const selected = votes.userVote === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); vote(item.key); }}
              className={`rounded-xl border px-2 py-3 text-center transition ${selected ? "border-yellow-400 bg-yellow-400 text-black" : "border-white/10 bg-black/30 text-white hover:border-yellow-400/40 hover:bg-yellow-400/10"}`}
            >
              <div className="truncate text-xs font-black">{item.short}</div>
              {votes.userVote ? <div className="mt-1 text-lg font-black">{percent(item.value)}%</div> : <div className="mt-1 text-[11px] font-bold text-slate-400">Votar</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: LiveGame }) {
  const possessionHome = game.stats.possession[0];
  const possessionAway = game.stats.possession[1];
  const cardsHome = (game.stats.yellowCards[0] || 0) + (game.stats.redCards[0] || 0);
  const cardsAway = (game.stats.yellowCards[1] || 0) + (game.stats.redCards[1] || 0);

  return (
    <>
      <MobileGameCard game={game} />
      <GlassCard className="hidden overflow-hidden border-yellow-400/15 md:block">
      <div className="grid gap-5 p-5 xl:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-green-400">{game.status} {game.elapsed ? `• ${game.elapsed}'` : ""}</div>
              <div className="mt-1 text-sm font-bold text-slate-400">{game.league} • {game.country || "Mundo"}</div>
            </div>
            <div className="rounded-full bg-green-400/10 px-4 py-2 text-sm font-black text-green-400">AO VIVO</div>
          </div>

          <div className="mt-5 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="flex items-center gap-3">
              <TeamLogo src={game.homeLogo} name={game.home} />
              <div>
                <div className="text-xl font-black text-white">{game.home}</div>
                <div className="text-sm font-bold text-slate-400">Mandante</div>
              </div>
            </div>
            <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-6 py-4 text-center">
              <div className="text-4xl font-black text-yellow-400">{score(game)}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">Placar</div>
            </div>
            <div className="flex items-center gap-3 md:justify-end">
              <div className="text-left md:text-right">
                <div className="text-xl font-black text-white">{game.away}</div>
                <div className="text-sm font-bold text-slate-400">Visitante</div>
              </div>
              <TeamLogo src={game.awayLogo} name={game.away} />
            </div>
          </div>

          <div className="mt-5">
            <MatchVote game={game} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatPill icon={Target} label="Chutes" value={`${n(game.stats.shots[0])} x ${n(game.stats.shots[1])}`} />
            <StatPill icon={Goal} label="No gol" value={`${n(game.stats.shotsOnGoal[0])} x ${n(game.stats.shotsOnGoal[1])}`} />
            <StatPill icon={CornerDownRight} label="Escanteios" value={`${n(game.stats.corners[0])} x ${n(game.stats.corners[1])}`} />
            <StatPill icon={ShieldCheck} label="Cartões" value={`${cardsHome} x ${cardsAway}`} />
            <StatPill icon={TrendingUp} label="Posse" value={`${pct(possessionHome)} x ${pct(possessionAway)}`} />
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/25 p-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-yellow-400">
              <Zap className="h-4 w-4" /> Pressão ofensiva
            </div>
            <div className="space-y-4">
              <PressureBar label={game.home} value={game.pressure.home} />
              <PressureBar label={game.away} value={game.pressure.away} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-green-400">Índice de atividade ofensiva</div>
              <div className="mt-1 text-3xl font-black text-green-400">{game.activityIndex}%</div>
            </div>
            <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openLiveRoom(game); }} aria-label={`Ativar chat da partida ${game.home} x ${game.away}`} title={`Ativar chat: ${game.home} x ${game.away}`} className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-left transition hover:bg-yellow-400/15">
              <div className="text-xs font-black uppercase tracking-wide text-yellow-400">Sala ao vivo</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-black text-white"><MessageCircle className="h-4 w-4" /> Entrar: {game.home} x {game.away}</div>
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-red-300">
              <AlertTriangle className="h-4 w-4" /> Alertas IA sonoros
            </div>
            <div className="space-y-2">
              {(buildTrendAlerts(game).length ? buildTrendAlerts(game).map((alert) => alert.message) : game.alerts).map((alert) => (
                <div key={alert} className="rounded-xl border border-red-400/15 bg-red-500/8 px-3 py-2 text-sm font-bold text-slate-200">🔔 {alert}</div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-orange-300">
              <Flame className="h-4 w-4" /> Observações ao vivo
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {game.observations.map((opportunity) => (
                <div key={opportunity} className="rounded-xl border border-yellow-400/15 bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-100">• {opportunity}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </GlassCard>
    </>
  );
}

export default function LiveGames() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(getAlertStorageDefault);
  const [lastAlerts, setLastAlerts] = useState<Record<string, number>>({});

  async function loadLiveGames() {
    setLoading(true);
    setError(null);
    try {
      const robot = await fetchLiveRobotGames(10);
      setGames(robot.games || []);
      setUpdatedAt(robot.updatedAt || new Date().toISOString());
      setDemoMode(false);
      setDemoNotice(robot.notice || "Robô Ao Vivo: cache interno carregado.");
      if (!robot.games?.length) {
        setError("Nenhuma partida real ao vivo encontrada nas fontes públicas monitoradas agora.");
      }
    } catch (err) {
      setGames([]);
      setDemoMode(false);
      setDemoNotice("Robô Ao Vivo multifontes não encontrou partida real neste momento.");
      setError(err instanceof Error ? err.message : "Sem dados reais ao vivo disponíveis agora.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshFromApiManually() {
    setLoading(true);
    setError(null);
    try {
      const data = await refreshLiveRobotFromApi();
      setGames(data.games || []);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setDemoMode(false);
      setDemoNotice(data.notice || "Robô Ao Vivo atualizado agora.");
      if (!data.games?.length) {
        setError("A atualização manual não encontrou partidas reais ao vivo.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar Robô Ao Vivo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLiveGames();
    const interval = window.setInterval(loadLiveGames, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(ALERT_STORAGE_KEY, soundEnabled ? "1" : "0");
    if (!soundEnabled || !games.length) return;
    const now = Date.now();
    const next = { ...lastAlerts };
    for (const game of games) {
      const alert = buildTrendAlerts(game)[0];
      if (!alert || alert.level < 65) continue;
      const key = `${game.fixtureId || game.id}:${alert.type}`;
      if (next[key] && now - next[key] < 180000) continue;
      playTrendSound(alert.type);
      next[key] = now;
      break;
    }
    setLastAlerts(next);
  }, [games, soundEnabled]);

  const filteredGames = useMemo(() => filterGames(games, filter, query), [games, filter, query]);
  const highPressure = games.filter((game) => Math.max(game.pressure.home, game.pressure.away) >= 70).length;
  const highGoal = games.filter((game) => game.activityIndex >= 68).length;
  const activeTrendAlerts = games.reduce((total, game) => total + buildTrendAlerts(game).length, 0);

  return (
    <PremiumAppShell>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-green-400">Ao Vivo</p>
            <h1 className="mt-1 text-3xl font-black md:mt-2 md:text-5xl">Jogos ao vivo</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400 md:mt-3 md:text-base">Somente partidas reais ao vivo. Esta tela lê primeiro o cache interno e não gasta API-Football automaticamente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSoundEnabled((value) => !value)} className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${soundEnabled ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-300" : "border-white/10 bg-white/5 text-slate-300"}`}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <BellOff className="h-4 w-4" />} {soundEnabled ? "Som ligado" : "Ligar alertas"}
            </button>
            <button onClick={loadLiveGames} className="flex items-center gap-2 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm font-black text-green-300 hover:bg-green-400/15 md:px-5">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </div>

        {demoMode ? (
          <GlassCard className="border-yellow-400/25 bg-yellow-400/10 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">🚀 Modo demonstração ativo</p>
                <p className="mt-1 text-sm font-bold text-yellow-50">{demoNotice || "Dados simulados para testar salas ao vivo, chat e alertas sem gastar API."}</p>
              </div>
              <span className="rounded-full border border-yellow-400/30 px-3 py-1 text-xs font-black text-yellow-200">Pré-lançamento</span>
            </div>
          </GlassCard>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <GlassCard className="p-4 md:p-5"><div className="text-xs font-bold text-slate-400 md:text-sm">Jogos ao vivo</div><div className="mt-1 text-3xl font-black text-white md:mt-2">{games.length}</div></GlassCard>
          <GlassCard className="p-4 md:p-5"><div className="text-xs font-bold text-slate-400 md:text-sm">Pressão alta</div><div className="mt-1 text-3xl font-black text-green-400 md:mt-2">{highPressure}</div></GlassCard>
          <GlassCard className="p-4 md:p-5"><div className="text-xs font-bold text-slate-400 md:text-sm">Atividade alta</div><div className="mt-1 text-3xl font-black text-yellow-400 md:mt-2">{highGoal}</div></GlassCard>
          <GlassCard className="p-4 md:p-5"><div className="text-xs font-bold text-slate-400 md:text-sm">Alertas IA</div><div className="mt-1 text-3xl font-black text-red-300 md:mt-2">{activeTrendAlerts}</div></GlassCard>
        </div>

        <GlassCard className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-400"><Filter className="h-4 w-4" /> Filtros</div>
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              {[
                ["all", "Todos"],
                ["important", "Principais ligas"],
                ["pressure", "Pressão alta"],
                ["goal", "Atividade alta"],
              ].map(([value, label]) => (
                <button key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black ${filter === value ? "bg-yellow-400 text-black" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>{label}</button>
              ))}
            </div>
            <label className="flex min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar time ou liga" className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500" />
            </label>
          </div>
        </GlassCard>

        {error ? <GlassCard className="border-red-400/20 p-6 text-red-200">{error}</GlassCard> : null}

        {loading && !games.length ? (
          <GlassCard className="p-10 text-center"><Activity className="mx-auto mb-4 h-10 w-10 animate-pulse text-green-400" /><h2 className="text-2xl font-black">Carregando jogos ao vivo...</h2></GlassCard>
        ) : null}

        {!loading && !filteredGames.length ? (
          <GlassCard className="p-10 text-center"><Activity className="mx-auto mb-4 h-10 w-10 text-slate-500" /><h2 className="text-2xl font-black">Nenhum jogo ao vivo encontrado</h2><p className="mt-2 text-slate-400">O Analyse Pro não simula partidas ao vivo. Quando uma fonte real confirmar jogos em andamento, eles aparecerão aqui.</p></GlassCard>
        ) : null}

        <div className="space-y-5">
          {filteredGames.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      </div>
    </PremiumAppShell>
  );
}
