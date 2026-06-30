import fs from "fs";
import path from "path";
import { randomUUID, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export type PlanName = "FREE" | "PRO" | "VIP";
export type PaymentPlanName = Exclude<PlanName, "FREE"> | "SOCIO_VIP";
export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  avatar?: string;
  plan: PlanName;
  membership?: PaymentPlanName | "FREE";
  status: "active" | "blocked";
  role: "user" | "admin";
  createdAt: string;
  planExpiresAt?: string;
};
export type PublicUser = Omit<User, "passwordHash" | "passwordSalt">;
export type Session = { token: string; userId: string; createdAt: string; expiresAt: string; ip?: string; device?: string; browser?: string; lastActivity?: string };
export type ChatMessage = {
  id: string;
  user: string;
  userId?: string;
  avatar?: string;
  message: string;
  audioUrl?: string;
  audioMime?: string;
  createdAt: string;
  system?: boolean;
  replyTo?: { id: string; user: string; message: string };
  privateTo?: string;
  roomId?: string;
  roomType?: "match";
  roomLabel?: string;
  matchLabel?: string;
};
export type Favorite = { id: string; userId: string; teamA: string; teamB: string; createdAt: string; summary?: string };
export type FavoriteTeam = {
  id: string;
  userId: string;
  teamId: number;
  name: string;
  logo?: string;
  league?: string;
  createdAt: string;
};
export type AlertPreference = {
  userId: string;
  enabled: boolean;
  gameStart: boolean;
  halfTime: boolean;
  fullTime: boolean;
  updatedAt: string;
};
export type Subscription = {
  id: string;
  userId: string;
  plan: "PRO" | "VIP";
  amount: number;
  status: "pending" | "authorized" | "paused" | "cancelled";
  providerSubscriptionId?: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
};
export type Payment = {
  id: string;
  userId?: string;
  plan: PaymentPlanName;
  amount: number;
  status: "pending" | "approved" | "cancelled";
  provider: "mercado_pago" | "manual_pix";
  providerPaymentId?: string;
  providerPreferenceId?: string;
  providerStatus?: string;
  providerSubscriptionId?: string;
  billingMode?: "single" | "recurring";
  renewalOf?: string;
  paymentMethodId?: string;
  pixCode?: string;
  qrCodeBase64?: string;
  checkoutUrl?: string;
  receiptName?: string;
  receiptData?: string;
  receiptNote?: string;
  receiptSentAt?: string;
  createdAt: string;
  approvedAt?: string;
};
export type AuditEvent = { id: string; type: string; message: string; createdAt: string; meta?: Record<string, unknown> };
export type PasswordReset = { token: string; userId: string; createdAt: string; expiresAt: string; usedAt?: string };
export type ClickEvent = {
  id: string;
  ip: string;
  path: string;
  label?: string;
  userAgent?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  createdAt: string;
};

type DataStore = {
  users: User[];
  sessions: Session[];
  chatMessages: ChatMessage[];
  blockedUsers: string[];
  favorites: Favorite[];
  favoriteTeams: FavoriteTeam[];
  alertPreferences: AlertPreference[];
  subscriptions: Subscription[];
  payments: Payment[];
  audit: AuditEvent[];
  passwordResets: PasswordReset[];
  clicks: ClickEvent[];
  adminIps: string[];
  analyticsResets: Array<{ id: string; adminId?: string; adminEmail?: string; ip?: string; createdAt: string; note: string }>;
};

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
const dataFile = path.join(dataDir, "tiago-analyse-pro.json");
const MAX_CHAT_MESSAGES = 500;
const MAX_CLICK_EVENTS = 10000;

const initialData: DataStore = {
  users: [],
  sessions: [],
  chatMessages: [
    {
      id: "welcome",
      user: "Sistema",
      message: "Bem-vindo ao chat da comunidade!",
      createdAt: new Date().toISOString(),
      system: true,
    },
  ],
  blockedUsers: [],
  favorites: [],
  favoriteTeams: [],
  alertPreferences: [],
  subscriptions: [],
  payments: [],
  audit: [],
  passwordResets: [],
  clicks: [],
  adminIps: [],
  analyticsResets: [],
};

let store: DataStore = loadStore();

