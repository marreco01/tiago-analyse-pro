import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Goal,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import AnalysisProcessLoader from "@/components/AnalysisProcessLoader";

type RankingType = "goals" | "both-scored" | "corners" | "quality";

type RankingItem = {
  fixtureId: string;
  date: string;
  time: string;
  league: string;
  country?: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  value: number;
  displayValue: string;
  sampleSize: number;
  averageGoals: number;
  bothScoredPct: number;
  averageCorners: number | null;
  quality: number;
};

type RankingResponse = {
  success: boolean;
  type?: RankingType;
  items?: RankingItem[];
  updatedAt?: string;
  source?: string;
  cachedForMinutes?: number;
  error?: string;
};

const rankingCards: Array<{
  type: RankingType;
  title: string;
  desc: string;
  short: string;
  icon: typeof Trophy;
}> = [
  { type: "goals", title: "Top Média de gols", desc: "Partidas ordenadas pela média recente de gols.", short: "Média", icon: Target },
  { type: "both-scored", title: "Top Gols das equipas", desc: "Frequência recente de jogos com gols das duas equipas.", short: "Frequência", icon: Goal },
  { type: "corners", title: "Top Escanteios", desc: "Média de escanteios baseada em partidas recentes.", short: "Escanteios", icon: BarChart3 },
  { type: "quality", title: "Top Qualidade dos dados", desc: "Amostras mais completas devolvidas pela API.", short: "Qualidade", icon: ShieldCheck },
];

function initialType(): RankingType {
  if (typeof window === "undefined") return "goals";
  const type = new URLSearchParams(window.location.search).get("type");
  if (type === "both-scored" || type === "corners" || type === "quality") return type;
  if (type === "confidence") return "quality";
  return "goals";
}

export default function Ranking() {
  const [selectedType, setSelectedType] = useState<RankingType>(() => initialType());
  const [stored, setStored] = useState<Partial<Record<RankingType, RankingResponse>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const current = stored[selectedType];
  const items = current?.items || [];
  const selectedCard = rankingCards.find((card) => card.type === selectedType) || rankingCards[0];

  useEffect(() => {
    loadRanking(selectedType);
  }, [selectedType]);

  async function loadRanking(type: RankingType, refresh = false) {
    if (!refresh && stored[type]?.items?.length) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/football/rankings?type=${encodeURIComponent(type)}&limit=8${refresh ? `&refresh=${Date.now()}` : ""}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as RankingResponse;
      if (!response.ok || !data.success) throw new Error(data.error || "Não foi possível carregar o ranking.");
      setStored((currentStored) => ({ ...currentStored, [type]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar rankings.");
    } finally {
      setLoading(false);
    }
  }

  function selectType(type: RankingType) {
    setSelectedType(type);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/ranking?type=${type}`);
    }
  }

  const updateTime = useMemo(() => {
    if (!current?.updatedAt) return "--:--";
    return new Date(current.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }, [current?.updatedAt]);

  return (
    <PremiumAppShell>
      {loading ? (
        <AnalysisProcessLoader
          title="Calculando ranking..."
          message="Analisando confrontos e organizando indicadores da API."
        />
      ) : null}
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Ranking real</p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">Rankings inteligentes</h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Classificação dos próximos confrontos baseada em amostras recentes carregadas da API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadRanking(selectedType, true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300 transition hover:bg-yellow-400/20 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar ranking
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rankingCards.map((card) => {
            const Icon = card.icon;
            const active = card.type === selectedType;
            const top = stored[card.type]?.items?.[0];
            return (
              <button
                type="button"
                key={card.type}
                onClick={() => selectType(card.type)}
                className={`rounded-2xl border p-6 text-left transition ${
                  active
                    ? "border-yellow-400/65 bg-yellow-400/[0.08] shadow-[0_0_35px_rgba(250,204,21,0.08)]"
                    : "border-white/10 bg-[#07090d] hover:border-yellow-400/25"
                }`}
              >
                <Icon className={`mb-4 h-8 w-8 ${active ? "text-yellow-400" : "text-slate-400"}`} />
                <h2 className="text-xl font-black">{card.title}</h2>
                <p className="mt-2 min-h-[42px] text-sm text-slate-400">{card.desc}</p>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
                  {top ? (
                    <>
                      <p className="truncate text-xs font-bold text-slate-400">{top.home} x {top.away}</p>
                      <p className="mt-2 text-2xl font-black text-yellow-400">{top.displayValue}</p>
                    </>
                  ) : active && loading ? (
                    <p className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando...</p>
                  ) : (
                    <p className="text-sm text-slate-500">Clique para carregar</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <GlassCard className="overflow-hidden p-5 md:p-7">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">{selectedCard.short}</p>
              <h2 className="mt-2 text-2xl font-black">{selectedCard.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{selectedCard.desc}</p>
            </div>
            <div className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-xs font-black text-green-300">
              API-FOOTBALL • ATUALIZADO {updateTime}
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>
          ) : loading && !items.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-slate-400">
              <LoaderCircle className="h-10 w-10 animate-spin text-yellow-400" />
              <p className="mt-4 font-bold">Calculando ranking com dados da API...</p>
            </div>
          ) : items.length ? (
            <div className="mt-5 space-y-3">
              {items.map((item, index) => (
                <RankingRow key={item.fixtureId} item={item} position={index + 1} type={selectedType} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-slate-400">
              Nenhum confronto disponível para compor este ranking agora.
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 text-sm leading-relaxed text-slate-400 md:p-6">
          As classificações são leituras estatísticas calculadas a partir de jogos recentes disponíveis na API. Elas não garantem resultados futuros.
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}

function RankingRow({ item, position, type }: { item: RankingItem; position: number; type: RankingType }) {
  const analysisUrl = `/analyze?home=${encodeURIComponent(item.home)}&away=${encodeURIComponent(item.away)}`;
  const secondary = type === "goals"
    ? `${item.bothScoredPct}% gols das equipas`
    : type === "both-scored"
      ? `${item.averageGoals.toFixed(2).replace(".", ",")} gols/jogo`
      : type === "corners"
        ? `${item.sampleSize} jogos na amostra`
        : `${item.sampleSize} jogos analisados`;

  return (
    <div className="grid items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4 transition hover:border-yellow-400/25 md:grid-cols-[52px_1fr_160px_135px]">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-black ${
        position === 1 ? "bg-yellow-400 text-black" : "bg-white/10 text-white"
      }`}>
        {position}º
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{item.league} • {item.time}</p>
        <div className="flex flex-wrap items-center gap-3">
          <TeamLogo src={item.homeLogo} name={item.home} />
          <span className="font-black text-white">{item.home}</span>
          <span className="font-black text-yellow-400">x</span>
          <TeamLogo src={item.awayLogo} name={item.away} />
          <span className="font-black text-white">{item.away}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-500">Indicador</p>
        <p className="mt-1 text-2xl font-black text-yellow-400">{item.displayValue}</p>
        <p className="mt-1 text-xs text-slate-400">{secondary}</p>
      </div>

      <Link
        href={analysisUrl}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/10"
      >
        Analisar <ArrowRight className="h-4 w-4" />
      </Link>
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
