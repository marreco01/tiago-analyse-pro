import { PremiumPage, PremiumTopNav } from "@/components/PremiumShell";
import { Check, Crown } from "lucide-react";
import { getCurrentUser } from "@/lib/localAuth";

const plans = [
  { name: "FREE", price: "R$ 0,00", suffix: "/30 dias", desc: "Para testar a plataforma.", color: "text-white", border: "border-white/70 shadow-[0_0_30px_rgba(255,255,255,0.07)]", cta: "Criar conta grátis", href: "/register", features: ["Relatórios básicos", "Estatísticas básicas", "Ranking público", "Suporte padrão"] },
  { name: "PRO", price: "R$ 19,90", suffix: "/30 dias", desc: "Para acompanhar jogos com profundidade.", color: "text-yellow-400", border: "border-yellow-400", cta: "Assinar PRO", href: "/payments?plan=PRO", badge: "MAIS ESCOLHIDO", features: ["Relatórios completos", "Estatísticas avançadas", "Favoritos", "Histórico de análises", "Comunidade PRO", "Suporte prioritário"] },
  { name: "VIP", price: "R$ 39,90", suffix: "/30 dias", desc: "Para acesso completo e premium.", color: "text-orange-400", border: "border-orange-500/75 shadow-[0_0_32px_rgba(249,115,22,0.10)]", cta: "Assinar VIP", href: "/payments?plan=VIP", features: ["Tudo do PRO", "Relatórios premium", "Análises comparativas", "Indicadores ao vivo", "Suporte VIP 24/7", "Destaque na comunidade"] },
];

export default function Plans() {
  const user = getCurrentUser();
  return (
    <PremiumPage>
      <PremiumTopNav />
      <section className="mx-auto max-w-6xl py-10">
        <div className="text-center">
          <p className="text-sm font-black text-yellow-400">PLANOS</p>
          <h1 className="mt-3 text-5xl font-black">Escolha o plano ideal para você</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">FREE para conhecer. PRO e VIP liberam recursos estatísticos premium por 30 dias após confirmação do pagamento.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <a key={plan.name} href={user || plan.name === "FREE" ? plan.href : "/login"} className={`relative rounded-3xl border ${plan.border} bg-[#07090d]/90 p-8 shadow-2xl transition hover:-translate-y-1`}>
              {plan.badge ? <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-black text-white">{plan.badge}</span> : null}
              <p className={`text-3xl font-black ${plan.color}`}>{plan.name}</p>
              <h2 className={`mt-5 text-4xl font-black ${plan.color}`}>{plan.price}<span className="text-sm text-slate-400"> {plan.suffix}</span></h2>
              <p className="mt-3 text-slate-400">{plan.desc}</p>
              <ul className="mt-7 space-y-3 text-sm text-slate-200">{plan.features.map((f) => <li key={f} className="flex gap-2"><Check className={`h-4 w-4 ${plan.color}`} /> {f}</li>)}</ul>
              <div className={`mt-8 rounded-xl px-4 py-4 text-center font-black ${plan.name === "FREE" ? "border border-white/30 bg-white/10 text-white" : plan.name === "PRO" ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black" : "bg-gradient-to-r from-orange-400 to-orange-600 text-black"}`}>{plan.cta}</div>
            </a>
          ))}
        </div>

        <a href={user ? "/payments?plan=SOCIO_VIP" : "/login"} className="group relative mt-8 block overflow-hidden rounded-3xl border border-red-500/75 bg-[#07090d]/95 p-7 shadow-[0_0_55px_rgba(239,68,68,0.16)] transition hover:-translate-y-1 hover:border-red-400">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_30%,rgba(239,68,68,0.22),transparent_35%),radial-gradient(circle_at_92%_30%,rgba(153,27,27,0.16),transparent_33%)]" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white"><Crown className="h-8 w-8" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-red-400">SÓCIO VIP FUNDADOR</h2>
                  <span className="rounded-full bg-red-500 px-4 py-1 text-xs font-black text-white">VAGAS LIMITADAS</span>
                </div>
                <p className="mt-2 text-slate-300">12 meses de acesso VIP por pagamento único.</p>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-200">
                  {["Acesso VIP por 1 ano", "Até 500 análises por dia", "Comunidade PRO", "Estatísticas premium", "Prioridade em novidades"].map((item) => <li className="flex items-center gap-2" key={item}><Check className="h-4 w-4 text-red-400" />{item}</li>)}
                </ul>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-bold text-slate-500 line-through">De R$ 478,80</p>
              <p className="text-4xl font-black text-red-400">R$ 197,00</p>
              <p className="text-sm text-slate-400">pagamento único</p>
              <div className="mt-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-7 py-4 text-center font-black text-white">QUERO SER SÓCIO VIP</div>
            </div>
          </div>
          <p className="relative mt-6 border-t border-white/10 pt-4 text-xs text-slate-400">Acesso válido por 12 meses após aprovação do pagamento. Plataforma informativa e analítica. Acompanhe futebol com responsabilidade.</p>
        </a>
      </section>
    </PremiumPage>
  );
}
