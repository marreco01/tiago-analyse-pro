import { useEffect, useMemo, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { formatDatePt, type UpcomingMatch } from "@/data/matchData";
import { teams } from "@/data/teams";
import { fetchUpcomingRobotGames } from "@/lib/upcomingRobot";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";

type UpcomingWithLogo = UpcomingMatch & { homeLogo?: string; awayLogo?: string; importance?: number; importanceLabel?: string; reason?: string };

const flagMap: Record<string, string> = {
  "argentina": "ar",
  "austria": "at",
  "austrália": "au",
  "australia": "au",
  "belgium": "be",
  "bélgica": "be",
  "bosnia-herzegovina": "ba",
  "bosnia and herzegovina": "ba",
  "bósnia-herzegovina": "ba",
  "bósnia e herzegovina": "ba",
  "brazil": "br",
  "brasil": "br",
  "canada": "ca",
  "canadá": "ca",
  "croatia": "hr",
  "croácia": "hr",
  "curacao": "cw",
  "curaçao": "cw",
  "czechia": "cz",
  "chéquia": "cz",
  "denmark": "dk",
  "dinamarca": "dk",
  "england": "gb-eng",
  "inglaterra": "gb-eng",
  "france": "fr",
  "frança": "fr",
  "germany": "de",
  "alemanha": "de",
  "ghana": "gh",
  "haiti": "ht",
  "iraq": "iq",
  "iraque": "iq",
  "italy": "it",
  "itália": "it",
  "japan": "jp",
  "japão": "jp",
  "jordan": "jo",
  "jordânia": "jo",
  "mexico": "mx",
  "méxico": "mx",
  "morocco": "ma",
  "marrocos": "ma",
  "netherlands": "nl",
  "países baixos": "nl",
  "new zealand": "nz",
  "nova zelândia": "nz",
  "norway": "no",
  "noruega": "no",
  "paraguay": "py",
  "paraguai": "py",
  "portugal": "pt",
  "qatar": "qa",
  "catar": "qa",
  "scotland": "gb-sct",
  "escócia": "gb-sct",
  "senegal": "sn",
  "south africa": "za",
  "áfrica do sul": "za",
  "south korea": "kr",
  "coreia do sul": "kr",
  "spain": "es",
  "espanha": "es",
  "switzerland": "ch",
  "suíça": "ch",
  "tunisia": "tn",
  "tunísia": "tn",
  "turkey": "tr",
  "türkiye": "tr",
  "turquia": "tr",
  "united states": "us",
  "estados unidos": "us",
  "uruguay": "uy",
  "uruguai": "uy",
};

function normalizeName(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function teamLogo(name: string, apiLogo?: string) {
  if (apiLogo) return apiLogo;
  const key = normalizeName(name);
  const flag = flagMap[key] || flagMap[name.toLowerCase()];
  if (flag) return `https://flagcdn.com/w80/${flag}.png`;
  return teams.find((team) => normalizeName(team.name) === key)?.logo || "/favicon.png";
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
        const data = await fetchUpcomingRobotGames(10);
        if (!cancelled) {
          setMatches(data.games as any);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar Fonte pública.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = window.setInterval(load, 60000);
    return () => { cancelled = true; window.clearInterval(interval); };
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
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Top 10</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Próximos jogos importantes</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Copa do Mundo, Libertadores, Champions, Brasileirão Série A e principais ligas em destaque.
          </p>
        </GlassCard>

        {loading ? (
          <GlassCard className="p-8 text-center text-yellow-400 font-black">Carregando top 10 próximos jogos...</GlassCard>
        ) : null}


        {error ? (
          <GlassCard className="p-8 text-center text-red-300">
            <p className="text-xl font-black">Não foi possível carregar Fonte pública.</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </GlassCard>
        ) : null}

        {!loading && !error && !matches.length ? (
          <GlassCard className="p-8 text-center text-slate-400">Nenhum jogo real encontrado nas fontes públicas agora.</GlassCard>
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
                    <p className="font-black text-white">{match.league || (match as any).competition}</p>
                    
                  </div>
                  <div className="inline-flex items-center gap-2 font-black text-white"><Clock3 className="h-4 w-4 text-yellow-400" />{match.time}</div>
                  <div className="flex items-center gap-3 font-bold text-white">
                    <img src={teamLogo(match.home, match.homeLogo)} alt={match.home} className="h-9 w-9 object-contain" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                    <span>{match.home}</span>
                    <span className="text-yellow-400">x</span>
                    <img src={teamLogo(match.away, match.awayLogo)} alt={match.away} className="h-9 w-9 object-contain" onError={(e) => { e.currentTarget.src = "/favicon.png"; }} />
                    <span>{match.away}</span>
                  </div>
                  <p className="inline-flex justify-center rounded-xl bg-yellow-400/15 px-3 py-2 font-black text-yellow-400"><ShieldCheck className="mr-1 h-4 w-4" />{match.importanceLabel || "Top 10"} · {match.importance || 0}%</p>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </PremiumAppShell>
  );
}
