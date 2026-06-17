import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { Headphones } from "lucide-react";

export default function Support() {
  return (
    <PremiumAppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Suporte</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Central de suporte</h1>
          <p className="mt-3 max-w-3xl text-slate-400">Canal para ajuda, dúvidas sobre plano e suporte técnico.</p>
        </div>
        <GlassCard className="p-8">
          <Headphones className="mb-4 h-10 w-10 text-yellow-400" />
          <h2 className="text-2xl font-black">Suporte Analyse Pro</h2>
          <p className="mt-2 text-slate-400">Estrutura pronta para formulário, WhatsApp, tickets ou chat de atendimento.</p>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}
