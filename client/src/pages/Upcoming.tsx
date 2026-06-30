import { useEffect, useMemo, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { formatDatePt, type UpcomingMatch } from "@/data/matchData";
import { teams } from "@/data/teams";
import { fetchUpcomingGames } from "@/lib/footballLive";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";

type UpcomingWithLogo = UpcomingMatch & { homeLogo?: string; awayLogo?: string };

function teamLogo(name: string, apiLogo?: string) {
  return apiLogo || teams.find((team) => team.name === name)?.logo || "/favicon.png";
}

export default function Upcoming() {
  const [matches, setMatches] = useState<UpcomingWithLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchUpcomingGames(24);
        if (!cancelled) setMatches(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar próximos jogos reais.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => matches.reduce<Record<string, UpcomingWithLogo[]>>((acc, match) => {
    const key = formatDatePt(match.date);
    acc[key] = acc[key] || [];
    acc[key].push(match);
    return acc;
  }, {}), [matches]);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Calendário real</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Próximos jogos</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Jogos carregados pela API. Quando a API não retornar dados, a tela informa o erro em vez de inventar partidas.
          </p>
        </GlassCard>

        {loading ? (
          <GlassCard className="p-8 text-center text-yellow-400 font-black">Carregando próximos jogos reais...</GlassCard>
        ) : null}

        {error ? (
          <GlassCard className="p-8 text-center text-red-300">
            <p className="text-xl font-black">Não foi possível carregar próximos jogos reais.</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </GlassCard>
        ) : null}

        {!loading && !error && !matches.length ? (
          <GlassCard className="p-8 text-center text-slate-400">A API não retornou jogos futuros neste momento.</GlassCard>
        ) : null}

        {Object.entries(grouped).map(([date, list]) => (
          <GlassCard key={date} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
              <CalendarDays className="h-5 w-5 text-yellow-400" />
              <h2 className="text-xl font-black text-white">{date}</h2>
            </div>
            <div className="divide-y divide-white/10">
              {list.map((match) => (
                <div key={match.id} className="grid gap-4 px-5 py-4 text-sm md:grid-cols-[1fr_90px_2fr_170px] md:items-center">
                  <div>
                    <p className="font-black text-white">{match.league}</p>
                    <p className="text-xs text-slate-500">Pré-jogo</p>
                  </div>
                  <div className="inline-flex items-center gap-2 font-black text-white"><Clock3 className="h-4 w-4 text-yellow-400" />{match.time}</div>
                  <div className="flex items-center gap-3 font-bold text-white">
                    <img src={teamLogo(match.home, match.homeLogo)} alt={match.home} className="h-8 w-8 rounded-full bg-white object-contain p-1" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                    <span>{match.home}</span>
                    <span className="text-yellow-400">x</span>
                    <img src={teamLogo(match.away, match.awayLogo)} alt={match.away} className="h-8 w-8 rounded-full bg-white object-contain p-1" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                    <span>{match.away}</span>
                  </div>
                  <p className="inline-flex justify-center rounded-xl bg-yellow-400/15 px-3 py-2 font-black text-yellow-400"><ShieldCheck className="mr-1 h-4 w-4" />Dados oficiais da partida</p>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </PremiumAppShell>
  );
}
