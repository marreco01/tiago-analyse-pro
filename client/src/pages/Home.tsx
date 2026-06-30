import { useEffect, useState, type ReactNode } from "react";
import { Brand, GlassCard, PremiumPage } from "@/components/PremiumShell";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Crown,
  Home as HomeIcon,
  MessageCircle,
  Radio,
  Shield,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    name: "FREE",
    price: "R$ 0,00",
    suffix: "/30 dias",
    color: "text-white",
    border: "border-white/70 shadow-[0_0_26px_rgba(255,255,255,0.07)]",
    cta: "Plano Atual",
    features: ["Relatórios básicos", "Estatísticas básicas", "Ranking público", "Suporte padrão"],
  },
  {
    name: "PRO",
    price: "R$ 19,90",
    suffix: "/30 dias",
    color: "text-yellow-400",
    border: "border-yellow-400/80 shadow-[0_0_30px_rgba(250,204,21,0.12)]",
    cta: "Assinar PRO",
    badge: "MAIS ESCOLHIDO",
    features: ["Relatórios completos", "Estatísticas avançadas", "Favoritos", "Histórico de análises", "Suporte prioritário"],
  },
  {
    name: "VIP",
    price: "R$ 39,90",
    suffix: "/30 dias",
    color: "text-orange-400",
    border: "border-orange-500/70 shadow-[0_0_28px_rgba(249,115,22,0.10)]",
    cta: "Assinar VIP",
    features: ["Tudo do plano PRO", "Relatórios premium", "Análises pré-live", "Indicadores ao vivo", "Suporte VIP 24/7"],
  },
];

export default function Home() {
  return (
    <PremiumPage>
      <div className="lg:hidden">
        <MobileHome />
      </div>
      <div className="hidden lg:block">
        <DesktopHome />
      </div>
    </PremiumPage>
  );
}


function PresentationSlider({ compact = false }: { compact?: boolean }) {
  const slides = [
    {
      eyebrow: "Analyse Pro 2.0",
      title: "Análise de futebol com dados, IA e leitura rápida.",
      text: "Acompanhe jogos ao vivo, estatísticas, ranking, comparação de times e alertas em uma única plataforma.",
      cta: "Começar análise",
      href: "/analyze",
      icon: <BarChart3 />,
    },
    {
      eyebrow: "Brasileirão • Ao vivo • Rodadas",
      title: "Campeonatos organizados para você decidir melhor.",
      text: "Tabela, jogos do dia, próximos confrontos, resultados e centro do jogo com dados mais limpos.",
      cta: "Ver jogos",
      href: "/upcoming?tab=today",
      icon: <Trophy />,
    },
    {
      eyebrow: "Chat por partida",
      title: "Cada jogo agora possui uma sala exclusiva.",
      text: "Entre em Jogos ao vivo, escolha uma partida e comente sem misturar conversas de outros jogos.",
      cta: "Ver jogos ao vivo",
      href: "/live",
      icon: <MessageCircle />,
    },
  ];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  const slide = slides[index];
  const Icon = () => <div className="text-yellow-300 [&_svg]:h-6 [&_svg]:w-6">{slide.icon}</div>;

  return (
    <section className={`relative overflow-hidden border border-yellow-400/20 bg-[radial-gradient(circle_at_12%_18%,rgba(250,204,21,0.18),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.94),rgba(5,20,12,0.92))] shadow-xl ${compact ? "mt-4 rounded-[1.35rem] p-4" : "rounded-2xl p-5"}`}>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />
      <div className="relative z-10 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
          <Icon />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">{slide.eyebrow}</p>
          <h2 className={`${compact ? "mt-1 text-xl" : "mt-1 text-2xl"} font-black leading-tight text-white`}>{slide.title}</h2>
          <p className="mt-1 max-w-4xl text-sm font-semibold text-slate-300">{slide.text}</p>
        </div>
        <Link href={slide.href} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-3 text-sm font-black text-black">
          {slide.cta}
        </Link>
      </div>
      <div className="relative z-10 mt-4 flex gap-2">
        {slides.map((item, itemIndex) => (
          <button key={item.eyebrow} type="button" onClick={() => setIndex(itemIndex)} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-12 bg-yellow-400" : "w-5 bg-white/20"}`} aria-label={`Abrir slide ${itemIndex + 1}`} />
        ))}
      </div>
    </section>
  );
}

