import { useEffect, useMemo, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCcw,
  ShieldCheck,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

type Entry = {
  id: string;
  fixtureId?: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  date?: string;
  time?: string;
  league?: string;
  market: string;
  confidence: number;
  fairOdd?: number;
  estimatedMarketOdd?: number;
  ev?: number;
  risk: "Baixo" | "Médio" | "Alto" | string;
  reason?: string;
};

type AuditItem = {
  id: string;
  home: string;
  away: string;
  league: string;
  market: string;
  confidence: number;
  risk: string;
  status: "pending" | "green" | "red";
  resultLabel: string;
  score?: string;
  createdAt: string;
  checkedAt?: string;
};

type AuditStats = {
  green: number;
  red: number;
  pending: number;
  decided: number;
  accuracy: number;
  byMarket?: Array<{ market: string; green: number; red: number; pending: number; accuracy: number }>;
};

type TopGame = {
  game: Entry;
  markets: Entry[];
  confidence: number;
};

type ApiResponse = {
  success: boolean;
  updatedAt?: string;
  entries?: Entry[];
  grouped?: { topGames?: TopGame[] };
  robot?: { status?: string; lastRunAt?: string; totalItems?: number; message?: string };
  logs?: Array<{ id: string; message: string; createdAt: string; level?: string }>;
  audit?: AuditItem[];
  auditStats?: AuditStats;
  error?: string;
};

const emptyStats: AuditStats = {
  green: 0,
  red: 0,
  pending: 0,
  decided: 0,
  accuracy: 0,
  byMarket: [],
};


const COUNTRY_FLAGS: Record<string, string> = {
  ARG: "🇦🇷", ARGENTINA: "🇦🇷",
  DZA: "🇩🇿", ALGERIA: "🇩🇿", ARGELIA: "🇩🇿", ARGÉLIA: "🇩🇿",
  POR: "🇵🇹", PORTUGAL: "🇵🇹",
  COD: "🇨🇩", CONGODR: "🇨🇩", "CONGO DR": "🇨🇩", "CONGO-DR": "🇨🇩", "DR CONGO": "🇨🇩", "RD CONGO": "🇨🇩", "REPUBLICA DEMOCRATICA DO CONGO": "🇨🇩",
  ENG: "🏴", ENGLAND: "🏴", INGLATERRA: "🏴",
  CRO: "🇭🇷", CROATIA: "🇭🇷", CROÁCIA: "🇭🇷", CROACIA: "🇭🇷",
  BRA: "🇧🇷", BRASIL: "🇧🇷", BRAZIL: "🇧🇷",
  HAI: "🇭🇹", HAITI: "🇭🇹",
  IRQ: "🇮🇶", IRAQ: "🇮🇶", IRAQUE: "🇮🇶",
  NOR: "🇳🇴", NORWAY: "🇳🇴", NORUEGA: "🇳🇴",
  USA: "🇺🇸", EUA: "🇺🇸", "ESTADOS UNIDOS": "🇺🇸", "UNITED STATES": "🇺🇸",
  AUS: "🇦🇺", AUSTRALIA: "🇦🇺", AUSTRÁLIA: "🇦🇺",
  PAR: "🇵🇾", PARAGUAY: "🇵🇾", PARAGUAI: "🇵🇾",
  TUR: "🇹🇷", TURKEY: "🇹🇷", TURQUIA: "🇹🇷",
  MEX: "🇲🇽", MEXICO: "🇲🇽", MÉXICO: "🇲🇽",
  RSA: "🇿🇦", "AFRICA DO SUL": "🇿🇦", "ÁFRICA DO SUL": "🇿🇦", "SOUTH AFRICA": "🇿🇦",
  KOR: "🇰🇷", "COREIA DO SUL": "🇰🇷", "SOUTH KOREA": "🇰🇷",
  CZE: "🇨🇿", TCHEQUIA: "🇨🇿", TCHÉQUIA: "🇨🇿", CZECHIA: "🇨🇿",
  CAN: "🇨🇦", CANADA: "🇨🇦", CANADÁ: "🇨🇦",
  QAT: "🇶🇦", QATAR: "🇶🇦", CATAR: "🇶🇦",
  SUI: "🇨🇭", SWITZERLAND: "🇨🇭", SUICA: "🇨🇭", SUÍÇA: "🇨🇭",
  MAR: "🇲🇦", MOROCCO: "🇲🇦", MARROCOS: "🇲🇦",
  SCO: "🏴", SCOTLAND: "🏴", ESCÓCIA: "🏴", ESCOCIA: "🏴",
  FRA: "🇫🇷", FRANCE: "🇫🇷", FRANÇA: "🇫🇷", FRANCA: "🇫🇷",
  SEN: "🇸🇳", SENEGAL: "🇸🇳",
  GER: "🇩🇪", GERMANY: "🇩🇪", ALEMANHA: "🇩🇪",
  JPN: "🇯🇵", JAPAN: "🇯🇵", JAPÃO: "🇯🇵", JAPAO: "🇯🇵",
};

function flagForTeam(name?: string, src?: string) {
  const values = [src, name].filter(Boolean).map(value => String(value || ""));
  for (const value of values) {
    const cleaned = value
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const compact = cleaned.replace(/\s+/g, "");
    if (COUNTRY_FLAGS[value.trim().toUpperCase()]) return COUNTRY_FLAGS[value.trim().toUpperCase()];
    if (COUNTRY_FLAGS[cleaned]) return COUNTRY_FLAGS[cleaned];
    if (COUNTRY_FLAGS[compact]) return COUNTRY_FLAGS[compact];
  }
  return "";
}

function isUsableImageSource(src?: string) {
  const value = String(src || "").trim();
  return value.startsWith("http") || value.startsWith("/") || value.startsWith("data:image");
}

export default function EntriesAI() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/entries-master/opportunities?limit=3", { cache: "no-store" })
      .then(res => res.json())
      .then(json => setData(json))
      .catch(error =>
        setData({
          success: false,
          error: error instanceof Error ? error.message : "Erro ao carregar Entradas IA.",
        })
      )
      .finally(() => setLoading(false));
  };

  const runRobotNow = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/entries-master/run", { method: "POST", cache: "no-store" });
      const json = await response.json();
      setData(json);
    } catch (error) {
      setData({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao executar Robô Entradas IA.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(load, []);

  const topGames = useMemo(() => {
    const fromApi = Array.isArray(data?.grouped?.topGames) ? data?.grouped?.topGames || [] : [];
    return fromApi.slice(0, 3).map(game => ({ ...game, markets: (game.markets || []).slice(0, 3) }));
  }, [data]);

  const stats = data?.auditStats || emptyStats;
  const logs = data?.logs || [];
  const robotStatus = data?.robot?.status || "online";

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="overflow-hidden p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                <Bot className="h-4 w-4" /> Robô Entradas IA
              </p>
              <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">
                3 múltiplas do dia
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">
                O robô escolhe no máximo 3 jogos do dia. Cada jogo vira uma múltipla simples com exatamente 3 mercados fortes.
                Só marca GREEN quando os 3 mercados do jogo batem.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide">
                <Badge>Copa do Mundo</Badge>
                <Badge>Brasileirão Série A</Badge>
                <Badge>Brasileirão Série B</Badge>
                <Badge>Libertadores</Badge>
                
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-black text-white hover:bg-white/10">
                <RefreshCcw className="h-4 w-4" /> Atualizar
              </button>
              <button onClick={runRobotNow} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black hover:bg-emerald-300">
                <Zap className="h-4 w-4" /> Rodar robô
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <StatBox icon={<CheckCircle2 className="h-5 w-5" />} label="Greens" value={String(stats.green)} tone="green" />
            <StatBox icon={<XCircle className="h-5 w-5" />} label="Reds" value={String(stats.red)} tone="red" />
            <StatBox icon={<Clock3 className="h-5 w-5" />} label="Pendentes" value={String(stats.pending)} tone="yellow" />
            <StatBox icon={<ShieldCheck className="h-5 w-5" />} label="Assertividade" value={stats.decided ? `${stats.accuracy}%` : "--"} tone="green" />
          </div>
        </GlassCard>

        {data?.error ? (
          <GlassCard className="border-red-400/25 bg-red-500/10 p-4 font-bold text-red-200">
            {data.error}
          </GlassCard>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          {loading ? (
            <GlassCard className="p-6 text-sm font-bold text-slate-300 xl:col-span-3">Carregando as 3 múltiplas do dia...</GlassCard>
          ) : topGames.length ? (
            topGames.map((item, index) => <DailyMultipleCard key={`${item.game?.home}-${item.game?.away}-${index}`} item={item} index={index} />)
          ) : (
            <GlassCard className="p-6 text-sm font-bold text-slate-300 xl:col-span-3">
              Nenhum jogo com 3 mercados fortes dentro da janela de hoje até 48 horas.
            </GlassCard>
          )}
        </div>

        <GlassCard className="overflow-hidden p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <InfoBlock
              icon={<Bot className="h-6 w-6" />}
              title="Como o robô escolhe"
              text="Analisa vários mercados, aplica margem de segurança nas linhas e publica só 3 jogos no dia."
            />
            <InfoBlock
              icon={<Target className="h-6 w-6" />}
              title="Regra do GREEN"
              text="A múltipla só vira GREEN quando os 3 mercados daquele jogo forem confirmados. Um erro vira RED."
            />
            <InfoBlock
              icon={<CalendarDays className="h-6 w-6" />}
              title="Painel Admin"
              text="A atividade do Robô Entradas IA fica junto dos outros robôs no Admin: status, logs, greens, reds e pendentes."
            />
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden p-5 md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-white">🛠️ Atividade do Robô Entradas IA</h2>
              <p className="text-sm font-semibold text-slate-400">
                Status atual: <span className="text-emerald-300">{robotStatus}</span>
                {data?.updatedAt ? ` • Última execução: ${formatDateTime(data.updatedAt)}` : ""}
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
              Integrado ao Admin
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {logs.slice(0, 4).map(log => (
              <div key={log.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-sm font-black text-white">{log.message}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt)}</p>
              </div>
            ))}
            {!logs.length ? <Empty text="Os logs aparecem aqui depois que o robô rodar." /> : null}
          </div>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function DailyMultipleCard({ item, index }: { item: TopGame; index: number }) {
  const game = item.game;
  const markets = item.markets || [];
  const avg = Math.round(markets.reduce((sum, market) => sum + market.confidence, 0) / Math.max(1, markets.length));
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="border-b border-white/10 bg-gradient-to-r from-emerald-500/15 to-yellow-400/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400 text-lg font-black text-black">{index + 1}</span>
            <div>
              <h2 className="text-xl font-black text-white">Múltipla do dia {index + 1}</h2>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">1 jogo • 3 mercados</p>
            </div>
          </div>
          <Trophy className="h-7 w-7 text-yellow-300" />
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-center gap-3 text-center text-lg font-black text-white">
            <TeamLogo src={game.homeLogo} name={game.home} />
            <span>{game.home}</span>
            <span className="text-yellow-300">x</span>
            <span>{game.away}</span>
            <TeamLogo src={game.awayLogo} name={game.away} />
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-slate-400">
            {game.league || "Competição"} • {game.date ? formatDate(game.date) : "Hoje"} • {game.time || "--:--"}
          </p>
        </div>

        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Top 3 mercados</p>
        <div className="mt-3 space-y-3">
          {markets.slice(0, 3).map((entry, marketIndex) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black text-black ${marketIndex === 0 ? "bg-yellow-400" : marketIndex === 1 ? "bg-slate-300" : "bg-orange-400"}`}>
                  {marketIndex + 1}
                </span>
                <div>
                  <p className="text-sm font-black text-white">{entry.market}</p>
                  <p className="text-xs font-bold uppercase text-emerald-300">{marketCategory(entry.market)}</p>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-300">{entry.confidence}%</span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Confiança geral" value={`${avg || item.confidence || 0}%`} tone="green" />
          <Metric label="Status" value="Pendente" tone="yellow" />
        </div>
      </div>
    </GlassCard>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">{children}</span>;
}

function StatBox({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "green" | "red" | "yellow" }) {
  const colors = tone === "green" ? "text-emerald-300 bg-emerald-500/10" : tone === "red" ? "text-red-300 bg-red-500/10" : "text-yellow-300 bg-yellow-500/10";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colors}`}>{icon}</div>
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoBlock({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">{icon}</div>
      <h3 className="text-sm font-black uppercase tracking-wide text-emerald-300">{title}</h3>
      <p className="mt-2 text-sm font-semibold text-slate-300">{text}</p>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: string }) {
  const color = tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : tone === "yellow" ? "text-yellow-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm font-bold text-slate-400">{text}</div>;
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const flag = flagForTeam(name, src);
  const fallback = `/api/brasileirao/logo/${encodeURIComponent(name)}`;
  const imageSrc = isUsableImageSource(src) && !failed ? String(src) : fallback;

  if (flag && (!isUsableImageSource(src) || failed)) {
    return (
      <span
        title={name}
        className="grid h-8 w-10 shrink-0 place-items-center rounded-md bg-white/10 text-2xl shadow-inner shadow-black/30"
      >
        {flag}
      </span>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={name}
      className="h-8 w-10 shrink-0 rounded-md object-contain"
      loading="lazy"
      onError={event => {
        if (!failed) {
          setFailed(true);
          return;
        }
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function marketCategory(market: string) {
  const text = market.toLowerCase();
  if (text.includes("escanteio")) return "Escanteios";
  if (text.includes("cart")) return "Cartões";
  if (text.includes("ambas")) return "BTTS";
  if (text.includes("gol") || text.includes("over") || text.includes("under")) return "Gols";
  return "Resultado";
}

function formatDate(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
