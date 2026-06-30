import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  Crown,
  Globe2,
  ChevronDown,
  Headphones,
  Home,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  Settings,
  Shield,
  Star,
  Target,
  Trophy,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { getCurrentUser, isAdminUser, logoutLocalUser } from "@/lib/localAuth";

export function LogoMark({ small = false }: { small?: boolean }) {
  return (
    <div
      className="flex items-end gap-1 drop-shadow-[0_0_14px_rgba(250,204,21,0.28)]"
      aria-label="Planos: Free, Pro, VIP e Sócio VIP Fundador"
      title="FREE • PRO • VIP • SÓCIO VIP"
    >
      <span className={`${small ? "h-3.5 w-2" : "h-6 w-3"} rounded bg-white shadow-[0_0_12px_rgba(255,255,255,0.40)]`} />
      <span className={`${small ? "h-5 w-2" : "h-8 w-3"} rounded bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.42)]`} />
      <span className={`${small ? "h-7 w-2" : "h-11 w-3"} rounded bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.42)]`} />
      <span className={`${small ? "h-9 w-2" : "h-14 w-3"} rounded bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.42)]`} />
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <LogoMark small={compact} />
      <div className={compact ? "text-sm font-black" : "text-2xl font-black md:text-3xl"}>
        <span className="text-white">ANALYSE </span>
        <span className="text-yellow-400">PRO 2.0</span>
      </div>
    </Link>
  );
}

function WorldCupTicker() {
  const WORLD_CUP_START = new Date("2026-06-11T00:00:00-03:00").getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, WORLD_CUP_START - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, WORLD_CUP_START - Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const countdown = `${String(days).padStart(2, "0")}d : ${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(seconds).padStart(2, "0")}s`;

  const groups = [
    { group: "Grupo A", teams: ["🇲🇽", "🇿🇦", "🇰🇷", "🇨🇿"] },
    { group: "Grupo B", teams: ["🇨🇦", "🇶🇦", "🇨🇭", "🇩🇰"] },
    { group: "Grupo C", teams: ["🇧🇷", "🇲🇦", "🇭🇹", "🏴"] },
    { group: "Grupo D", teams: ["🇺🇸", "🇵🇾", "🇦🇺", "🇹🇷"] },
    { group: "Grupo E", teams: ["🇩🇪", "🇨🇼", "🇨🇮", "🇪🇨"] },
    { group: "Grupo F", teams: ["🇳🇱", "🇯🇵", "🇹🇳", "❓"] },
    { group: "Grupo G", teams: ["🇧🇪", "🇪🇬", "🇮🇷", "🇳🇿"] },
    { group: "Grupo H", teams: ["🇪🇸", "🇨🇻", "🇸🇦", "🇺🇾"] },
    { group: "Grupo I", teams: ["🇫🇷", "🇸🇳", "🇮🇶", "🇳🇴"] },
    { group: "Grupo J", teams: ["🇦🇷", "🇩🇿", "🇦🇹", "🇯🇴"] },
    { group: "Grupo K", teams: ["🇵🇹", "🇺🇿", "🇨🇴", "❓"] },
    { group: "Grupo L", teams: ["🏴", "🇭🇷", "🇬🇭", "🇵🇦"] },
  ];

  const tickerGroups = (
    <>
      {groups.map((item) => (
        <Link key={item.group} href="/world-cup" className="flex items-center gap-3 px-5 text-white hover:text-yellow-300">
          <span className="rounded-md bg-yellow-400/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-yellow-300">{item.group}</span>
          <span className="flex items-center gap-2 text-xl font-bold leading-none tracking-normal">
            {item.teams.map((team) => (
              <span key={team} className="inline-flex items-center">{team}</span>
            ))}
          </span>
          <span className="ml-2 h-1.5 w-1.5 rounded-full bg-white/30" />
        </Link>
      ))}
    </>
  );

  return (
    <div className="worldcup-ticker relative z-30 -mx-5 flex overflow-hidden border-b border-yellow-400/20 bg-gradient-to-r from-[#4b1207] via-[#08351d] to-[#13162f] text-xs shadow-[0_6px_22px_rgba(0,0,0,0.35)] lg:-mx-10">
      <Link
        href="/world-cup"
        className="relative z-10 flex shrink-0 items-center gap-2 border-r border-yellow-300/20 bg-gradient-to-r from-[#4b1207] via-[#4b1207] to-[#3d160a] px-4 py-1.5 text-white shadow-[10px_0_18px_rgba(0,0,0,0.35)] hover:text-yellow-300"
        title="Contagem regressiva real para o início da Copa do Mundo 2026"
      >
        <span className="text-yellow-400">🏆</span>
        <span className="font-black tabular-nums">{countdown}</span>
      </Link>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="worldcup-ticker-track flex w-max items-center whitespace-nowrap py-1.5">
          {tickerGroups}
          {tickerGroups}
        </div>
      </div>
    </div>
  );
}
export function PremiumTopNav() {
  const user = getCurrentUser();
  const admin = isAdminUser(user);
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <Brand />
      {user ? (
        <nav className="hidden items-center gap-8 text-sm font-bold text-white/90 lg:flex">
          <Link href="/dashboard" className="hover:text-yellow-400">Dashboard</Link>
          <Link href="/analyze" className="hover:text-yellow-400">Análises</Link>
          <Link href="/reports" className="hover:text-yellow-400">Relatórios</Link>
          <Link href="/statistics" className="hover:text-yellow-400">Estatísticas</Link>
          <Link href="/history" className="hover:text-yellow-400">Histórico</Link>
          <Link href="/favorites" className="hover:text-yellow-400">Favoritos</Link>
        </nav>
      ) : <div className="hidden lg:block" />}
      <div className="flex items-center gap-3">
        {user ? (
          <Link href="/account" className="hidden rounded-xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-black text-white hover:bg-white/10 sm:inline-block">
            Minha conta
          </Link>
        ) : (
          <Link href="/login" className="hidden rounded-xl border border-white/15 bg-black/30 px-7 py-3 text-sm font-black text-white hover:bg-white/10 sm:inline-block">
            Entrar
          </Link>
        )}
        <Link href={user ? "/plans" : "/register"} className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-black text-black shadow-[0_0_22px_rgba(250,204,21,0.18)] hover:from-yellow-300 hover:to-orange-400">
          {user ? "Gerenciar Plano" : "Criar Conta"}
        </Link>
      </div>
    </header>
  );
}