function MobileHome() {
  return (
    <main className="-mx-2 pb-24">
      <header className="sticky top-0 z-40 -mx-3 border-b border-white/10 bg-[#030405]/92 px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <Brand compact />
          <div className="flex items-center gap-3">
            <Link href="/favorite-teams" className="relative rounded-full p-2 text-white">
              <Bell className="h-7 w-7" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-yellow-400" />
            </Link>
            <Link href="/login" className="rounded-full border border-yellow-400/45 p-2 text-yellow-400">
              <UserRound className="h-7 w-7" />
            </Link>
          </div>
        </div>

        <nav className="scrollbar-hide mt-5 flex gap-3 overflow-x-auto pb-1">
          <MobileTop href="/" label="Início" active icon={<HomeIcon />} />
          <MobileTop href="/live" label="Ao Vivo" icon={<Zap />} />
          <MobileTop href="/analyze" label="Análises" icon={<BarChart3 />} />
          <MobileTop href="/world-cup" label="Copa 2026" icon={<Trophy />} />
          <MobileTop href="/favorite-teams" label="Meus Times" icon={<Shield />} />
        </nav>
      </header>

      

      <section className="relative mt-4 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#05070b] p-4 shadow-xl">
        <div className="absolute inset-0 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-30" />
        <img
          src="/player-premium.png"
          alt="Jogador Analyse Pro 2.0"
          className="absolute bottom-0 right-0 h-full w-[62%] object-cover object-center opacity-80"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.65) 28%, black 52%)",
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.65) 28%, black 52%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/20" />
        <div className="relative z-10 min-h-[340px] max-w-[78%] pt-5">
          <h1 className="text-[2.05rem] font-black leading-[1.03] tracking-[-0.055em] text-white">
            Análises<br />
            profissionais.<br />
            <span className="text-yellow-400">Mais inteligência.</span><br />
            Mais informação.
          </h1>
          <p className="mt-4 max-w-[255px] text-sm leading-relaxed text-slate-300">
            Jogos ao vivo, estatísticas avançadas, rankings e comunidade PRO em um só lugar.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/register" className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-3 text-center font-black text-black">
              Criar Conta
            </Link>
            <Link href="/plans" className="rounded-2xl border border-yellow-400/60 bg-black/30 px-3 py-3 text-center font-black text-white">
              Ver Planos
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-5 gap-3">
        <Quick href="/live" icon={<Radio />} title="Jogos" text="ao vivo" dot />
        <Quick href="/upcoming" icon={<CalendarDays />} title="Próximos" text="jogos" />
        <Quick href="/compare" icon={<Shield />} title="Comparar" text="times" />
        <Quick href="/ranking" icon={<BarChart3 />} title="Ranking" text="PRO" />
        <Quick href="/live" icon={<MessageCircle />} title="Chat" text="por jogo" online />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <MobileLiveCard />
        <MobileWorldCupCard />
      </section>

      <MobileIndexCard />

      <section className="mt-4 rounded-[1.4rem] border border-red-500/70 bg-[radial-gradient(circle_at_15%_25%,rgba(239,68,68,0.22),transparent_42%),linear-gradient(135deg,rgba(239,68,68,0.18),rgba(127,29,29,0.08))] p-4">
        <Link href="/payments?plan=SOCIO_VIP" className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white">
            <Crown className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-red-300">SÓCIO VIP FUNDADOR</p>
              <span className="rounded-full bg-red-500 px-2 py-1 text-[9px] font-black text-white">VAGAS LIMITADAS</span>
            </div>
            <p className="mt-1 text-xs text-slate-300">12 meses de acesso VIP • 500 análises/dia.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 line-through">R$ 478,80</p>
            <p className="text-xl font-black text-red-300">R$ 197</p>
          </div>
        </Link>
      </section>

      <MobileBottomPublic />
    </main>
  );
}

