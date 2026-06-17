import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Bot,
  Clock,
  ExternalLink,
  Newspaper,
  RefreshCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PremiumAppShell } from "@/components/PremiumShell";

type NewsCategory = "ultimas" | "brasileirao" | "mundial" | "libertadores" | "mercado" | "lesoes";

type FootballNewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  category: NewsCategory;
  summary: string;
  aiImpact?: "Alto" | "Médio" | "Baixo";
  affectedTeams?: string[];
  affectedMarkets?: string[];
  isBreaking?: boolean;
};

const categories: { key: NewsCategory; label: string; desc: string }[] = [
  { key: "ultimas", label: "📰 Últimas Notícias", desc: "Tudo do futebol" },
  { key: "brasileirao", label: "⚽ Brasileirão", desc: "Série A e clubes BR" },
  { key: "mundial", label: "🌎 Futebol Mundial", desc: "Europa e seleções" },
  { key: "libertadores", label: "🏆 Libertadores", desc: "Conmebol" },
  { key: "mercado", label: "💰 Mercado da Bola", desc: "Contratações" },
  { key: "lesoes", label: "🚑 Lesões e Suspensões", desc: "Desfalques" },
];

const fallbackImage =
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=900&q=80";

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatBrazilDate(value: string) {
  const date = safeDate(value);
  const now = new Date();

  const today = date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const currentDay = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const hour = date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (today === currentDay) return `Hoje às ${hour}`;

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: string) {
  const date = safeDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;

  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `Há ${hours} hora${hours > 1 ? "s" : ""}`;

  const days = Math.floor(hours / 24);
  return `Há ${days} dia${days > 1 ? "s" : ""}`;
}

function relativeDot(value: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - safeDate(value).getTime()) / 60000));
  if (diffMinutes <= 10) return "🔴";
  if (diffMinutes <= 60) return "🟡";
  return "⚪";
}

function impactClass(impact?: string) {
  if (impact === "Alto") return "border-red-400/30 bg-red-500/10 text-red-200";
  if (impact === "Médio") return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200";
  return "border-green-400/30 bg-green-400/10 text-green-200";
}

function compactList(values?: string[]) {
  const list = (values || []).filter(Boolean);
  return list.length ? list.slice(0, 3).join(", ") : "A confirmar";
}

export default function News() {
  const [category, setCategory] = useState<NewsCategory>("ultimas");
  const [items, setItems] = useState<FootballNewsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const active = useMemo(() => categories.find((item) => item.key === category) || categories[0], [category]);
  const breakingNews = useMemo(() => {
    const important = items.filter((item) => item.isBreaking || item.aiImpact === "Alto");
    return (important.length ? important : items).slice(0, 8);
  }, [items]);

  async function load(force = false, silent = false) {
    if (!silent) setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/news?category=${category}&refresh=${force ? "1" : "0"}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar notícias.");

      const nextItems: FootballNewsItem[] = data.items || [];
      const previous = knownIds.current;
      const fresh = nextItems.filter((item) => !previous.has(item.id));

      if (!firstLoad.current && fresh.length > 0) {
        const main = fresh[0];
        setNotice(`🔔 Nova notícia disponível: ${main.title}`);
        window.setTimeout(() => setNotice(""), 6500);
      }

      knownIds.current = new Set(nextItems.map((item) => item.id));
      firstLoad.current = false;

      setItems(nextItems);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar notícias.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    firstLoad.current = true;
    knownIds.current = new Set();
    load(false);
  }, [category]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      load(false, true);
    }, 1000 * 60 * 10);

    return () => window.clearInterval(interval);
  }, [category]);

  return (
    <PremiumAppShell>
      <div className="space-y-6">
        {notice ? (
          <div className="fixed right-4 top-4 z-50 max-w-md rounded-2xl border border-yellow-400/40 bg-black/90 px-5 py-4 text-sm font-black text-yellow-200 shadow-2xl shadow-yellow-400/20">
            {notice}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-yellow-400/20 bg-black/35 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-green-300">
                <Sparkles className="h-4 w-4" /> Notícias
              </div>
              <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">Notícias de Futebol</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                Busca automática, horário do Brasil, imagens reais, categorias, última hora e resumo Analyse Pro IA.
              </p>
              {updatedAt ? (
                <p className="mt-3 text-xs font-bold text-slate-500">
                  Atualizado: {formatRelativeTime(updatedAt)}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => load(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"
            >
              <RefreshCcw className="h-4 w-4" /> Atualizar notícias
            </button>
          </div>
        </section>

        {breakingNews.length ? (
          <section className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-black uppercase tracking-widest text-white">
                <AlertTriangle className="h-4 w-4" /> Última Hora
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="animate-[marquee_35s_linear_infinite] whitespace-nowrap text-sm font-black text-white">
                  {breakingNews.map((item) => (
                    <span key={item.id} className="mr-10">
                      ⚽ {item.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <style>{`@keyframes marquee { from { transform: translateX(100%); } to { transform: translateX(-100%); } }`}</style>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {categories.map((item) => {
            const selected = item.key === category;
            return (
              <button
                key={item.key}
                onClick={() => setCategory(item.key)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-white/[0.04] text-white hover:border-yellow-400/50"
                }`}
              >
                <p className="text-sm font-black">{item.label}</p>
                <p className={`mt-1 text-xs font-bold ${selected ? "text-black/70" : "text-slate-400"}`}>{item.desc}</p>
              </button>
            );
          })}
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center font-black text-yellow-400">
            Carregando notícias...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm font-bold text-red-200">
            {error}
          </div>
        ) : null}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-black text-white">{active.label}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#07111f] shadow-xl shadow-black/20">
                <div className="relative aspect-[16/9] overflow-hidden bg-black/30">
                  <img
                    src={item.image || fallbackImage}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                  {item.isBreaking ? (
                    <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-black uppercase text-white shadow-lg">
                      Última hora
                    </span>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                    <span className="rounded-full bg-yellow-400/10 px-2 py-1 text-yellow-300">{item.source}</span>
                    <span className="inline-flex items-center gap-1">
                      {relativeDot(item.publishedAt)} {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-white">{item.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-300">{item.summary}</p>

                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-black text-cyan-200">
                      <Bot className="h-4 w-4" /> Analyse Pro IA
                    </div>
                    <div className="grid gap-2 text-xs font-bold text-slate-300">
                      <p>
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${impactClass(item.aiImpact)}`}>
                          Impacto: {item.aiImpact || "Baixo"}
                        </span>
                      </p>
                      <p><span className="text-slate-500">Times afetados:</span> {compactList(item.affectedTeams)}</p>
                      <p><span className="text-slate-500">Mercados afetados:</span> {compactList(item.affectedMarkets)}</p>
                    </div>
                  </div>

                  <a
                    href={item.url}
                    target={item.url.startsWith("http") ? "_blank" : "_self"}
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-green-400/30 px-4 py-2 text-sm font-black text-green-300 hover:bg-green-400/10"
                  >
                    Ler mais <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
          {!loading && !items.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">
              Nenhuma notícia nessa categoria agora.
            </div>
          ) : null}
        </section>
      </div>
    </PremiumAppShell>
  );
}