function loadStore(): DataStore {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) {
      const seeded = { ...structuredClone(initialData), users: seedAdmin([]) };
      fs.writeFileSync(dataFile, JSON.stringify(seeded, null, 2));
      return seeded;
    }
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8")) as Partial<DataStore>;
    return {
      users: seedAdmin((parsed.users || []).map((user: any) => ({ ...user, role: user.role || "user" }))),
      sessions: parsed.sessions || [],
      chatMessages: parsed.chatMessages?.length ? parsed.chatMessages : initialData.chatMessages,
      blockedUsers: parsed.blockedUsers || [],
      favorites: parsed.favorites || [],
      favoriteTeams: parsed.favoriteTeams || [],
      alertPreferences: parsed.alertPreferences || [],
      subscriptions: parsed.subscriptions || [],
      payments: parsed.payments || [],
      audit: parsed.audit || [],
      passwordResets: parsed.passwordResets || [],
      clicks: parsed.clicks || [],
      adminIps: parsed.adminIps || [],
      analyticsResets: parsed.analyticsResets || [],
    };
  } catch (error) {
    console.error("Falha ao carregar banco local:", error);
    return { ...structuredClone(initialData), users: seedAdmin([]) };
  }
}

export function saveStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

export function getStore() {
  return store;
}

function cleanOptional(value: unknown, limit: number) {
  const text = String(value || "").trim();
  return text ? text.slice(0, limit) : undefined;
}

export function normalizeIp(ip?: string) {
  return String(ip || "unknown").trim().replace("::ffff:", "").slice(0, 80) || "unknown";
}

export function rememberAdminIp(ip?: string) {
  const cleanIp = normalizeIp(ip);
  if (!cleanIp || cleanIp === "unknown") return;
  if (!store.adminIps.includes(cleanIp)) {
    store.adminIps.push(cleanIp);
    if (store.adminIps.length > 50) store.adminIps = store.adminIps.slice(-50);
    saveStore();
  }
}

export function isKnownAdminIp(ip?: string) {
  const cleanIp = normalizeIp(ip);
  return store.adminIps.includes(cleanIp);
}

export function resetAnalyticsCounters(admin?: { id?: string; email?: string } | null, ip?: string) {
  const reset = {
    id: randomUUID(),
    adminId: admin?.id,
    adminEmail: admin?.email,
    ip: normalizeIp(ip),
    createdAt: new Date().toISOString(),
    note: "Contador zerado pelo administrador",
  };
  store.clicks = [];
  store.analyticsResets = [reset, ...(store.analyticsResets || [])].slice(0, 50);
  saveStore();
  return reset;
}

export function getLastAnalyticsReset() {
  return (store.analyticsResets || [])[0] || null;
}

