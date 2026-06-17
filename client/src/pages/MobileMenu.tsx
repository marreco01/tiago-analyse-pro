import {
  BarChart3,
  Bell,
  CalendarDays,
  Crown,
  Globe2,
  MessageCircle,
  LogOut,
  Shield,
  Star,
  Trophy,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Brand, GlassCard, PremiumPage } from "@/components/PremiumShell";
import { logoutLocalUser } from "@/lib/localAuth";

const mainLinks = [
{ href: "/live", label: "Hoje + 48h", icon: Zap },  { href: "/upcoming", label: "Próximos jogos", desc: "Calendário e confrontos", icon: CalendarDays },
  { href: "/analyze", label: "Análises IA", desc: "Gerar análise de confronto", icon: BarChart3 },
  { href: "/compare", label: "Comparar times", desc: "Forma, histórico e indicadores", icon: Shield },
  { href: "/ranking", label: "Rankings", desc: "Índice Analyse Pro", icon: Trophy },
  { href: "/news", label: "Notícias", desc: "Últimas notícias do futebol", icon: Bell },
  { href: "/world-cup", label: "Copa do Mundo 2026", desc: "Grade, grupos e resultados", icon: Globe2 },
  { href: "/brasileirao", label: "Brasileirão Série A", desc: "Tabela, clubes, jogos e resultados", icon: Trophy },
  { href: "/match-center", label: "Centro do Jogo", desc: "Detalhes, eventos e escalações", icon: BarChart3 },
  { href: "/favorite-teams", label: "Meus Times", desc: "Alertas e favoritos", icon: Bell },
];

const accountLinks = [
  { href: "/account", label: "Minha conta", icon: UserRound },
  { href: "/history", label: "Histórico", icon: CalendarDays },
  { href: "/favorites", label: "Favoritos", icon: Star },
];

const subscriptionLinks = [
  { href: "/plans", label: "Planos", desc: "FREE, PRO, VIP e Sócio VIP", icon: Crown },
  { href: "/payments?plan=PRO", label: "Assinar PRO", desc: "Acesso mensal ou pagamento único", icon: Wallet },
  { href: "/payments?plan=VIP", label: "Assinar VIP", desc: "Recursos premium", icon: Trophy },
  { href: "/payments?plan=SOCIO_VIP", label: "Sócio VIP Fundador", desc: "12 meses e 500 análises/dia", icon: Crown },
];

export default function MobileMenu() {
  const handleLogout = () => {
    logoutLocalUser();
    window.dispatchEvent(new Event("tap-auth-changed"));
    window.location.href = "/login";
  };

  return (
    <PremiumPage>
      <main className="pb-24 lg:hidden">
        <header className="mb-5 flex items-center justify-between">
          <Brand compact />
          <div className="flex items-center gap-2">
            <Link href="/account" className="rounded-full border border-yellow-400/40 p-2 text-yellow-300">
              <UserRound className="h-5 w-5" />
            </Link>
            <button onClick={handleLogout} className="rounded-full border border-red-400/40 p-2 text-red-300" aria-label="Sair da conta">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <h1 className="text-3xl font-black">Menu</h1>
        <p className="mt-2 text-slate-400">Todas as áreas do Analyse Pro 2.0.</p>

        <Section title="Aplicações do site">
          {mainLinks.map((item) => <MenuItem key={item.href} {...item} />)}
        </Section>

        <Section title="Conta">
          {accountLinks.map((item) => <MenuItem key={item.href} {...item} desc="" />)}
        </Section>

        <Section title="Assinaturas">
          {subscriptionLinks.map((item) => <MenuItem key={item.href} {...item} />)}
        </Section>
      </main>

      <div className="hidden lg:block">
        <GlassCard className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black">Menu mobile</h1>
          <p className="mt-2 text-slate-400">Esta área foi criada para navegação no celular.</p>
          <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-black text-black">Ir para dashboard</Link>
        </GlassCard>
      </div>
    </PremiumPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-yellow-400">{title}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function MenuItem({ href, label, desc, icon: Icon }: { href: string; label: string; desc: string; icon: any }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#090d13]/95 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 text-yellow-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-white">{label}</p>
        {desc ? <p className="mt-1 text-sm text-slate-400">{desc}</p> : null}
      </div>
      <span className="text-yellow-400">›</span>
    </Link>
  );
}
