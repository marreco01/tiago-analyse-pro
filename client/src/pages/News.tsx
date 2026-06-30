import { useEffect, useState } from "react";
import { Link } from "wouter";
import { RefreshCcw, Trophy } from "lucide-react";

const rankingTypes = [
  { key: "goals", title: "Gols 2+ gols" },
  { key: "btts", title: "Ambos marcam" },
  { key: "corners", title: "Escanteios" },
];

type RankingItem = {
  id?: string | number;
  home?: string;
  away?: string;
  league?: string;
  value?: string | number;
  probability?: string | number;
  reason?: string;
  time?: string;
  date?: string;
};

export default function News() {
  const [items, setItems] = useState<Record<string, RankingItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(rankingTypes.map(async (type) => {
        const response = await fetch(`/api/football/rankings?type=${encodeURIComponent(type.key)}&limit=6&refresh=${Date.now()}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar ranking real.");
        return [type.key, data.items || [], data.updatedAt || new Date().toISOString()] as const;
      }));
      const next: Record<string, RankingItem[]> = {};
      results.forEach(([key, value, time]) => { next[key] = value; setUpdatedAt(time); });
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados reais da API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#02060d] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/analyze" className="font-bold text-green-400">← Voltar para Análise</Link>
        <div className="mt-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">API Football</p>
            <h1 className="text-4xl font-black">RANKING REAL</h1>
            <p className="mt-2 text-slate-400">Jogos com maior potencial estatístico puxados da API.</p>
            {updatedAt ? <p className="mt-2 text-xs text-slate-500">Última atualização: {new Date(updatedAt).toLocaleString("pt-BR")}</p> : null}
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-black text-black">
            <RefreshCcw className="h-4 w-4" /> Atualizar API
          </button>
        </div>

        {loading ? <div className="mt-8 rounded-xl border border-white/10 bg-[#07111f] p-6 text-center font-black text-yellow-400">Carregando rankings reais...</div> : null}
        {error ? <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">{error}</div> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {rankingTypes.map((type) => (
            <div key={type.key} className="rounded-xl border border-white/10 bg-[#07111f] p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <p className="font-black text-green-400">{type.title}</p>
              </div>
              <div className="mt-4 space-y-3">
                {(items[type.key] || []).length ? (items[type.key] || []).map((item, index) => (
                  <div key={`${type.key}-${item.id || index}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="font-black text-white">{item.home || "Casa"} x {item.away || "Fora"}</p>
                    <p className="text-xs text-slate-400">{item.league || "Liga"} {item.time ? `• ${item.time}` : ""}</p>
                    <p className="mt-2 text-sm font-bold text-yellow-300">Chance: {item.probability || item.value || "API"}</p>
                    {item.reason ? <p className="mt-1 text-xs text-slate-400">{item.reason}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-400">A API ainda não retornou jogos para este mercado.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
