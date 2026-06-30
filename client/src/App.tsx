import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LiveChat from "./components/LiveChat";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Compare from "./pages/Compare";
import News from "./pages/News";
import Tips from "./pages/Tips";
import Statistics from "./pages/Statistics";
import Upcoming from "./pages/Upcoming";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Favorites from "./pages/Favorites";
import Plans from "./pages/Plans";
import Payments from "./pages/Payments";
import PaymentResult from "./pages/PaymentResult";
import AdminChat from "./pages/AdminChat";
import AdminPayments from "./pages/AdminPayments";
import Ranking from "./pages/Ranking";
import LiveGames from "./pages/LiveGames";
import SavedAnalyses from "./pages/SavedAnalyses";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import AdminLogs from "./pages/AdminLogs";
import AdminApiStatus from "./pages/AdminApiStatus";
import AdminSystem from "./pages/AdminSystem";
import AdminSessions from "./pages/AdminSessions";
import Account from "./pages/Account";
import FavoriteTeams from "./pages/FavoriteTeams";
import WorldCup from "./pages/WorldCup";
import Brasileirao from "./pages/Brasileirao";
import MatchCenter from "./pages/MatchCenter";
import ChatPro from "./pages/ChatPro";
import MobileMenu from "./pages/MobileMenu";
import { authHeaders, getAuthToken, getCurrentUser, logoutLocalUser, type LocalUser } from "./lib/localAuth";

function useCurrentUserState() {
  const [user, setUser] = useState<LocalUser | null>(() => getCurrentUser());

  useEffect(() => {
    const updateUser = () => setUser(getCurrentUser());
    window.addEventListener("tap-auth-changed", updateUser);
    window.addEventListener("storage", updateUser);
    return () => {
      window.removeEventListener("tap-auth-changed", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  return user;
}

function useClickTracker() {
  useEffect(() => {
    let lastSent = 0;

    const shouldIgnoreTracking = () => {
      const user = getCurrentUser();
      const path = window.location.pathname + window.location.search;

      // O administrador nunca entra na contagem, em nenhuma área do site.
      if (user?.role === "admin") return true;

      // Rotas internas não podem gerar clique falso.
      if (path.startsWith("/admin") || path.startsWith("/api")) return true;
      if (path.includes("favicon") || path.includes("/assets/") || path.includes("/static/")) return true;

      return false;
    };

    const onClick = (event: MouseEvent) => {
      if (shouldIgnoreTracking()) return;

      const path = window.location.pathname + window.location.search;
      const now = Date.now();
      if (now - lastSent < 1000) return;
      lastSent = now;

      const target = event.target instanceof Element ? event.target.closest("button,a,[role='button'],input,select,textarea") : null;
      const label = target?.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || target?.getAttribute("aria-label") || target?.getAttribute("href") || "clique";
      const params = new URLSearchParams(window.location.search);

      fetch("/api/analytics/click", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          path,
          label,
          referrer: document.referrer || "",
          utmSource: params.get("utm_source") || "",
          utmMedium: params.get("utm_medium") || "",
          utmCampaign: params.get("utm_campaign") || "",
        }),
        keepalive: true,
      }).catch(() => {});
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}


function useSingleSessionGuard() {
  useEffect(() => {
    let running = false;
    const checkSession = async () => {
      const token = getAuthToken();
      const user = getCurrentUser();
      if (!token || !user || user.role === "admin" || running) return;
      running = true;
      try {
        const response = await fetch("/api/auth/me", { headers: authHeaders(), cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || !data?.user) {
          await logoutLocalUser();
          window.alert("Sua conta foi acessada em outro dispositivo. Esta sessão foi encerrada automaticamente.");
          window.location.href = "/login";
        }
      } catch {
        // Se a internet falhar, não derruba o usuário à toa.
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(checkSession, 60000);
    window.addEventListener("focus", checkSession);
    checkSession();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkSession);
    };
  }, []);
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#02060d] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-500/30 bg-red-950/20 p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-black">Acesso restrito</h1>
        <p className="mt-3 text-slate-300">
          Esta área é exclusiva do administrador do ANALYSE PRO 2.0.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-yellow-400 px-6 py-3 font-black text-black hover:bg-yellow-300">
            Entrar como admin
          </Link>
          <Link href="/" className="rounded-xl border border-white/15 px-6 py-3 font-black text-white hover:bg-white/10">
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminRoute({ component: Component }: { component: any }) {
  const user = useCurrentUserState();

  if (!user || user.role !== "admin") {
    return <AccessDenied />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/live" component={LiveGames} />
      <Route path="/ranking" component={Ranking} />
      <Route path="/saved-analyses" component={SavedAnalyses} />
      <Route path="/support" component={Support} />
      <Route path="/settings" component={Settings} />
      <Route path="/reports" component={Tips} />
      <Route path="/tips" component={Tips} />
      <Route path="/upcoming" component={Upcoming} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/history" component={History} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/plans" component={Plans} />
      <Route path="/account" component={Account} />
      <Route path="/favorite-teams" component={FavoriteTeams} />
      <Route path="/world-cup" component={WorldCup} />
      <Route path="/brasileirao" component={Brasileirao} />
      <Route path="/match-center" component={MatchCenter} />
      <Route path="/chat" component={ChatPro} />
      <Route path="/mobile-menu" component={MobileMenu} />
      <Route path="/payments" component={Payments} />
      <Route path="/payment-result" component={PaymentResult} />
      <Route path="/admin/chat">{() => <AdminRoute component={AdminChat} />}</Route>
      <Route path="/admin/payments">{() => <AdminRoute component={AdminPayments} />}</Route>
      <Route path="/admin/users">{() => <AdminRoute component={AdminUsers} />}</Route>
      <Route path="/admin/sessions">{() => <AdminRoute component={AdminSessions} />}</Route>
      <Route path="/admin/logs">{() => <AdminRoute component={AdminLogs} />}</Route>
      <Route path="/admin/api-status">{() => <AdminRoute component={AdminApiStatus} />}</Route>
      <Route path="/admin/system">{() => <AdminRoute component={AdminSystem} />}</Route>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/compare" component={Compare} />
      <Route path="/news" component={News} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ChatGate() {
  const [location] = useLocation();

  // O LiveChat precisa ficar montado nas páginas de jogo mesmo sem usuário logado,
  // porque é ele que escuta o evento "tap-open-live-chat" disparado pelos botões
  // "Sala ao vivo". Antes, quando não havia usuário carregado, o componente nem
  // montava e o clique no botão não abria nada.
  const hiddenPrefixes = ["/admin", "/login", "/register", "/forgot-password", "/reset-password"];
  const hiddenExact: string[] = [];

  if (hiddenExact.includes(location) || hiddenPrefixes.some((prefix) => location.startsWith(prefix))) {
    return null;
  }

  return <LiveChat />;
}

function App() {
  useClickTracker();
  useSingleSessionGuard();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={false}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <ChatGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