export function PremiumPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030405] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.13),transparent_26%),radial-gradient(circle_at_top_right,rgba(239,68,68,0.10),transparent_30%),linear-gradient(180deg,#030405_0%,#080a0f_48%,#020202_100%)]" />
      <div className="fixed inset-0 bg-[url('/stadium-bg.png')] bg-cover bg-center opacity-10" />
      <div className="fixed inset-0 bg-black/55" />
      <div className="relative z-10 mx-auto max-w-[1740px] px-5 pb-4 lg:px-10">
        <WorldCupTicker />
        <div className="pt-4">{children}</div>
      </div>
    </main>
  );
}

type MenuLink = { href: string; label: string; icon: any; badge?: string };
type MenuSection = { title?: string; items: MenuLink[] };

const userMenuSections: MenuSection[] = [
  {
    title: "Especial",
    items: [
      { href: "/world-cup", label: "Copa do Mundo 2026", icon: Globe2, badge: "NOVO" },
      { href: "/brasileirao", label: "Brasileirão Série A", icon: Trophy, badge: "2026" },
    ],
  },
  {
    title: "Dashboard",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: Home },
      { href: "/live", label: "Jogos ao vivo", icon: Activity },
      { href: "/dashboard#resumo", label: "Resumo das análises", icon: LineChart },
    ],
  },
  {
    title: "Jogos",
    items: [
      { href: "/upcoming?tab=today", label: "Jogos de Hoje", icon: CalendarDays },
      { href: "/upcoming", label: "Próximos Jogos", icon: CalendarDays },
      { href: "/live", label: "Ao Vivo", icon: Zap },
    ],
  },
  {
    title: "Análise IA",
    items: [
      { href: "/compare", label: "Comparar Times", icon: ListChecks },
      { href: "/analyze", label: "Índice Analyse Pro", icon: BarChart3 },
      { href: "/history", label: "Análises Salvas", icon: Star },
    ],
  },
  {
    title: "Relatórios",
    items: [
      { href: "/reports?type=free", label: "Básicos", icon: Target },
      { href: "/reports?type=premium", label: "Premium", icon: Trophy, badge: "PRO" },
    ],
  },
  {
    title: "Estatísticas",
    items: [
      { href: "/statistics?indicator=over15", label: "Média de gols", icon: BarChart3 },
      { href: "/statistics?indicator=btts", label: "Gols das equipas", icon: BarChart3 },
      { href: "/statistics?indicator=corners", label: "Escanteios", icon: BarChart3 },
      { href: "/statistics?indicator=favorites", label: "Favoritos", icon: Star },
    ],
  },
  {
    title: "Ranking",
    items: [
      { href: "/ranking?type=goals", label: "Top Média de gols", icon: Trophy },
      { href: "/ranking?type=both-scored", label: "Top Gols das equipas", icon: Trophy },
      { href: "/ranking?type=corners", label: "Top Escanteios", icon: Trophy },
      { href: "/ranking?type=quality", label: "Top Qualidade dos dados", icon: Trophy },
    ],
  },
  {
    items: [
      { href: "/favorites", label: "Favoritos", icon: Star },
      { href: "/favorite-teams", label: "Meus Times", icon: Star },
      { href: "/history", label: "Histórico", icon: ListChecks },
    ],
  },
  {
    title: "Área do assinante",
    items: [
      { href: "/account", label: "Meu Plano", icon: Wallet },
      { href: "/account", label: "Assinatura", icon: Wallet },
      { href: "/account", label: "Pagamentos", icon: Wallet },
      { href: "/payments", label: "Renovação", icon: Wallet },
      { href: "/settings", label: "Configurações", icon: Settings },
      { href: "/support", label: "Suporte", icon: Headphones },
    ],
  },
];