export function recordClick(input: {
  ip?: string;
  path?: string;
  label?: string;
  userAgent?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
}) {
  const ip = normalizeIp(input.ip);
  const pathValue = String(input.path || "/").trim().slice(0, 220) || "/";
  const now = Date.now();

  // Evita clique falso: mesmo IP + mesma página só conta 1 vez por minuto.
  const duplicated = [...store.clicks].reverse().find((click) => click.ip === ip && click.path === pathValue);
  if (duplicated && now - new Date(duplicated.createdAt).getTime() < 60_000) {
    return duplicated;
  }

  const click: ClickEvent = {
    id: randomUUID(),
    ip,
    path: pathValue,
    label: cleanOptional(input.label, 120),
    userAgent: cleanOptional(input.userAgent, 220),
    referrer: cleanOptional(input.referrer, 300),
    source: cleanOptional(input.source, 80),
    medium: cleanOptional(input.medium, 80),
    campaign: cleanOptional(input.campaign, 120),
    country: cleanOptional(input.country, 80),
    region: cleanOptional(input.region, 80),
    city: cleanOptional(input.city, 80),
    isp: cleanOptional(input.isp, 160),
    createdAt: new Date().toISOString(),
  };
  store.clicks.push(click);
  if (store.clicks.length > MAX_CLICK_EVENTS) store.clicks = store.clicks.slice(-MAX_CLICK_EVENTS);
  saveStore();
  return click;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function getAnalyticsStats() {
  const today = startOfToday();
  const users = store.users.filter((user) => user.role !== "admin");
  const clicksToday = store.clicks.filter((click) => new Date(click.createdAt).getTime() >= today);
  const usersToday = users.filter((user) => new Date(user.createdAt).getTime() >= today);
  const ipMap = new Map<string, { ip: string; clicks: number; lastPath: string; lastClickAt: string; city?: string; region?: string; country?: string; isp?: string; source?: string }>();
  const sourceMap = new Map<string, number>();

  for (const click of store.clicks) {
    const current = ipMap.get(click.ip);
    if (!current) {
      ipMap.set(click.ip, { ip: click.ip, clicks: 1, lastPath: click.path, lastClickAt: click.createdAt, city: click.city, region: click.region, country: click.country, isp: click.isp, source: click.source });
      continue;
    }
    current.clicks += 1;
    if (new Date(click.createdAt).getTime() >= new Date(current.lastClickAt).getTime()) {
      current.lastPath = click.path;
      current.lastClickAt = click.createdAt;
      current.city = click.city;
      current.region = click.region;
      current.country = click.country;
      current.isp = click.isp;
      current.source = click.source;
    }
  }

  for (const click of store.clicks) {
    const source = click.source || "Direto";
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  }

  return {
    totalClicks: store.clicks.length,
    clicksToday: clicksToday.length,
    uniqueIps: ipMap.size,
    signupsTotal: users.length,
    signupsToday: usersToday.length,
    lastClicks: [...store.clicks].reverse().slice(0, 25),
    topIps: Array.from(ipMap.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 50),
    sources: Array.from(sourceMap.entries()).map(([source, clicks]) => ({ source, clicks })).sort((a, b) => b.clicks - a.clicks),
    lastReset: getLastAnalyticsReset(),
  };
}

export function publicUser(user: User): PublicUser {
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}


function seedAdmin(users: User[]): User[] {
  const adminEmail = cleanEmail(process.env.ADMIN_EMAIL || "admin@tiagoanalysepro.com");
  const adminName = process.env.ADMIN_NAME || "TIAGO OLIVEIRA";
  const adminPassword = process.env.ADMIN_PASSWORD || "647538Ti#";
  const existing = users.find((user) => user.email === adminEmail || user.role === "admin");
  if (existing) {
    existing.role = "admin";
    existing.plan = "VIP";
    existing.membership = "VIP";
    existing.status = "active";
    return users;
  }
  const password = hashPassword(adminPassword);
  users.unshift({
    id: "admin-tiago",
    name: adminName,
    email: adminEmail,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    avatar: "",
    plan: "VIP",
    membership: "VIP",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString(),
  });
  return users;
}

export function isAdmin(user?: User | null) {
  return Boolean(user && user.role === "admin");
}

export function hasPremiumAccess(user?: User | null) {
  return Boolean(user && (user.role === "admin" || user.plan === "PRO" || user.plan === "VIP"));
}

function cleanEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const attempt = hashPassword(password, salt).hash;
  try {
    return timingSafeEqual(Buffer.from(attempt, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function findUserByEmail(email: string) {
  return store.users.find((user) => user.email === cleanEmail(email));
}

export function findUserById(id?: string) {
  return store.users.find((user) => user.id === id);
}

export function createUser(input: { name: string; email: string; password: string; avatar?: string }) {
  const email = cleanEmail(input.email);
  if (!email.includes("@")) throw new Error("Email inválido.");
  if (String(input.password || "").length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  if (findUserByEmail(email)) throw new Error("Este email já está cadastrado.");
  const password = hashPassword(input.password);
  const user: User = {
    id: randomUUID(),
    name: String(input.name || "Usuário").trim().slice(0, 40) || "Usuário",
    email,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    avatar: input.avatar || "",
    plan: "FREE",
    membership: "FREE",
    role: "user",
    status: "active",
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  addAudit("user.created", `Usuário criado: ${user.email}`, { userId: user.id });
  saveStore();
  return user;
}

export function createSession(userId: string, meta?: { ip?: string; device?: string; browser?: string }) {
  const token = randomUUID() + randomUUID().replace(/-/g, "");
  const user = findUserById(userId);
  const now = new Date().toISOString();
  const session: Session = {
    token,
    userId,
    createdAt: now,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    ip: meta?.ip || "",
    device: meta?.device || "",
    browser: meta?.browser || "",
    lastActivity: now,
  };
  store.sessions = store.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  if (user?.role !== "admin") {
    const removed = store.sessions.filter((item) => item.userId === userId).length;
    store.sessions = store.sessions.filter((item) => item.userId !== userId);
    if (removed > 0) addAudit("auth.session_replaced", "Sessão antiga encerrada por novo acesso.", { userId, ip: meta?.ip, device: meta?.device, browser: meta?.browser });
  }
  store.sessions.push(session);
  saveStore();
  return session;
}

export function getUserByToken(token?: string) {
  resetExpiredPlans();
  if (!token) return null;
  const session = store.sessions.find((item) => item.token === token && new Date(item.expiresAt).getTime() > Date.now());
  if (!session) return null;
  session.lastActivity = new Date().toISOString();
  return findUserById(session.userId) || null;
}

export function getSessionByToken(token?: string) {
  if (!token) return null;
  return store.sessions.find((item) => item.token === token && new Date(item.expiresAt).getTime() > Date.now()) || null;
}

export function listActiveSessions() {
  store.sessions = store.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  return store.sessions.map((session) => {
    const user = findUserById(session.userId);
    return {
      token: session.token,
      userId: session.userId,
      userName: user?.name || "Usuário removido",
      email: user?.email || "",
      role: user?.role || "user",
      plan: user?.plan || "FREE",
      ip: session.ip || "",
      device: session.device || "",
      browser: session.browser || "",
      createdAt: session.createdAt,
      lastActivity: session.lastActivity || session.createdAt,
      expiresAt: session.expiresAt,
    };
  }).sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));
}

export function forceLogoutSession(token?: string, adminId?: string) {
  const session = getSessionByToken(token);
  if (!session) return false;
  store.sessions = store.sessions.filter((item) => item.token !== token);
  addAudit("auth.admin_force_logout", "Sessão encerrada pelo administrador.", { adminId, userId: session.userId, ip: session.ip, device: session.device });
  saveStore();
  return true;
}

export function removeSession(token?: string) {
  if (!token) return;
  store.sessions = store.sessions.filter((item) => item.token !== token);
  saveStore();
}


export function createPasswordReset(userId: string) {
  const token = randomBytes(36).toString("hex");
  const reset: PasswordReset = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  };
  store.passwordResets = store.passwordResets.filter(item => item.userId !== userId && new Date(item.expiresAt).getTime() > Date.now() && !item.usedAt);
  store.passwordResets.push(reset);
  addAudit("auth.password_reset_requested", "Recuperação de senha solicitada.", { userId });
  saveStore();
  return reset;
}

export function applyPasswordReset(token: string, newPassword: string) {
  const reset = store.passwordResets.find(item => item.token === token && !item.usedAt && new Date(item.expiresAt).getTime() > Date.now());
  if (!reset) return null;
  const user = findUserById(reset.userId);
  if (!user) return null;
  if (String(newPassword || "").length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  const password = hashPassword(newPassword);
  user.passwordHash = password.hash;
  user.passwordSalt = password.salt;
  reset.usedAt = new Date().toISOString();
  store.sessions = store.sessions.filter(session => session.userId !== user.id);
  addAudit("auth.password_reset_completed", "Senha redefinida com sucesso.", { userId: user.id });
  saveStore();
  return user;
}

export function setUserPlan(userId: string, plan: PlanName, days = 30, membership: PaymentPlanName | "FREE" = plan) {
  const user = findUserById(userId);
  if (!user) return null;
  user.plan = plan;
  user.membership = plan === "FREE" ? "FREE" : membership;
  user.planExpiresAt = plan === "FREE" ? undefined : new Date(Date.now() + days * 86400000).toISOString();
  addAudit("user.plan", `${user.email} atualizado para ${membership}`, { userId, plan, membership, days });
  saveStore();
  return user;
}

export function isSocioVipFounder(user?: User | null) {
  if (!user || user.role === "admin" || user.plan !== "VIP") return false;
  if (user.membership === "SOCIO_VIP") return true;
  const activeAccess = !user.planExpiresAt || new Date(user.planExpiresAt).getTime() > Date.now();
  if (!activeAccess) return false;
  return store.payments.some((payment) =>
    payment.userId === user.id &&
    payment.plan === "SOCIO_VIP" &&
    payment.status === "approved"
  );
}

export function getChatMessages(roomId = "") {
  const safeRoom = roomId || "";
  return store.chatMessages.filter((message) => message.roomId === safeRoom && message.roomId !== "general");
}

export function getAllChatMessages() {
  return store.chatMessages;
}

export function addChatMessage(item: Omit<ChatMessage, "id" | "createdAt">) {
  const message: ChatMessage = { ...item, id: randomUUID(), createdAt: new Date().toISOString() };
  store.chatMessages.push(message);
  if (store.chatMessages.length > MAX_CHAT_MESSAGES) {
    store.chatMessages.splice(0, store.chatMessages.length - MAX_CHAT_MESSAGES);
  }
  saveStore();
  return message;
}

export function clearChatMessages() {
  store.chatMessages = [];
  saveStore();
  return { id: randomUUID(), user: "Sistema", message: "As mensagens foram limpas pela administração.", system: true, createdAt: new Date().toISOString(), roomType: "match" as const };
}

export function getBlockedUsers() {
  return store.blockedUsers;
}

export function blockUserName(user: string) {
  const name = user.toLowerCase();
  if (!store.blockedUsers.includes(name)) store.blockedUsers.push(name);
  addAudit("chat.block", `Usuário bloqueado: ${user}`);
  saveStore();
}

export function unblockUserName(user: string) {
  const name = user.toLowerCase();
  store.blockedUsers = store.blockedUsers.filter((item) => item !== name);
  addAudit("chat.unblock", `Usuário desbloqueado: ${user}`);
  saveStore();
}

export function addFavorite(item: Omit<Favorite, "id" | "createdAt">) {
  const favorite: Favorite = { ...item, id: randomUUID(), createdAt: new Date().toISOString() };
  store.favorites.unshift(favorite);
  saveStore();
  return favorite;
}

export function getFavorites(userId: string) {
  return store.favorites.filter((item) => item.userId === userId);
}

export function removeFavorite(userId: string, id: string) {
  store.favorites = store.favorites.filter((item) => !(item.userId === userId && item.id === id));
  saveStore();
}


export function getFavoriteTeams(userId: string) {
  return store.favoriteTeams.filter((team) => team.userId === userId);
}

export function addFavoriteTeam(input: Omit<FavoriteTeam, "id" | "createdAt">) {
  const existing = store.favoriteTeams.find((team) => team.userId === input.userId && team.teamId === input.teamId);
  if (existing) return existing;
  const current = getFavoriteTeams(input.userId);
  if (current.length >= 10) throw new Error("Limite de 10 times favoritos atingido.");
  const team: FavoriteTeam = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  store.favoriteTeams.push(team);
  addAudit("favorite_team.created", `Time favorito adicionado: ${team.name}`, { userId: input.userId, teamId: input.teamId });
  saveStore();
  return team;
}

export function removeFavoriteTeam(userId: string, teamId: number) {
  const before = store.favoriteTeams.length;
  store.favoriteTeams = store.favoriteTeams.filter((team) => !(team.userId === userId && team.teamId === teamId));
  if (before !== store.favoriteTeams.length) {
    addAudit("favorite_team.removed", "Time favorito removido.", { userId, teamId });
    saveStore();
  }
  return getFavoriteTeams(userId);
}

export function getAlertPreference(userId: string) {
  return store.alertPreferences.find((preference) => preference.userId === userId) || {
    userId,
    enabled: false,
    gameStart: true,
    halfTime: true,
    fullTime: true,
    updatedAt: new Date().toISOString(),
  };
}

export function setAlertPreference(userId: string, input: Partial<Omit<AlertPreference, "userId" | "updatedAt">>) {
  const preference: AlertPreference = {
    ...getAlertPreference(userId),
    ...input,
    userId,
    updatedAt: new Date().toISOString(),
  };
  store.alertPreferences = store.alertPreferences.filter((item) => item.userId !== userId);
  store.alertPreferences.push(preference);
  saveStore();
  return preference;
}

export function createSubscription(input: Omit<Subscription, "id" | "createdAt" | "updatedAt" | "status">) {
  const subscription: Subscription = {
    ...input,
    id: randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.subscriptions.unshift(subscription);
  addAudit("subscription.created", `Assinatura iniciada: ${subscription.plan}`, { userId: input.userId, subscriptionId: subscription.id });
  saveStore();
  return subscription;
}

export function updateSubscription(id: string, patch: Partial<Subscription>) {
  const subscription = store.subscriptions.find((item) => item.id === id || item.providerSubscriptionId === id);
  if (!subscription) return null;
  Object.assign(subscription, patch, { updatedAt: new Date().toISOString() });
  addAudit("subscription.updated", `Assinatura atualizada: ${subscription.plan}`, { subscriptionId: subscription.id, status: subscription.status });
  saveStore();
  return subscription;
}

export function getSubscriptions(userId: string) {
  return store.subscriptions.filter((subscription) => subscription.userId === userId);
}

export function createPayment(input: Omit<Payment, "id" | "createdAt" | "status" | "provider"> & { provider?: Payment["provider"] }) {
  const payment: Payment = {
    ...input,
    id: randomUUID(),
    status: "pending",
    provider: input.provider || "manual_pix",
    createdAt: new Date().toISOString(),
  };
  store.payments.unshift(payment);
  addAudit("payment.created", `Pagamento criado: ${payment.plan}`, { paymentId: payment.id });
  saveStore();
  return payment;
}

export function approvePayment(id: string) {
  const payment = store.payments.find((item) => item.id === id || item.providerPaymentId === id);
  if (!payment) return null;
  // Webhooks podem ser enviados mais de uma vez: não estenda o plano novamente.
  if (payment.status === "approved") return payment;
  payment.status = "approved";
  payment.approvedAt = new Date().toISOString();
  if (payment.userId) {
    const accessPlan: PlanName = payment.plan === "SOCIO_VIP" ? "VIP" : payment.plan;
    const accessDays = payment.plan === "SOCIO_VIP" ? 365 : 30;
    setUserPlan(payment.userId, accessPlan, accessDays, payment.plan);
  }
  addAudit("payment.approved", `Pagamento aprovado: ${payment.id}`, { paymentId: payment.id });
  saveStore();
  return payment;
}

export function addAudit(type: string, message: string, meta?: Record<string, unknown>) {
  store.audit.unshift({ id: randomUUID(), type, message, meta, createdAt: new Date().toISOString() });
  store.audit = store.audit.slice(0, 500);
}

export function resetExpiredPlans() {
  const now = Date.now();
  let changed = false;
  for (const user of store.users) {
    if (user.plan !== "FREE" && user.planExpiresAt && new Date(user.planExpiresAt).getTime() < now) {
      user.plan = "FREE";
      user.membership = "FREE";
      user.planExpiresAt = undefined;
      changed = true;
    }
  }
  if (changed) saveStore();
}


export function updatePayment(id: string, patch: Partial<Payment>) {
  const payment = store.payments.find((item) => item.id === id || item.providerPaymentId === id);
  if (!payment) return null;
  Object.assign(payment, patch);
  addAudit("payment.updated", `Pagamento atualizado: ${payment.id}`, { paymentId: payment.id, status: payment.status });
  saveStore();
  return payment;
}

export function cancelPayment(id: string) {
  const payment = updatePayment(id, { status: "cancelled" });
  return payment;
}

export function deletePayment(id: string) {
  const index = store.payments.findIndex((item) => item.id === id || item.providerPaymentId === id);
  if (index < 0) return null;
  const [payment] = store.payments.splice(index, 1);
  addAudit("payment.deleted", `Pagamento excluído: ${payment.id}`, { paymentId: payment.id, status: payment.status });
  saveStore();
  return payment;
}

export function deleteCancelledPayments() {
  const before = store.payments.length;
  const removed = store.payments.filter((payment) => payment.status === "cancelled");
  store.payments = store.payments.filter((payment) => payment.status !== "cancelled");
  const count = before - store.payments.length;
  if (count > 0) {
    addAudit("payments.cancelled.deleted", `${count} pagamentos cancelados excluídos`, { count, ids: removed.map((item) => item.id).slice(0, 50) });
    saveStore();
  }
  return count;
}
