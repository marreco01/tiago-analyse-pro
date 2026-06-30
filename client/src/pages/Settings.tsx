import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { BellRing, Settings as SettingsIcon, Smartphone, Star } from "lucide-react";
import { Link } from "wouter";
import InstallAppButton from "@/components/InstallAppButton";

export default function Settings() {
  return (
    <PremiumAppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Configurações</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Conta e aplicativo</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Personalize notificações, times favoritos e instalação no telemóvel.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <GlassCard className="p-7">
            <Smartphone className="mb-4 h-9 w-9 text-yellow-400" />
            <h2 className="text-2xl font-black">Instalar Analyse Pro</h2>
            <p className="mt-3 text-sm text-slate-400">Adicione à tela inicial e abra como aplicativo.</p>
            <div className="mt-6"><InstallAppButton /></div>
          </GlassCard>
          <GlassCard className="p-7">
            <BellRing className="mb-4 h-9 w-9 text-yellow-400" />
            <h2 className="text-2xl font-black">Alertas dos times</h2>
            <p className="mt-3 text-sm text-slate-400">Escolha os seus clubes e configure avisos de partidas.</p>
            <Link href="/favorite-teams" className="mt-6 inline-flex rounded-xl border border-yellow-400/30 px-5 py-3 font-black text-yellow-300 hover:bg-yellow-400/10">Configurar alertas</Link>
          </GlassCard>
        </div>
      </div>
    </PremiumAppShell>
  );
}