function DesktopHome() {
  return (
    <>
      <MarketingNav />

      

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <section className="relative min-h-[450px] overflow-hidden rounded-2xl border border-white/10 bg-[#05070b] shadow-2xl">
          <div className="absolute inset-0 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-25" />
          <img
            src="/player-premium.png"
            alt="Jogador Analyse Pro 2.0"
            className="absolute bottom-0 right-0 h-full w-[58%] object-cover object-[center_25%] opacity-95"
            style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.72) 21%, black 43%)", maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.72) 21%, black 43%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/15" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-yellow-400/0 via-yellow-400/55 to-yellow-400/0" />
          <div className="relative z-10 flex min-h-[450px] max-w-[53%] flex-col justify-center p-7 lg:p-9">
            <h1 className="text-[2.6rem] font-black leading-[1.03] tracking-[-0.04em] text-white lg:text-[3.25rem]">
              Análises profissionais.<br />
              <span className="text-yellow-400">Mais inteligência.</span><br />
              Mais informação.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300 lg:text-base">
              Jogos ao vivo, estatísticas avançadas, rankings e comunidade PRO para acompanhar futebol de outro nível.
            </p>
            <div className="mt-7 grid max-w-md grid-cols-4 gap-2 text-center">
              <Metric value="AO VIVO" label="Jogos" />
              <Metric value="IA" label="Análises" />
              <Metric value="TOP" label="Rankings" />
              <Metric value="24/7" label="Acesso" />
            </div>
            <div className="mt-7 flex gap-3">
              <Link href="/register" className="h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-7 py-3 font-black text-black hover:from-yellow-300 hover:to-orange-400">Criar Conta Grátis</Link>
              <Link href="/plans" className="h-12 rounded-xl border border-yellow-400/50 bg-transparent px-7 py-3 font-black text-white hover:bg-yellow-400/10">Ver Planos</Link>
            </div>
          </div>
        </section>

        <GlassCard className="p-6 lg:p-8">
          <div className="text-center">
            <h2 className="text-xl font-black text-white lg:text-2xl">Escolha o plano ideal para você</h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500" />
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <Link key={plan.name} href={plan.name === "FREE" ? "/register" : `/payments?plan=${plan.name}`} className={`relative rounded-xl border ${plan.border} bg-black/25 p-5 transition hover:-translate-y-1`}>
                {plan.badge ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange-500 px-3 py-1 text-[9px] font-black text-white">{plan.badge}</span> : null}
                <p className={`text-lg font-black ${plan.color}`}>{plan.name}</p>
                <p className={`mt-3 text-2xl font-black ${plan.color}`}>{plan.price}<span className="ml-1 text-xs text-slate-400">{plan.suffix}</span></p>
                <ul className="mt-5 min-h-[136px] space-y-2 text-[12px] text-slate-200">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className={`${plan.color}`}>✓</span> {feature}</li>)}
                </ul>
                <div className={`mt-5 rounded-lg px-3 py-3 text-center text-xs font-black ${plan.name === "FREE" ? "border border-white/30 bg-white/10 text-white" : plan.name === "PRO" ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black" : "bg-gradient-to-r from-orange-400 to-orange-600 text-black"}`}>{plan.cta}</div>
              </Link>
            ))}
          </div>
            <Link href="/payments?plan=SOCIO_VIP" className="mt-5 block rounded-2xl border border-red-500/70 bg-[radial-gradient(circle_at_10%_20%,rgba(239,68,68,0.20),transparent_38%),linear-gradient(135deg,rgba(239,68,68,0.16),rgba(2,6,23,0.52))] p-5 hover:bg-red-500/10">
              <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white">
                  <Crown className="h-7 w-7" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-red-300">SÓCIO VIP FUNDADOR</h3>
                    <span className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-black text-white">VAGAS LIMITADAS</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">12 meses de acesso VIP • pagamento único • acesso após aprovação do PIX.</p>
                  <p className="mt-3 text-xs text-slate-500">Plataforma informativa e analítica. Acompanhe futebol com responsabilidade.</p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-xs font-black text-slate-500 line-through">De R$ 478,80</p>
                  <p className="text-3xl font-black text-red-300">R$ 197,00</p>
                  <div className="mt-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 text-center text-sm font-black text-white">
                    QUERO SER SÓCIO VIP
                  </div>
                </div>
              </div>
            </Link>

        </GlassCard>
      </section>


    </>
  );
}

