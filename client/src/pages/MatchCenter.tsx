import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Clock3,
  Goal,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Shirt,
  Star,
  Zap,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";

type ParsedStats = {
  shots: [number | null, number | null];
  shotsOnGoal: [number | null, number | null];
  corners: [number | null, number | null];
  yellowCards: [number | null, number | null];
  redCards: [number | null, number | null];
  possession: [number | null, number | null];
};

type Game = {
  fixtureId: string;
  date: string;
  time: string;
  status: string;
  elapsed: number | null;
  league: string;
  country?: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

type EventItem = {
  time: number | null;
  team: string;
  type: string;
  detail: string;
  player?: string;
  assist?: string;
};

type Lineup = {
  team: string;
  formation?: string;
  coach?: string;
  startXI: Array<{ name: string; number?: number; pos?: string }>;
};

type Center = {
  game: Game;
  venue: { name?: string; city?: string };
  stats: ParsedStats;
  events: EventItem[];
  lineups: Lineup[];
  updatedAt: string;
};

type ApiResponse = { success: boolean; center?: Center; error?: string };

type Tab = "resumo" | "estatisticas" | "eventos" | "escalacoes";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "resumo", label: "Resumo" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "eventos", label: "Eventos" },
  { id: "escalacoes", label: "Escalações" },
];

