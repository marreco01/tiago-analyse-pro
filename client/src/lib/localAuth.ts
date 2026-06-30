export type LocalUser = {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  plan: "Grátis" | "PRO" | "VIP" | "FREE";
  membership?: "FREE" | "PRO" | "VIP" | "SOCIO_VIP";
  role?: "user" | "admin";
  status?: "active" | "blocked";
  planExpiresAt?: string;
};

export type SavedAnalysis = {
  id: string;
  teamA: string;
  teamB: string;
  createdAt: string;
  sourceMode?: string;
  confidence?: number;
  summary?: string;
  isFavorite?: boolean;
};

const USER_KEY = "tap_user";
const TOKEN_KEY = "tap_token";
const ANALYSES_KEY = "tap_saved_analyses";

function currentUserStorageSuffix() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? JSON.parse(raw) as LocalUser : null;
    return (user?.id || user?.email || "guest").toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  } catch {
    return "guest";
  }
}

function analysesKey() {
  return `${ANALYSES_KEY}:${currentUserStorageSuffix()}`;
}

function mapUser(user: any): LocalUser {
  return {
    id: user?.id,
    name: user?.name || "Usuário",
    email: user?.email || "",
    avatar: user?.avatar || "",
    plan: user?.plan === "FREE" ? "Grátis" : user?.plan || "Grátis",
    membership: user?.membership || user?.plan || "FREE",
    role: user?.role || "user",
    status: user?.status || "active",
    planExpiresAt: user?.planExpiresAt,
  };
}

export function getAuthToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getCurrentUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

function saveSession(user: any, token?: string) {
  const mapped = mapUser(user);
  localStorage.setItem(USER_KEY, JSON.stringify(mapped));
  if (token) localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("tap-auth-changed"));
  return mapped;
}

export async function loginUser(email: string, password: string): Promise<LocalUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
  return saveSession(data.user, data.token);
}

export async function registerUser(name: string, email: string, password: string, avatar?: string): Promise<LocalUser> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, avatar }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar.");
  return saveSession(data.user, data.token);
}

export async function refreshCurrentUser(): Promise<LocalUser | null> {
  const response = await fetch("/api/auth/me", { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (data.user) return saveSession(data.user);
  return getCurrentUser();
}

export async function forgotPassword(email: string) {
  const response = await fetch("/api/auth/forgot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function resetPassword(token: string, password: string) {
  const response = await fetch("/api/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  return response.json();
}

export function loginLocalUser(email: string): LocalUser {
  const name = email.split("@")[0] || "Tiago";
  const user: LocalUser = { name, email, plan: "Grátis" };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("tap-auth-changed"));
  return user;
}

export function registerLocalUser(name: string, email: string): LocalUser {
  const user: LocalUser = { name: name || "Usuário", email, plan: "Grátis" };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("tap-auth-changed"));
  return user;
}

export async function logoutLocalUser() {
  try { await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }); } catch {}
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("tap-auth-changed"));
}

export function getSavedAnalyses(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(analysesKey());
    return raw ? (JSON.parse(raw) as SavedAnalysis[]) : [];
  } catch {
    return [];
  }
}

export function favoriteLimitForUser(user: LocalUser | null = getCurrentUser()) {
  if (user?.role === "admin" || user?.plan === "VIP" || user?.membership === "SOCIO_VIP") return null;
  if (user?.plan === "PRO") return 50;
  return 5;
}

export function getFavoriteAnalyses() {
  return getSavedAnalyses().filter(item => item.isFavorite);
}

export function getFavoriteUsage(user: LocalUser | null = getCurrentUser()) {
  const used = getFavoriteAnalyses().length;
  const limit = favoriteLimitForUser(user);
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
}

function historyLimitForUser(user: LocalUser | null = getCurrentUser()) {
  if (user?.role === "admin" || user?.plan === "VIP" || user?.membership === "SOCIO_VIP") return null;
  return user?.plan === "PRO" ? 300 : 50;
}

export function saveAnalysis(analysis: Omit<SavedAnalysis, "id" | "createdAt">): SavedAnalysis {
  const saved: SavedAnalysis = {
    ...analysis,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  const entries = [saved, ...getSavedAnalyses()];
  const limit = historyLimitForUser();
  const next = limit === null ? entries : entries.slice(0, limit);
  localStorage.setItem(analysesKey(), JSON.stringify(next));
  return saved;
}

export function toggleFavoriteWithLimit(id: string) {
  const items = getSavedAnalyses();
  const current = items.find(item => item.id === id);
  if (!current) throw new Error("Análise não encontrada.");
  if (!current.isFavorite) {
    const usage = getFavoriteUsage();
    if (usage.limit !== null && usage.used >= usage.limit) {
      throw new Error(`Limite de favoritos atingido (${usage.limit}). Faça upgrade para guardar mais análises.`);
    }
  }
  const next = items.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item);
  localStorage.setItem(analysesKey(), JSON.stringify(next));
  return { items: next, item: next.find(item => item.id === id)! };
}

export function toggleFavorite(id: string): SavedAnalysis[] {
  return toggleFavoriteWithLimit(id).items;
}

export function removeSavedAnalysis(id: string): SavedAnalysis[] {
  const next = getSavedAnalyses().filter(item => item.id !== id);
  localStorage.setItem(analysesKey(), JSON.stringify(next));
  return next;
}


export function isAdminUser(user?: LocalUser | null) {
  return Boolean(user && user.role === "admin");
}

export function hasChatAccess(user?: LocalUser | null) {
  // LIBERADO TEMPORARIAMENTE: o Chat PRO fica aberto para usuários FREE, PRO, VIP e admin.
  // Mantém apenas a necessidade de estar logado para evitar visitante anônimo.
  return Boolean(user);
}
