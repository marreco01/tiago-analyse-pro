import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { ListChecks } from "lucide-react";

export default function AdminLogs() {
  return <PremiumAppShell><GlassCard className="p-8"><ListChecks className="mb-4 h-10 w-10 text-yellow-400" /><h1 className="text-4xl font-black">Logs do sistema</h1><p className="mt-2 text-slate-400">Área preparada para auditoria, erros, deploys e ações importantes.</p></GlassCard></PremiumAppShell>;
}