export default function MatchCenter() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const fixtureId = params.get("fixture") || "";
  const fallbackHome = params.get("home") || "Mandante";
  const fallbackAway = params.get("away") || "Visitante";
  const [tab, setTab] = useState<Tab>("resumo");
  const [center, setCenter] = useState<Center | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(fixtureId));

  async function loadCenter() {
    if (!fixtureId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/football/match-center/${encodeURIComponent(fixtureId)}`, { cache: "no-store" });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success || !data.center) throw new Error(data.error || "Não foi possível carregar o jogo.");
      setCenter(data.center);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar jogo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCenter();
  }, [fixtureId]);

  const game = center?.game || {
    fixtureId,
    date: "",
    time: "--:--",
    status: "NS",
    elapsed: null,
    league: "Competição",
    home: fallbackHome,
    away: fallbackAway,
    homeGoals: null,
    awayGoals: null,
  };

  const score = game.homeGoals == null || game.awayGoals == null ? "x" : `${game.homeGoals} x ${game.awayGoals}`;
  const live = ["1H", "2H", "HT", "ET", "LIVE", "P"].includes(String(game.status).toUpperCase());
  const analysisUrl = `/analyze?home=${encodeURIComponent(game.home)}&away=${encodeURIComponent(game.away)}`;

  return (
    <PremiumAppShell>
      {loading ? <AnalysisProcessLoader title="Carregando Centro do Jogo..." message="Buscando estatísticas, eventos e escalações." /> : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-yellow-400">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <button onClick={loadCenter} disabled={!fixtureId || loading} className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/25 px-4 py-2 text-sm font-black text-yellow-300 disabled:opacity-50">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>

        <section className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#07090d] p-5 md:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(250,204,21,0.14),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(16,185,129,0.10),transparent_30%)]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-400">{game.league}</p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {game.time}</span>
                  {center?.venue?.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {center.venue.city}</span> : null}
                </p>
              </div>
              <StatusBadge status={game.status} elapsed={game.elapsed} live={live} />
            </div>

            <div className="mt-7 grid items-center gap-5 md:grid-cols-[1fr_170px_1fr]">
              <TeamBlock name={game.home} logo={game.homeLogo} side="left" />
              <div className="rounded-3xl border border-yellow-400/25 bg-black/40 p-4 text-center">
                <p className="text-5xl font-black text-white">{score}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-400">{game.status || "NS"}</p>
              </div>
              <TeamBlock name={game.away} logo={game.awayLogo} side="right" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoCard icon={<BarChart3 />} label="Finalizações" value={statPair(center?.stats?.shots)} />
              <InfoCard icon={<Goal />} label="No alvo" value={statPair(center?.stats?.shotsOnGoal)} />
              <InfoCard icon={<Activity />} label="Escanteios" value={statPair(center?.stats?.corners)} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={analysisUrl} className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-3 font-black text-black">
                Gerar Análise IA
              </Link>
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10">
                <Star className="h-4 w-4" /> Salvar
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <GlassCard className="border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</GlassCard>
        ) : null}

        <GlassCard className="overflow-hidden p-0">
          <nav className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-white/10 p-3">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-4 py-3 text-sm font-black ${
                  tab === item.id ? "bg-yellow-400 text-black" : "border border-white/10 text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 md:p-6">
            {tab === "resumo" ? <SummaryTab center={center} game={game} /> : null}
            {tab === "estatisticas" ? <StatsTab stats={center?.stats} home={game.home} away={game.away} /> : null}
            {tab === "eventos" ? <EventsTab events={center?.events || []} /> : null}
            {tab === "escalacoes" ? <LineupsTab lineups={center?.lineups || []} /> : null}
          </div>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function TeamBlock({ name, logo, side }: { name: string; logo?: string; side: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-4 ${side === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
      <img src={logo || "/favicon.png"} alt={name} className="h-16 w-16 rounded-2xl bg-white object-contain p-2" onError={(event) => { event.currentTarget.src = "/favicon.png"; }} />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-slate-500">{side === "left" ? "Mandante" : "Visitante"}</p>
        <h1 className="truncate text-2xl font-black text-white md:text-3xl">{name}</h1>
      </div>
    </div>
  );
}

function StatusBadge({ status, elapsed, live }: { status: string; elapsed: number | null; live: boolean }) {
  return (
    <span className={`rounded-full px-4 py-2 text-xs font-black ${live ? "bg-red-500/15 text-red-300" : "bg-yellow-400/10 text-yellow-300"}`}>
      {live ? `${elapsed ? `${elapsed}' • ` : ""}AO VIVO` : status === "FT" ? "FINALIZADO" : "AGENDADO"}
    </span>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-yellow-400 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="mt-2 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function SummaryTab({ center, game }: { center: Center | null; game: Game }) {
  const hasData = Boolean(center);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MiniPanel title="Situação" value={game.status || "NS"} text={hasData ? "Dados carregados pela API." : "Abra um jogo real para carregar dados completos."} icon={<ShieldCheck />} />
      <MiniPanel title="Eventos" value={String(center?.events?.length || 0)} text="Gols, cartões e substituições quando disponíveis." icon={<Zap />} />
      <MiniPanel title="Escalações" value={String(center?.lineups?.length || 0)} text="Mostra formação e titulares se a API retornar." icon={<Shirt />} />
    </div>
  );
}

function MiniPanel({ title, value, text, icon }: { title: string; value: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <div className="text-yellow-400 [&_svg]:h-6 [&_svg]:w-6">{icon}</div>
      <p className="mt-3 text-sm font-bold text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function StatsTab({ stats, home, away }: { stats?: ParsedStats; home: string; away: string }) {
  const rows = [
    ["Posse de bola", stats?.possession],
    ["Finalizações", stats?.shots],
    ["Finalizações no alvo", stats?.shotsOnGoal],
    ["Escanteios", stats?.corners],
    ["Cartões amarelos", stats?.yellowCards],
    ["Cartões vermelhos", stats?.redCards],
  ] as Array<[string, [number | null, number | null] | undefined]>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_70px_70px] gap-3 text-sm font-black text-slate-400">
        <span>Indicador</span><span className="text-center">{shortName(home)}</span><span className="text-center">{shortName(away)}</span>
      </div>
      {rows.map(([label, pair]) => (
        <div key={label} className="grid grid-cols-[1fr_70px_70px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="font-bold text-white">{label}</p>
          <p className="text-center font-black text-yellow-400">{value(pair?.[0])}</p>
          <p className="text-center font-black text-yellow-400">{value(pair?.[1])}</p>
        </div>
      ))}
    </div>
  );
}

function EventsTab({ events }: { events: EventItem[] }) {
  if (!events.length) return <Empty text="Nenhum evento disponível para este jogo ainda." />;
  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={`${event.time}-${event.type}-${index}`} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="w-12 shrink-0 text-center font-black text-yellow-400">{event.time ? `${event.time}'` : "--"}</div>
          <div>
            <p className="font-black text-white">{event.type} • {event.detail}</p>
            <p className="mt-1 text-sm text-slate-400">{event.team}{event.player ? ` — ${event.player}` : ""}{event.assist ? ` / ${event.assist}` : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineupsTab({ lineups }: { lineups: Lineup[] }) {
  if (!lineups.length) return <Empty text="Escalações ainda não disponíveis na API." />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {lineups.map((lineup) => (
        <div key={lineup.team} className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-white">{lineup.team}</h3>
            {lineup.formation ? <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">{lineup.formation}</span> : null}
          </div>
          {lineup.coach ? <p className="mt-1 text-sm text-slate-500">Técnico: {lineup.coach}</p> : null}
          <div className="mt-4 grid gap-2">
            {lineup.startXI.map((player) => (
              <div key={`${lineup.team}-${player.name}`} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                <span className="font-bold text-white">{player.number ? `${player.number}. ` : ""}{player.name}</span>
                <span className="text-slate-400">{player.pos || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-slate-400">{text}</div>;
}

function statPair(pair?: [number | null, number | null]) {
  if (!pair) return "-- x --";
  return `${value(pair[0])} x ${value(pair[1])}`;
}

function value(value?: number | null) {
  return typeof value === "number" ? String(value) : "--";
}

function shortName(name: string) {
  return name.split(" ").slice(0, 2).join(" ");
}
