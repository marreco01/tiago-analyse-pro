import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCcw, Search, Target, Trophy, Zap } from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { fetchStatisticsRobot, type StatisticalOpportunity } from "@/lib/statisticsRobot";

type Market = "all" | "best" | "goals" | "corners" | "cards";

const markets: Array<{ id: Market; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "best", label: "Melhores" },
  { id: "goals", label: "Gols / BTTS" },
  { id: "corners", label: "Escanteios" },
  { id: "cards", label: "Cartões" },
];

function brDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function badge(level: string) {
  if (level === "Forte") return "bg-green-400/15 text-green-200 border-green-400/25";
  if (level === "Médio") return "bg-yellow-400/15 text-yellow-200 border-yellow-400/25";
  return "bg-red-400/15 text-red-200 border-red-400/25";
}

export default function StatisticsRobot() {
  const [market, setMarket] = useState<Market>("best");
  const [items, setItems] = useState<StatisticalOpportunity[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await fetchStatisticsRobot(market);
      setItems(data.opportunities || []);
      setUpdatedAt(data.updatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar estatísticas.");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, [market]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.home, item.away, item.competition, item.bestMarket].join(" ").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Robô Estatístico</p>
              <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Oportunidades IA</h1>
              <p className="mt-3 max-w-3xl text-slate-300">
                Over, BTTS, escanteios e cartões alimentados automaticamente pelo Robô Jogos e Robô Copa.
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">Atualizado: {brDate(updatedAt)}</p>
            </div>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300">
              <RefreshCcw className="h-4 w-4" /> Atualizar
            </button>
          </div>
        </GlassCard>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Trophy />} label="Jogos analisados" value={items.length} />
          <Metric icon={<Target />} label="Melhores entradas" value={items.filter((item) => item.risk === "Baixo").length} />
          <Metric icon={<Zap />} label="Escanteios fortes" value={items.filter((item) => item.corners.over85.probability >= 75).length} />
          <Metric icon={<BarChart3 />} label="Cartões fortes" value={items.filter((item) => item.cards.over35.probability >= 75).length} />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="flex flex-wrap gap-2">
            {markets.map((item) => (
              <button key={item.id} onClick={() => setMarket(item.id)} className={`rounded-xl px-4 py-3 text-sm font-black ${market === item.id ? "bg-yellow-400 text-black" : "bg-white/[0.05] text-slate-300 hover:bg-white/10"}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-slate-300">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar time ou mercado" className="bg-transparent text-sm font-bold outline-none" />
          </div>
        </div>

        {error ? <GlassCard className="border-red-400/30 p-5 text-red-200">{error}</GlassCard> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {filtered.map((item) => (
            <GlassCard key={item.id} className="p-5">
              <p className="text-xs font-black uppercase text-yellow-400">{item.competition} · {item.date} · {item.time}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{item.home} x {item.away}</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">{item.summary}</p>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Mini label="Favorito" value={item.favorite} />
                <Mini label="Confiança" value={`${item.confidence}%`} />
                <Mini label="Melhor mercado" value={item.bestMarket} />
                <Mini label="Risco" value={item.risk} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MarketLine title="Gols" lines={[item.goals.over15, item.goals.over25, item.goals.btts]} />
                <MarketLine title={`Escanteios ${item.corners.expected}`} lines={[item.corners.over85, item.corners.over95, item.corners.over105]} />
                <MarketLine title={`Cartões ${item.cards.expected}`} lines={[item.cards.over35, item.cards.over45]} />
              </div>
            </GlassCard>
          ))}
        </section>
      </div>
    </PremiumAppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <GlassCard className="p-5">
      <div className="text-cyan-300">{icon}</div>
      <p className="mt-3 text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-4xl font-black text-white">{value}</p>
    </GlassCard>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function MarketLine({ title, lines }: { title: string; lines: Array<{ name: string; probability: number; level: string; risk: string }> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <div key={line.name} className={`rounded-xl border px-3 py-2 ${badge(line.level)}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black">{line.name}</span>
              <span className="text-sm font-black">{line.probability}%</span>
            </div>
            <p className="mt-1 text-[10px] font-black uppercase opacity-75">{line.level} · Risco {line.risk}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
