import { useEffect, useState } from "react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { getCurrentUser } from "@/lib/localAuth";
import { dailyTips, normalizedPlan, tipLimitForPlan, type DailyTip } from "@/data/dailyTips";
import { TipRow } from "./Dashboard";
import { Lock, FileBarChart2 } from "lucide-react";

export default function Tips() {
  const user = getCurrentUser();
  const plan = normalizedPlan(user);
  const [reports, setReports] = useState<DailyTip[]>(dailyTips);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/football/reports?limit=10")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.reports) && data.reports.length) {
          setReports(data.reports as DailyTip[]);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const limit = tipLimitForPlan(user);
  const visible = reports.slice(0, limit);
  const locked = reports.slice(limit);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black text-yellow-400">RELATÓRIOS DO DIA</p>
              <h1 className="mt-2 text-4xl font-black md:text-5xl">Leituras estatísticas dos jogos</h1>
              <p className="mt-3 max-w-3xl text-slate-400">
                Acompanhe forma recente, médias e indicadores dos confrontos. Os dados são informativos e não representam garantia de resultado.
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-yellow-300">Seu acesso • {plan}</p>
              <p className="text-3xl font-black text-yellow-400">{visible.length}/{reports.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <FileBarChart2 className="h-6 w-6 text-yellow-400" />
            <h2 className="text-xl font-black">Relatórios disponíveis</h2>
          </div>
          <div className="space-y-2">
            {visible.map((report) => <TipRow key={report.id} tip={report} />)}
          </div>
        </GlassCard>

        {locked.length ? (
          <GlassCard className="p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-orange-400" />
                <div>
                  <h2 className="text-xl font-black">Relatórios premium bloqueados</h2>
                  <p className="mt-1 text-sm text-slate-400">PRO e VIP liberam o conjunto completo de relatórios estatísticos diários.</p>
                </div>
              </div>
              <a href="/plans" className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-black text-black">Ver planos</a>
            </div>
            <div className="space-y-2">
              {locked.map((report) => <TipRow key={report.id} tip={report} locked />)}
            </div>
          </GlassCard>
        ) : null}
      </div>
    </PremiumAppShell>
  );
}