function MobileTop({ href, label, icon, active = false, badge }: { href: string; label: string; icon: ReactNode; active?: boolean; badge?: string }) {
  return (
    <Link href={href} className={`relative flex min-w-[112px] flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${active ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-white/10 bg-[#090d13] text-slate-300"}`}>
      <span className="[&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      <span>{label}</span>
      {badge ? <span className="absolute -right-1 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{badge}</span> : null}
      {active ? <span className="absolute -bottom-1 h-1 w-10 rounded-full bg-yellow-400" /> : null}
    </Link>
  );
}

function Quick({ href, icon, title, text, dot, online }: { href: string; icon: ReactNode; title: string; text: string; dot?: boolean; online?: boolean }) {
  return (
    <Link href={href} className="relative min-h-[100px] rounded-2xl border border-white/10 bg-[#090d13]/90 p-3 text-center shadow-xl">
      {dot ? <span className="absolute left-3 top-3 h-3 w-3 rounded-full bg-red-500" /> : null}
      {online ? <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-green-500" /> : null}
      <div className="mx-auto mt-2 flex h-9 w-9 items-center justify-center text-yellow-400 [&_svg]:h-8 [&_svg]:w-8">{icon}</div>
      <p className="mt-2 text-sm font-black text-white">{title}</p>
      <p className="text-xs text-slate-400">{text}</p>
    </Link>
  );
}

function MobileLiveCard() {
  return (
    <Link href="/live" className="rounded-[1.4rem] border border-white/10 bg-[#080b10]/95 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-black text-white"><span className="h-3 w-3 rounded-full bg-red-500" /> AO VIVO</p>
        <span className="text-xs font-bold text-slate-400">La Liga</span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 text-center">
        <Team src="/team-logos/barcelona.png" name="Barcelona" />
        <div>
          <p className="text-4xl font-black text-white">2 - 1</p>
          <p className="text-sm font-black text-yellow-400">45'</p>
          <p className="text-xs text-slate-400">Intervalo</p>
        </div>
        <Team src="/team-logos/real-madrid.png" name="Real Madrid" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
        <MiniMetric label="Gols esp." value="1.85 x 1.32" />
        <MiniMetric label="Prob. gol" value="62% x 54%" />
        <MiniMetric label="Confiança" value="78%" green />
      </div>
      <p className="mt-4 rounded-xl border border-white/10 py-3 text-center font-black text-yellow-400">Ver detalhes ao vivo ›</p>
    </Link>
  );
}

function MobileWorldCupCard() {
  return (
    <Link href="/world-cup" className="rounded-[1.4rem] border border-emerald-400/25 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_36%),#080b10] p-4 shadow-xl">
      <p className="flex items-center gap-2 font-black text-emerald-300"><Trophy className="h-5 w-5" /> COPA 2026</p>
      <p className="mt-5 text-2xl font-black text-white">Grade completa</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">Jogos, grupos, resultados e mata-mata da Copa do Mundo.</p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <MiniMetric label="Jogos" value="104" />
        <MiniMetric label="Grupos" value="12" />
        <MiniMetric label="Países" value="3" green />
      </div>
      <p className="mt-5 rounded-xl border border-emerald-400/20 py-3 text-center font-black text-emerald-300">Abrir Copa 2026 ›</p>
    </Link>
  );
}

function MobileIndexCard() {
  return (
    <Link href="/ranking" className="mt-4 block rounded-[1.4rem] border border-yellow-400/25 bg-[#080b10]/95 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-black text-yellow-400"><BarChart3 className="h-5 w-5" /> ÍNDICE ANALYSE PRO</p>
        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-black text-green-400">AO VIVO</span>
      </div>
      <p className="mt-4 text-4xl font-black text-white">78.6 <span className="text-base text-green-400">Alto</span></p>
      <div className="mt-5 h-2 rounded-full bg-white/10">
        <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-yellow-400 to-orange-500" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        <div><p className="text-slate-400">Precisão</p><p className="font-black text-green-400">78%</p></div>
        <div><p className="text-slate-400">Dados</p><p className="font-black text-yellow-400">API</p></div>
        <div><p className="text-slate-400">Status</p><p className="font-black text-green-400">Ativo</p></div>
      </div>
    </Link>
  );
}

function MobileBottomPublic() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#030405]/94 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        <Bottom href="/" label="Início" icon={<HomeIcon />} active />
        <Bottom href="/live" label="Jogos" icon={<Radio />} />
        <Bottom href="/analyze" label="Análises" icon={<BarChart3 />} />
        <Bottom href="/ranking" label="Ranking" icon={<Trophy />} />
        <Bottom href="/mobile-menu" label="Menu" icon={<span className='text-3xl leading-none'>≡</span>} />
      </div>
    </nav>
  );
}

function Bottom({ href, label, icon, active, badge }: { href: string; label: string; icon: ReactNode; active?: boolean; badge?: string }) {
  return (
    <Link href={href} className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold ${active ? "text-yellow-400" : "text-slate-400"}`}>
      {active ? <span className="absolute -top-2 h-1 w-9 rounded-full bg-yellow-400" /> : null}
      <span className="[&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      <span>{label}</span>
      {badge ? <span className="absolute right-4 top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{badge}</span> : null}
    </Link>
  );
}

function Team({ src, name }: { src: string; name: string }) {
  return (
    <div className="w-[74px]">
      <img src={src} alt={name} className="mx-auto h-14 w-14 object-contain" onError={(event) => { event.currentTarget.src = "/favicon.png"; }} />
      <p className="mt-2 truncate text-xs font-black text-white">{name}</p>
    </div>
  );
}

function MiniMetric({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return <div><p className="text-[9px] uppercase text-slate-400">{label}</p><p className={`mt-1 text-xs font-black ${green ? "text-green-400" : "text-yellow-400"}`}>{value}</p></div>;
}

function MarketingNav() {
  return (
    <header className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#05070b]/80 px-4 py-3 backdrop-blur">
      <Brand compact />
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-lg border border-white/15 px-5 py-2.5 text-xs font-black text-white hover:bg-white/10">Entrar</Link>
        <Link href="/register" className="rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-2.5 text-xs font-black text-black">Criar Conta</Link>
      </div>
    </header>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><p className="text-base font-black text-white">{value}</p><p className="text-[10px] text-slate-400">{label}</p></div>;
}
