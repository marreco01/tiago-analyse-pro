import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Film,
  Newspaper,
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
  Sun,
  Moon,
  Target,
  Flag,
  ShieldAlert,
  Goal,
  Trophy,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { getCurrentUser, isAdminUser, logoutLocalUser } from "@/lib/localAuth";
import { useTheme } from "@/contexts/ThemeContext";

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
      <div className={compact ? "text-[12px] font-black leading-none sm:text-sm" : "text-2xl font-black md:text-3xl"}>
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
    { group: "Grupo A", teams: [{ code: "mx", name: "México" }, { code: "za", name: "África do Sul" }, { code: "kr", name: "Coreia do Sul" }, { code: "cz", name: "Chéquia" }] },
    { group: "Grupo B", teams: [{ code: "ca", name: "Canadá" }, { code: "ba", name: "Bósnia e Herzegovina" }, { code: "qa", name: "Catar" }, { code: "ch", name: "Suíça" }] },
    { group: "Grupo C", teams: [{ code: "br", name: "Brasil" }, { code: "ma", name: "Marrocos" }, { code: "ht", name: "Haiti" }, { code: "gb-sct", name: "Escócia" }] },
    { group: "Grupo D", teams: [{ code: "us", name: "Estados Unidos" }, { code: "py", name: "Paraguai" }, { code: "au", name: "Austrália" }, { code: "tr", name: "Turquia" }] },
    { group: "Grupo E", teams: [{ code: "de", name: "Alemanha" }, { code: "cw", name: "Curaçao" }, { code: "ci", name: "Costa do Marfim" }, { code: "ec", name: "Equador" }] },
    { group: "Grupo F", teams: [{ code: "nl", name: "Países Baixos" }, { code: "jp", name: "Japão" }, { code: "se", name: "Suécia" }, { code: "tn", name: "Tunísia" }] },
    { group: "Grupo G", teams: [{ code: "be", name: "Bélgica" }, { code: "eg", name: "Egito" }, { code: "ir", name: "Irã" }, { code: "nz", name: "Nova Zelândia" }] },
    { group: "Grupo H", teams: [{ code: "es", name: "Espanha" }, { code: "cv", name: "Cabo Verde" }, { code: "sa", name: "Arábia Saudita" }, { code: "uy", name: "Uruguai" }] },
    { group: "Grupo I", teams: [{ code: "fr", name: "França" }, { code: "sn", name: "Senegal" }, { code: "iq", name: "Iraque" }, { code: "no", name: "Noruega" }] },
    { group: "Grupo J", teams: [{ code: "ar", name: "Argentina" }, { code: "dz", name: "Argélia" }, { code: "at", name: "Áustria" }, { code: "jo", name: "Jordânia" }] },
    { group: "Grupo K", teams: [{ code: "pt", name: "Portugal" }, { code: "cd", name: "RD Congo" }, { code: "uz", name: "Uzbequistão" }, { code: "co", name: "Colômbia" }] },
    { group: "Grupo L", teams: [{ code: "gb-eng", name: "Inglaterra" }, { code: "hr", name: "Croácia" }, { code: "gh", name: "Gana" }, { code: "pa", name: "Panamá" }] },
  ];

  const tickerGroups = (
    <>
      {groups.map((item) => (
        <Link key={item.group} href="/world-cup" className="flex items-center gap-3 px-5 text-white hover:text-yellow-300">
          <span className="rounded-md bg-yellow-400/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-yellow-300">{item.group}</span>
          <span className="flex items-center gap-2 leading-none tracking-normal">
            {item.teams.map((team) => (
              <span
                key={`${item.group}-${team.name}`}
                title={team.name}
                aria-label={team.name}
                className="inline-flex h-[28px] w-[46px] items-center justify-center overflow-hidden rounded-[6px] border border-white/25 bg-black/30 shadow-[0_0_8px_rgba(0,0,0,0.35)]"
              >
                {team.code === "playoff" ? (
                  <span className="text-xl leading-none text-pink-400">?</span>
                ) : (
                  <img
                    src={`https://flagcdn.com/w80/${team.code}.png`}
                    alt={team.name}
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                )}
              </span>
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
      <div className="relative z-10 mx-auto max-w-[1480px] px-2.5 pb-3 lg:px-4">
        <WorldCupTicker />
        <div className="pt-4">{children}</div>
      </div>
    </main>
  );
}

type MenuLink = {
  href: string;
  label: string;
  icon?: any;
  badge?: string;
  badgeTone?: "green" | "gold" | "blue" | "purple" | "red" | "orange";
  flag?: string;
  flagCode?: string;
  trophyTone?: "gold" | "purple" | "blue";
};
type MenuSection = { title?: string; items: MenuLink[] };

const userMenuSections: MenuSection[] = [
  {
    title: "Competições",
    items: [
      { href: "/live", label: "Hoje + 48h", icon: Zap },
      { href: "/world-cup", label: "Copa do Mundo 2026", icon: Trophy },
      { href: "/brasileirao", label: "Brasileirão Série A", flagCode: "br" },
      { href: "/brasileirao-serie-b", label: "Brasileirão Série B", flagCode: "br" },
      { href: "/ligas/libertadores", label: "Libertadores", icon: Trophy },
      { href: "/ligas/sul-americana", label: "Copa Sul-Americana", icon: Trophy },
      { href: "/ligas/la-liga", label: "La Liga", flagCode: "es" },
      { href: "/ligas/premier-league", label: "Premier League", flagCode: "gb" },
      { href: "/ligas/serie-a-italia", label: "Serie A Itália", flagCode: "it" },
      { href: "/ligas/bundesliga", label: "Bundesliga", flagCode: "de" },
      { href: "/ligas/ligue-1", label: "Ligue 1", flagCode: "fr" },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { href: "/dashboard", label: "Painel Geral", icon: Home },
      { href: "/entries-ai", label: "Entradas IA", icon: Bot },
      { href: "/live", label: "Jogos ao Vivo", icon: Activity },
      { href: "/analyze", label: "Análises IA", icon: BarChart3 },
      { href: "/statistics", label: "Estatísticas", icon: LineChart },
      { href: "/noticias", label: "Notícias", icon: Newspaper },
      { href: "/favorites", label: "Favoritos", icon: Star },
      { href: "/account", label: "Minha Conta", icon: UserRound },
    ],
  },
];

const adminMenu: MenuLink[] = [
  { href: "/admin/instagram", label: "Instagram", icon: Film },
  { href: "/admin/users", label: "Usuários", icon: Shield },
  { href: "/admin/payments", label: "Assinaturas", icon: Wallet },
  { href: "/admin/chat", label: "Mensagens", icon: MessageCircle },
  { href: "/admin/sessions", label: "Sessões", icon: MonitorSmartphone },
  { href: "/admin/logs", label: "Logs", icon: ListChecks },
  { href: "/admin/api-status", label: "API Status", icon: Activity },
  { href: "/admin/system", label: "Sistema", icon: Settings },
];


function badgeToneClass(tone?: MenuLink["badgeTone"]) {
  switch (tone) {
    case "green": return "border-emerald-400/30 bg-emerald-500/15 text-emerald-300";
    case "blue": return "border-blue-400/30 bg-blue-500/15 text-blue-300";
    case "purple": return "border-purple-400/30 bg-purple-500/15 text-purple-300";
    case "red": return "border-red-400/30 bg-red-500/15 text-red-300";
    case "orange": return "border-orange-400/30 bg-orange-500/15 text-orange-300";
    case "gold":
    default: return "border-yellow-400/35 bg-yellow-400/15 text-yellow-300";
  }
}

function trophyToneClass(tone?: MenuLink["trophyTone"], active = false) {
  if (active) return "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]";
  switch (tone) {
    case "purple": return "text-purple-300 drop-shadow-[0_0_7px_rgba(168,85,247,0.36)]";
    case "blue": return "text-blue-300 drop-shadow-[0_0_7px_rgba(59,130,246,0.34)]";
    case "gold":
    default: return "text-yellow-300 drop-shadow-[0_0_7px_rgba(250,204,21,0.36)]";
  }
}

function MenuItemIcon({ item, Icon, active }: { item: MenuLink; Icon?: any; active: boolean }) {
  if (item.flagCode) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-white/10 bg-black/30 shadow-[0_0_8px_rgba(0,0,0,0.35)]">
        <img
          src={`https://flagcdn.com/w40/${item.flagCode}.png`}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  if (item.flag) {
    return <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[14px] leading-none">{item.flag}</span>;
  }

  if (Icon) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon className={`h-3.5 w-3.5 ${item.icon === Trophy ? trophyToneClass(item.trophyTone, active) : menuIconClass(active)}`} />
      </span>
    );
  }

  return <span className="h-5 w-5 shrink-0" />;
}

function menuIconClass(active: boolean) {
  return active ? "text-white" : "text-slate-300";
}
export function PremiumAppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const [location] = useLocation();
  const user = getCurrentUser();
  const admin = isAdminUser(user);
  const { theme, toggleTheme } = useTheme();

  return (
    <PremiumPage>
      <MobileAppHeader />
      <div className={`grid min-h-[calc(100vh-40px)] gap-3 pb-16 lg:gap-3 lg:pb-0 ${right ? "xl:grid-cols-[285px_1fr_300px]" : "xl:grid-cols-[285px_1fr]"}`}>
        <aside className="hidden rounded-xl border border-white/10 bg-[#05080d]/95 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:block">
          <div className="flex items-center border-b border-white/10 pb-3">
            <Brand compact />
          </div>
          <nav className="mt-3 max-h-[calc(100vh-158px)] space-y-5 overflow-y-auto pr-1 scrollbar-hide">
            {userMenuSections.map((section, sectionIndex) => (
              <div key={section.title || `section-${sectionIndex}`}>
                {section.title ? (
                  <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                    {section.title}
                  </div>
                ) : null}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const itemPath = item.href.split("?")[0].split("#")[0];
                    const active = location === itemPath || (itemPath === "/dashboard" && location === "/");
                    return (
                      <Link
                        key={`${section.title}-${item.label}`}
                        href={item.href}
                        className={`group flex min-h-[34px] items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-black transition ${
                          active
                            ? "bg-emerald-500/16 text-white shadow-[inset_3px_0_0_rgba(16,185,129,0.95),0_0_22px_rgba(16,185,129,0.10)]"
                            : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <MenuItemIcon item={item} Icon={Icon} active={active} />
                        <span className="min-w-0 flex-1 leading-none">{item.label}</span>
                        {item.badge ? (
                          <span className={`ml-1 shrink-0 rounded border px-1.5 py-0.5 text-[8.5px] font-black leading-none ${badgeToneClass(item.badgeTone)}`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {admin ? (
              <div>
                <div className="mb-1.5 flex items-center gap-2 px-2.5 text-[10px] font-black uppercase tracking-[0.20em] text-yellow-400">
                  <Shield className="h-3 w-3" /> Área Admin
                </div>
                <div className="space-y-1 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.04] p-2">
                  {adminMenu.map((item) => {
                    const Icon = item.icon;
                    const active = location === item.href;
                    return (
                      <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-[12px] font-bold transition ${active ? "bg-yellow-400/15 text-yellow-300" : "text-yellow-100/80 hover:bg-yellow-400/10 hover:text-yellow-300"}`}>
                        <Icon className="h-3 w-3" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </nav>

          <button onClick={toggleTheme} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-black text-slate-300 hover:border-white/30 hover:text-white hover:bg-white/10 transition">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Tela clara" : "Tela escura"}
          </button>
          <button onClick={() => logoutLocalUser().then(() => (window.location.href = "/"))} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition">
            <LogOut className="h-3 w-3" /> Sair
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
  { href: "/entries-ai", label: "Entradas IA", icon: Target },
  { href: "/world-cup", label: "Copa 2026", icon: Globe2 },
  { href: "/brasileirao", label: "Brasileirão Série A", icon: Trophy },
  { href: "/brasileirao-serie-b", label: "Brasileirão Série B", icon: Trophy },
  { href: "/noticias", label: "Notícias", icon: Newspaper },
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
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logoutLocalUser();
    window.dispatchEvent(new Event("tap-auth-changed"));
    window.location.href = "/login";
  };

  return (
    <div className="lg:hidden">
      <header className="mobile-app-header sticky top-0 z-50 -mx-5 mb-1 border-b border-white/10 bg-[#030405]/95 px-2.5 pb-1.5 pt-2 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1.5">
          <Brand compact />
          <div className="flex items-center gap-1">
            <span className="rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-black text-slate-300">
              {planLabel}
            </span>

            <button onClick={toggleTheme} className="rounded-full border border-white/15 p-1.5 text-slate-200 hover:bg-white/10" title={theme === "dark" ? "Ativar tela clara" : "Ativar tela escura"} aria-label={theme === "dark" ? "Ativar tela clara" : "Ativar tela escura"}>
              {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            </button>
            <Link href="/live" className="relative rounded-full p-1.5 text-slate-200 hover:bg-white/10" title="Alertas ao vivo">
              <Bell className="h-3 w-3" />
            </Link>
            <Link href={user ? "/account" : "/login"} className="rounded-full border border-white/20 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition" title="Conta">
              <UserRound className="h-3 w-3" />
            </Link>
            {user ? (
              <button onClick={handleLogout} className="rounded-full border border-white/20 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition" title="Sair da conta" aria-label="Sair da conta">
                <LogOut className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 text-[9px] font-bold text-slate-400 scrollbar-hide">
          <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5">⚽ Alerta gol</span>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5">🚩 Escanteios</span>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5">✅ Ambas marcam</span>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5">🟨 Cartões</span>
        </div>

        <nav className="scrollbar-hide mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {mobileTopLinks.map((item) => {
            const Icon = item.icon;
            const itemPath = item.href.split("?")[0].split("#")[0];
            const active = location === itemPath || (itemPath === "/dashboard" && location === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-w-[58px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1 text-center text-[8.5px] font-black transition ${
                  active
                    ? "border-white/30 bg-white/[0.08] text-white shadow-[0_0_16px_rgba(255,255,255,0.08)]"
                    : "border-white/10 bg-[#090d13]/90 text-slate-400"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="leading-tight">{item.label}</span>
                {item.badge ? <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-black text-black">{item.badge}</span> : null}
                {active ? <span className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-white" /> : null}
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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#030405]/94 px-2 pb-[calc(env(safe-area-inset-bottom)+5px)] pt-1.5 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-4 gap-1">
        {mobileBottomLinks.map((item) => {
          const Icon = item.icon;
          const itemPath = item.href.split("?")[0].split("#")[0];
          const active = location === itemPath || (itemPath === "/dashboard" && location === "/");
          return (
            <Link key={item.href} href={item.href} className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[9px] font-bold ${active ? "text-white" : "text-slate-500"}`}>
              {active ? <span className="absolute -top-1.5 h-0.5 w-7 rounded-full bg-white" /> : null}
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge ? <span className="absolute right-4 top-1 rounded-full bg-white px-1.5 text-[10px] text-black font-bold">{item.badge}</span> : null}
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