const adminMenu: MenuLink[] = [
  { href: "/admin/users", label: "Usuários", icon: Shield },
  { href: "/admin/payments", label: "Assinaturas", icon: Wallet },
  { href: "/admin/chat", label: "Mensagens", icon: MessageCircle },
  { href: "/admin/sessions", label: "Sessões", icon: MonitorSmartphone },
  { href: "/admin/logs", label: "Logs", icon: ListChecks },
  { href: "/admin/api-status", label: "API Status", icon: Activity },
  { href: "/admin/system", label: "Sistema", icon: Settings },
];

export function PremiumAppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const [location] = useLocation();
  const user = getCurrentUser();
  const admin = isAdminUser(user);

  return (
    <PremiumPage>
      <MobileAppHeader />
      <div className={`grid min-h-[calc(100vh-40px)] gap-4 pb-24 lg:pb-0 ${right ? "xl:grid-cols-[260px_1fr_360px]" : "xl:grid-cols-[260px_1fr]"}`}>
        <aside className="hidden rounded-xl border border-white/10 bg-[#07090d]/90 p-4 shadow-2xl lg:block">
          <Brand compact />
          <nav className="mt-7 max-h-[calc(100vh-190px)] space-y-5 overflow-y-auto pr-1">
            {userMenuSections.map((section, sectionIndex) => (
              <div key={section.title || `section-${sectionIndex}`}>
                {section.title ? (
                  <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    <ChevronDown className="h-3 w-3" />
                    {section.title}
                  </div>
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const itemPath = item.href.split("?")[0].split("#")[0];
                    const active = location === itemPath || (itemPath === "/dashboard" && location === "/");
                    return (
                      <Link key={`${section.title}-${item.label}`} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition ${active ? "bg-yellow-400/12 text-yellow-400" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}>
                        <Icon className="h-4 w-4" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-black text-black">{item.badge}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {admin ? (
              <div>
                <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-yellow-400">
                  <Shield className="h-3 w-3" /> Área Admin
                </div>
                <div className="space-y-1 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.04] p-2">
                  {adminMenu.map((item) => {
                    const Icon = item.icon;
                    const active = location === item.href;
                    return (
                      <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active ? "bg-yellow-400/15 text-yellow-300" : "text-yellow-100/80 hover:bg-yellow-400/10 hover:text-yellow-300"}`}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </nav>
          <button onClick={() => logoutLocalUser().then(() => (window.location.href = "/"))} className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </aside>

        <section className="compact-dashboard min-w-0">{children}</section>
        {right ? <aside className="hidden xl:block">{right}</aside> : null}
      </div>
      <MobileBottomNav />
    </PremiumPage>
  );
}


const mobileTopLinks: MenuLink[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/live", label: "Ao Vivo", icon: Zap },
  { href: "/analyze", label: "Análises", icon: BarChart3 },
  { href: "/world-cup", label: "Copa", icon: Globe2 },
  { href: "/brasileirao", label: "Brasileirão", icon: Trophy },
  { href: "/plans", label: "Assinatura", icon: Wallet },
  { href: "/account", label: "Conta", icon: UserRound },
];

const mobileBottomLinks: MenuLink[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/live", label: "Jogos", icon: Activity },
  { href: "/analyze", label: "Análises", icon: BarChart3 },
  { href: "/account", label: "Conta", icon: UserRound },
];

function MobileAppHeader() {
  const [location] = useLocation();
  const user = getCurrentUser();
  const planLabel = user?.role === "admin" ? "ADMIN" : user?.plan || "FREE";

  const handleLogout = () => {
    logoutLocalUser();
    window.dispatchEvent(new Event("tap-auth-changed"));
    window.location.href = "/login";
  };

  return (
    <div className="lg:hidden">
      <header className="mobile-app-header sticky top-0 z-50 -mx-5 mb-2 border-b border-white/10 bg-[#030405]/95 px-3 pb-2 pt-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <Brand compact />
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-yellow-400/35 bg-yellow-400/10 px-2 py-1 text-[10px] font-black text-yellow-300">
              {planLabel}
            </span>
            <Link href="/live" className="relative rounded-full p-2 text-slate-200 hover:bg-white/10" title="Alertas ao vivo">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400" />
            </Link>
            <Link href={user ? "/account" : "/login"} className="rounded-full border border-yellow-400/35 p-2 text-yellow-300 hover:bg-yellow-400/10" title="Conta">
              <UserRound className="h-4 w-4" />
            </Link>
            {user ? (
              <button onClick={handleLogout} className="rounded-full border border-red-400/35 p-2 text-red-300 hover:bg-red-500/10" title="Sair da conta" aria-label="Sair da conta">
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold text-slate-300 scrollbar-hide">
          <span className="shrink-0 rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-red-300">⚽ Alerta gol</span>
          <span className="shrink-0 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-yellow-300">🚩 Escanteios</span>
          <span className="shrink-0 rounded-full border border-blue-400/25 bg-blue-400/10 px-2.5 py-1 text-blue-300">✅ Ambas marcam</span>
          <span className="shrink-0 rounded-full border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-orange-300">🟨 Cartões</span>
        </div>

        <nav className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto pb-1">
          {mobileTopLinks.map((item) => {
            const Icon = item.icon;
            const itemPath = item.href.split("?")[0].split("#")[0];
            const active = location === itemPath || (itemPath === "/dashboard" && location === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-w-[74px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-center text-[10px] font-black transition ${
                  active
                    ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.11)]"
                    : "border-white/10 bg-[#090d13]/90 text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="leading-tight">{item.label}</span>
                {item.badge ? <span className="absolute -right-1 -top-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[8px] font-black text-white">{item.badge}</span> : null}
                {active ? <span className="absolute -bottom-1 h-0.5 w-8 rounded-full bg-yellow-400" /> : null}
              </Link>
            );
          })}
        </nav>
      </header>
    </div>
  );
}

function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#030405]/94 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileBottomLinks.map((item) => {
          const Icon = item.icon;
          const itemPath = item.href.split("?")[0].split("#")[0];
          const active = location === itemPath || (itemPath === "/dashboard" && location === "/");
          return (
            <Link key={item.href} href={item.href} className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold ${active ? "text-yellow-400" : "text-slate-400"}`}>
              {active ? <span className="absolute -top-2 h-1 w-9 rounded-full bg-yellow-400" /> : null}
              <Icon className="h-6 w-6" />
              <span>{item.label}</span>
              {item.badge ? <span className="absolute right-4 top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{item.badge}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/10 bg-[#07090d]/90 shadow-xl backdrop-blur ${className}`}>{children}</div>;
}

export function PremiumChatCard() {
  const messages = [
    ["Thiago86 👑", "Boa demais! +2u aqui 🔥", "14:23"],
    ["Gabriel", "Boa intensidade ofensiva neste jogo.", "14:23"],
    ["Admin ANALYSE", "Foco e disciplina, galera! 📈", "14:24"],
    ["Lucas", "Os dados ao vivo estão bem completos hoje.", "14:24"],
    ["Matheus", "Análise do segundo jogo top!", "14:25"],
  ];
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <h3 className="text-lg font-black">Chat por Partida</h3>
        <span className="text-xs font-bold text-green-400">• 128 online</span>
      </div>
      <div className="space-y-4 p-5">
        {messages.map(([name, text, time], index) => {
          const adminMsg = name.includes("Admin");
          return (
          <div key={`${name}-${index}`} className="flex gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${adminMsg ? "border border-yellow-400/30 bg-black p-2" : "bg-gradient-to-br from-yellow-400 to-red-500 text-sm font-black text-black"}`}>
              {adminMsg ? <LogoMark small /> : index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex text-sm">
                <span className={`${adminMsg ? "text-yellow-400" : "text-white"} font-black`}>{name}</span>
                {adminMsg ? <span className="ml-2 rounded bg-yellow-400 px-1.5 text-[10px] font-black text-black">ADMIN</span> : null}
                <span className="ml-auto text-xs text-slate-500">{time}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{text}</p>
            </div>
          </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-5">
        <div className="flex items-center rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-slate-500">
          Digite sua mensagem...
          <span className="ml-auto text-yellow-400">➤</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function MiniStat({ label, value, icon, tone = "yellow" }: { label: string; value: string; icon: ReactNode; tone?: "green" | "yellow" | "blue" | "orange" | "red" }) {
  const tones = {
    green: "bg-green-500/15 text-green-400",
    yellow: "bg-yellow-400/15 text-yellow-400",
    blue: "bg-blue-500/15 text-blue-400",
    orange: "bg-orange-500/15 text-orange-400",
    red: "bg-red-500/15 text-red-400",
  };
  return (
    <GlassCard className="p-4">
      <div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </GlassCard>
  );
}
