import type { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import {
  approvePayment,
  cancelPayment,
  createPayment,
  createSession,
  createUser,
  findUserByEmail,
  getFavorites,
  getFavoriteTeams,
  addFavoriteTeam,
  removeFavoriteTeam,
  getAlertPreference,
  setAlertPreference,
  createSubscription,
  updateSubscription,
  getSubscriptions,
  getStore,
  getUserByToken,
  isAdmin,
  publicUser,
  removeFavorite,
  removeSession,
  setUserPlan,
  addFavorite,
  listActiveSessions,
  forceLogoutSession,
  updatePayment,
  deletePayment,
  deleteCancelledPayments,
  verifyPassword,
  createPasswordReset,
  applyPasswordReset,
  recordClick,
  getAnalyticsStats,
  isKnownAdminIp,
  rememberAdminIp,
  resetAnalyticsCounters,
} from "./app-data";


function getClientIp(req: Request) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0]?.trim();
  return forwarded || req.socket.remoteAddress || req.ip || "unknown";
}

function getSessionMeta(req: Request) {
  const ua = String(req.headers["user-agent"] || "");
  const browser = ua.includes("Edg/") ? "Edge" : ua.includes("Chrome/") ? "Chrome" : ua.includes("Firefox/") ? "Firefox" : ua.includes("Safari/") ? "Safari" : "Navegador";
  const device = /Android|iPhone|iPad|Mobile/i.test(ua) ? "Mobile" : "Desktop";
  return { ip: getClientIp(req), device, browser };
}

const ipGeoCache = new Map<string, { expiresAt: number; data: { country?: string; region?: string; city?: string; isp?: string } }>();

function isPrivateIp(ip: string) {
  return ip === "unknown" || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

async function lookupIpGeo(ip: string) {
  const cleanIp = ip.replace("::ffff:", "");
  if (isPrivateIp(cleanIp)) return {};
  const cached = ipGeoCache.get(cleanIp);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,country,regionName,city,isp`, { signal: controller.signal });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    if (data?.status !== "success") return {};
    const geo = { country: data.country, region: data.regionName, city: data.city, isp: data.isp };
    ipGeoCache.set(cleanIp, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, data: geo });
    return geo;
  } catch {
    return {};
  }
}

function inferTrafficSource(referrer?: string, explicit?: string) {
  const source = String(explicit || "").trim();
  if (source) return source.slice(0, 80);
  const ref = String(referrer || "").toLowerCase();
  if (!ref) return "Direto";
  if (ref.includes("google.")) return "Google";
  if (ref.includes("instagram.")) return "Instagram";
  if (ref.includes("facebook.") || ref.includes("fb.")) return "Facebook";
  if (ref.includes("whatsapp")) return "WhatsApp";
  if (ref.includes("tiktok.")) return "TikTok";
  if (ref.includes("youtube.")) return "YouTube";
  return "Outros";
}

function getToken(req: Request) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) return header.slice(7);
  return String(req.headers["x-session-token"] || "");
}

function requireUser(req: Request, res: Response) {
  const user = getUserByToken(getToken(req));
  if (!user) {
    res.status(401).json({ ok: false, error: "Faça login para continuar." });
    return null;
  }
  return user;
}

function requireAdmin(req: Request, res: Response) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!isAdmin(user)) {
    res.status(403).json({ ok: false, error: "Acesso permitido apenas ao administrador." });
    return null;
  }
  return user;
}

const PLAN_PRICES = {
  PRO: 19.9,
  VIP: 39.9,
  SOCIO_VIP: 197.0,
} as const;

type RecurringPlan = "PRO" | "VIP";

function isRecurringPlan(plan: PaidCheckoutPlan): plan is RecurringPlan {
  return plan === "PRO" || plan === "VIP";
}

type PaidCheckoutPlan = keyof typeof PLAN_PRICES;

function parsePaidPlan(value: unknown): PaidCheckoutPlan {
  const normalized = String(value || "PRO").toUpperCase();
  if (normalized === "SOCIO_VIP") return "SOCIO_VIP";
  if (normalized === "VIP") return "VIP";
  return "PRO";
}

function appUrl() {
  return (process.env.APP_URL || process.env.PUBLIC_URL || "").replace(/\/$/, "");
}

function mercadoPagoMode() {
  return String(process.env.MERCADO_PAGO_MODE || "test").toLowerCase() === "production" ? "production" : "test";
}

function checkoutUrlFromPreference(data: any) {
  return mercadoPagoMode() === "production" ? data?.init_point : data?.sandbox_init_point || data?.init_point;
}

function safeEqualHex(left: string, right: string) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function validateMercadoPagoSignature(req: Request) {
  const secret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || "").trim();
  if (!secret) return mercadoPagoMode() !== "production";
  const rawSignature = String(req.headers["x-signature"] || "");
  const requestId = String(req.headers["x-request-id"] || "");
  const queryId = String(req.query["data.id"] || req.body?.data?.id || "").toLowerCase();
  if (!rawSignature || !requestId || !queryId) return false;
  const entries = Object.fromEntries(rawSignature.split(",").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  const timestamp = String(entries.ts || "");
  const received = String(entries.v1 || "");
  if (!timestamp || !received) return false;
  const manifest = `id:${queryId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqualHex(received, expected);
}

async function createMercadoPagoPreference(input: {
  token: string;
  amount: number;
  plan: PaidCheckoutPlan;
  email: string;
  userName: string;
  localPaymentId: string;
}) {
  const baseUrl = appUrl();
  if (!baseUrl) throw new Error("APP_URL não configurada no Railway.");

  const title = input.plan === "SOCIO_VIP"
    ? "Analyse Pro 2.0 — Sócio VIP Fundador — 12 meses"
    : `Analyse Pro 2.0 — ${input.plan} — acesso por 30 dias`;

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.localPaymentId,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.plan,
          title,
          description: "Acesso a estatísticas, comparações e recursos premium de futebol.",
          quantity: 1,
          currency_id: "BRL",
          unit_price: input.amount,
        },
      ],
      payer: { email: input.email, name: input.userName },
      external_reference: input.localPaymentId,
      notification_url: `${baseUrl}/api/payments/webhook`,
      back_urls: {
        success: `${baseUrl}/payment-result?status=success&order=${encodeURIComponent(input.localPaymentId)}`,
        pending: `${baseUrl}/payment-result?status=pending&order=${encodeURIComponent(input.localPaymentId)}`,
        failure: `${baseUrl}/payment-result?status=failure&order=${encodeURIComponent(input.localPaymentId)}`,
      },
      auto_return: "approved",
      statement_descriptor: "ANALYSE PRO",
      payment_methods: { installments: 12 },
      metadata: {
        local_payment_id: input.localPaymentId,
        selected_plan: input.plan,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Não foi possível iniciar o checkout Mercado Pago.");
  }
  const checkoutUrl = checkoutUrlFromPreference(data);
  if (!checkoutUrl) throw new Error("Mercado Pago não retornou o link de checkout.");
  return { ...data, checkoutUrl };
}


async function createMercadoPagoSubscriptionLink(input: {
  token: string;
  amount: number;
  plan: RecurringPlan;
  email: string;
  localPaymentId: string;
}) {
  const baseUrl = appUrl();
  if (!baseUrl) throw new Error("APP_URL não configurada no Railway.");

  const response = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `subscription-${input.localPaymentId}`,
    },
    body: JSON.stringify({
      reason: `Analyse Pro 2.0 — ${input.plan} mensal`,
      external_reference: input.localPaymentId,
      payer_email: input.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "BRL",
      },
      back_url: `${baseUrl}/account?subscription=created`,
      notification_url: `${baseUrl}/api/payments/webhook`,
      status: "pending",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Não foi possível iniciar a assinatura.");
  }
  const checkoutUrl = data.init_point || data.sandbox_init_point;
  if (!checkoutUrl) throw new Error("Mercado Pago não retornou o link da assinatura.");
  return { ...data, checkoutUrl };
}

export function registerAuthAndPayments(app: Express) {

  app.post("/api/analytics/click", async (req, res) => {
    try {
      const currentUser = getUserByToken(getToken(req));
      const ip = getClientIp(req);
      if (currentUser?.role === "admin") {
        rememberAdminIp(ip);
        res.json({ ok: true, ignored: true, reason: "admin" });
        return;
      }
      if (isKnownAdminIp(ip)) {
        res.json({ ok: true, ignored: true, reason: "admin-ip" });
        return;
      }

      const path = String(req.body?.path || req.headers.referer || "/");
      const ignoredPath =
        path.startsWith("/admin") ||
        path.startsWith("/api") ||
        path.includes("favicon") ||
        path.includes("/assets/") ||
        path.includes("/static/");

      if (ignoredPath) {
        res.json({ ok: true, ignored: true, reason: "internal-route" });
        return;
      }

      const referrer = String(req.body?.referrer || req.headers.referer || "");
      const geo = await lookupIpGeo(ip);
      recordClick({
        ip,
        path,
        label: String(req.body?.label || "click"),
        userAgent: String(req.headers["user-agent"] || ""),
        referrer,
        source: inferTrafficSource(referrer, req.body?.utmSource),
        medium: String(req.body?.utmMedium || ""),
        campaign: String(req.body?.utmCampaign || ""),
        ...geo,
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  app.get("/api/admin/analytics", (req, res) => {
    const user = requireAdmin(req, res);
    if (!user) return;
    rememberAdminIp(getClientIp(req));
    res.json({ ok: true, analytics: getAnalyticsStats(), serverUpdatedAt: new Date().toISOString() });
  });

  app.post("/api/admin/analytics/reset", (req, res) => {
    const user = requireAdmin(req, res);
    if (!user) return;
    rememberAdminIp(getClientIp(req));
    const reset = resetAnalyticsCounters(user, getClientIp(req));
    res.json({ ok: true, reset, analytics: getAnalyticsStats(), serverUpdatedAt: new Date().toISOString() });
  });

  app.post("/api/auth/register", (req, res) => {
    try {
      const user = createUser(req.body || {});
      const session = createSession(user.id, getSessionMeta(req));
      res.json({ ok: true, user: publicUser(user), token: session.token, singleSession: user.role !== "admin" });
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Erro ao registrar." });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ ok: false, error: "Email ou senha inválidos." });
      return;
    }
    if (user.status === "blocked") {
      res.status(403).json({ ok: false, error: "Usuário bloqueado." });
      return;
    }
    const session = createSession(user.id, getSessionMeta(req));
    res.json({ ok: true, user: publicUser(user), token: session.token, singleSession: user.role !== "admin" });
  });


  app.get("/api/admin/sessions", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    res.json({ ok: true, sessions: listActiveSessions(), updatedAt: new Date().toISOString() });
  });

  app.post("/api/admin/sessions/logout", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const token = String(req.body?.token || "");
    const ok = forceLogoutSession(token, admin.id);
    res.json({ ok, sessions: listActiveSessions(), updatedAt: new Date().toISOString() });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = getUserByToken(getToken(req));
    res.json({ ok: true, user: user ? publicUser(user) : null });
  });

  app.post("/api/auth/logout", (req, res) => {
    removeSession(getToken(req));
    res.json({ ok: true });
  });

  app.post("/api/auth/forgot", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = findUserByEmail(email);
    const message = "Se o e-mail estiver cadastrado, enviaremos um link de recuperação válido por 30 minutos.";
    if (!user) {
      res.json({ ok: true, message });
      return;
    }

    const reset = createPasswordReset(user.id);
    const baseUrl = appUrl() || `http://localhost:${process.env.PORT || 3000}`;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(reset.token)}`;

    if (process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RESET_EMAIL_FROM,
            to: [user.email],
            subject: "Recuperação de senha - ANALYSE PRO 2.0",
            html: `<p>Olá, ${user.name}.</p><p>Para criar uma nova senha, clique no botão abaixo. O link é válido por 30 minutos.</p><p><a href="${resetUrl}" style="background:#facc15;color:#08090b;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">REDEFINIR SENHA</a></p><p>Se você não solicitou esta alteração, ignore este e-mail.</p>`,
          }),
        });
      } catch (error) {
        console.error("Falha no envio do e-mail de recuperação:", error);
      }
    }

    const allowPreview = process.env.NODE_ENV !== "production" || process.env.ALLOW_RESET_PREVIEW === "true";
    res.json({ ok: true, message, ...(allowPreview ? { previewUrl: resetUrl } : {}) });
  });

  app.post("/api/auth/reset", (req, res) => {
    try {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");
      const user = applyPasswordReset(token, password);
      if (!user) {
        res.status(400).json({ ok: false, error: "Link inválido ou expirado. Solicite uma nova recuperação." });
        return;
      }
      res.json({ ok: true, message: "Senha redefinida com sucesso." });
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível redefinir a senha." });
    }
  });

  app.get("/api/favorites", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.plan === "FREE" && !isAdmin(user)) {
      res.status(403).json({ ok: false, error: "Favoritos são recurso PRO/VIP." });
      return;
    }
    res.json({ ok: true, favorites: getFavorites(user.id) });
  });

  app.post("/api/favorites", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (user.plan === "FREE" && !isAdmin(user)) {
      res.status(403).json({ ok: false, error: "Favoritos são recurso PRO/VIP." });
      return;
    }
    const favorite = addFavorite({
      userId: user.id,
      teamA: String(req.body?.teamA || "Time A"),
      teamB: String(req.body?.teamB || "Time B"),
      summary: String(req.body?.summary || ""),
    });
    res.json({ ok: true, favorite });
  });

  app.delete("/api/favorites/:id", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    removeFavorite(user.id, req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/payments/me", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const store = getStore();
    const payments = store.payments
      .filter((payment) => payment.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ ok: true, payments });
  });


  app.get("/api/favorite-teams", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    res.json({ ok: true, teams: getFavoriteTeams(user.id), preferences: getAlertPreference(user.id) });
  });

  app.post("/api/favorite-teams", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const teamId = Number(req.body?.teamId);
      if (!Number.isFinite(teamId)) throw new Error("Time inválido.");
      const team = addFavoriteTeam({
        userId: user.id,
        teamId,
        name: String(req.body?.name || "Time"),
        logo: String(req.body?.logo || ""),
        league: String(req.body?.league || ""),
      });
      res.json({ ok: true, team, teams: getFavoriteTeams(user.id) });
    } catch (error) {
      res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível adicionar o time." });
    }
  });

  app.delete("/api/favorite-teams/:teamId", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    res.json({ ok: true, teams: removeFavoriteTeam(user.id, Number(req.params.teamId)) });
  });

  app.get("/api/alert-preferences", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    res.json({ ok: true, preferences: getAlertPreference(user.id) });
  });

  app.put("/api/alert-preferences", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const preferences = setAlertPreference(user.id, {
      enabled: Boolean(req.body?.enabled),
      gameStart: req.body?.gameStart !== false,
      halfTime: req.body?.halfTime !== false,
      fullTime: req.body?.fullTime !== false,
    });
    res.json({ ok: true, preferences });
  });

  async function beginMercadoPagoCheckout(req: Request, res: Response) {
    const user = requireUser(req, res);
    if (!user) return;

    const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
    if (!token) {
      res.status(503).json({ ok: false, error: "Mercado Pago ainda não foi configurado no servidor." });
      return;
    }

    try {
      const plan = parsePaidPlan(req.body?.plan);
      const amount = PLAN_PRICES[plan];
      const payment = createPayment({
        userId: user.id,
        plan,
        amount,
        provider: "mercado_pago",
        providerPaymentId: undefined,
      });

      const preference = await createMercadoPagoPreference({
        token,
        amount,
        plan,
        email: user.email,
        userName: user.name,
        localPaymentId: payment.id,
      });

      const saved = updatePayment(payment.id, {
        providerPreferenceId: String(preference.id || ""),
        checkoutUrl: String(preference.checkoutUrl),
      });

      res.json({
        ok: true,
        payment: saved || payment,
        checkoutUrl: preference.checkoutUrl,
        mode: `mercado_pago_checkout_pro_${mercadoPagoMode()}`,
        message: "Você será direcionado ao ambiente seguro do Mercado Pago para escolher a forma de pagamento.",
      });
    } catch (error) {
      res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.",
      });
    }
  }


  app.post("/api/subscriptions/create", async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
    if (!token) {
      res.status(503).json({ ok: false, error: "Mercado Pago ainda não foi configurado no servidor." });
      return;
    }

    try {
      const plan = parsePaidPlan(req.body?.plan);
      if (!isRecurringPlan(plan)) {
        res.status(400).json({ ok: false, error: "Assinatura automática disponível apenas para PRO e VIP." });
        return;
      }
      const amount = PLAN_PRICES[plan];
      const payment = createPayment({
        userId: user.id,
        plan,
        amount,
        provider: "mercado_pago",
        billingMode: "recurring",
      });
      const localSubscription = createSubscription({ userId: user.id, plan, amount });
      const provider = await createMercadoPagoSubscriptionLink({
        token,
        amount,
        plan,
        email: user.email,
        localPaymentId: payment.id,
      });
      updatePayment(payment.id, {
        providerSubscriptionId: String(provider.id || ""),
        checkoutUrl: String(provider.checkoutUrl),
      });
      const saved = updateSubscription(localSubscription.id, {
        providerSubscriptionId: String(provider.id || ""),
        checkoutUrl: String(provider.checkoutUrl),
      });
      res.json({
        ok: true,
        subscription: saved,
        checkoutUrl: provider.checkoutUrl,
        message: "Você será direcionado ao Mercado Pago para autorizar a assinatura mensal.",
      });
    } catch (error) {
      res.status(502).json({ ok: false, error: error instanceof Error ? error.message : "Não foi possível iniciar a assinatura." });
    }
  });

  app.get("/api/subscriptions/me", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    res.json({ ok: true, subscriptions: getSubscriptions(user.id) });
  });

  app.post("/api/payments/checkout", beginMercadoPagoCheckout);
  app.post("/api/payments/create", beginMercadoPagoCheckout);

  app.get("/api/payments/status/:id", (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const payment = getStore().payments.find((item) => item.id === req.params.id && item.userId === user.id);
    if (!payment) {
      res.status(404).json({ ok: false, error: "Pagamento não encontrado." });
      return;
    }
    res.json({ ok: true, payment });
  });

  app.post("/api/payments/webhook", async (req, res) => {
    try {
      if (!validateMercadoPagoSignature(req)) {
        res.status(401).json({ ok: false, error: "Notificação sem assinatura válida." });
        return;
      }

      const paymentId = String(req.query["data.id"] || req.body?.data?.id || req.query.id || req.body?.id || "");
      const token = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
      if (!paymentId || !token) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }

      const eventType = String(req.body?.type || req.query.type || req.query.topic || "payment");

      if (eventType === "subscription_preapproval") {
        const subscriptionResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(paymentId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const subscriptionData = await subscriptionResponse.json();
        if (!subscriptionResponse.ok) {
          res.status(502).json({ ok: false, error: "Falha ao consultar assinatura no Mercado Pago." });
          return;
        }
        const localPaymentId = String(subscriptionData.external_reference || "");
        const localPayment = getStore().payments.find((item) => item.id === localPaymentId);
        const localSubscription = getStore().subscriptions.find((item) =>
          item.providerSubscriptionId === String(subscriptionData.id) || item.userId === localPayment?.userId && item.plan === localPayment?.plan
        );
        const status = String(subscriptionData.status || "pending");
        if (localSubscription) {
          updateSubscription(localSubscription.id, {
            providerSubscriptionId: String(subscriptionData.id || ""),
            status: status === "authorized" ? "authorized" : status === "paused" ? "paused" : status === "cancelled" ? "cancelled" : "pending",
          });
        }
        if (localPayment) updatePayment(localPayment.id, { providerSubscriptionId: String(subscriptionData.id || ""), providerStatus: status });
        res.status(200).json({ ok: true });
        return;
      }

      if (eventType === "subscription_authorized_payment") {
        const invoiceResponse = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(paymentId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const invoice = await invoiceResponse.json();
        if (!invoiceResponse.ok) {
          res.status(502).json({ ok: false, error: "Falha ao consultar cobrança da assinatura." });
          return;
        }
        const providerSubscriptionId = String(invoice.preapproval_id || invoice.subscription_id || "");
        const localSubscription = getStore().subscriptions.find((item) => item.providerSubscriptionId === providerSubscriptionId);
        if (!localSubscription) {
          res.status(200).json({ ok: true, ignored: true });
          return;
        }
        const approved = ["processed", "approved", "authorized"].includes(String(invoice.status || ""));
        const existingInvoice = getStore().payments.find((item) => item.providerPaymentId === String(invoice.id));
        const payment = existingInvoice || createPayment({
          userId: localSubscription.userId,
          plan: localSubscription.plan,
          amount: localSubscription.amount,
          provider: "mercado_pago",
          providerSubscriptionId,
          providerPaymentId: String(invoice.id || paymentId),
          billingMode: "recurring",
        });
        updatePayment(payment.id, {
          providerPaymentId: String(invoice.id || paymentId),
          providerSubscriptionId,
          providerStatus: String(invoice.status || ""),
          paymentMethodId: String(invoice.payment_method_id || invoice.payment_type_id || "recorrente"),
        });
        if (approved) approvePayment(payment.id);
        if (["cancelled", "rejected", "refunded", "charged_back"].includes(String(invoice.status))) cancelPayment(payment.id);
        res.status(200).json({ ok: true });
        return;
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        res.status(502).json({ ok: false, error: "Falha ao consultar pagamento no Mercado Pago." });
        return;
      }

      const localId = String(data.external_reference || "");
      const local = getStore().payments.find((item) => item.id === localId && item.provider === "mercado_pago");
      if (!local) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }

      const expectedAmount = Number(local.amount).toFixed(2);
      const confirmedAmount = Number(data.transaction_amount || 0).toFixed(2);
      if (expectedAmount !== confirmedAmount || String(data.currency_id || "BRL") !== "BRL") {
        res.status(400).json({ ok: false, error: "Pagamento não corresponde ao pedido criado." });
        return;
      }

      let targetPayment = local;
      const isNewRecurringCharge = local.billingMode === "recurring" && local.status === "approved" && local.providerPaymentId !== String(data.id || paymentId);
      if (isNewRecurringCharge) {
        targetPayment = createPayment({
          userId: local.userId,
          plan: local.plan,
          amount: local.amount,
          provider: "mercado_pago",
          billingMode: "recurring",
          renewalOf: local.id,
          providerSubscriptionId: local.providerSubscriptionId,
        });
      }
      updatePayment(targetPayment.id, {
        providerPaymentId: String(data.id || paymentId),
        providerSubscriptionId: local.providerSubscriptionId,
        providerStatus: String(data.status || ""),
        paymentMethodId: String(data.payment_method_id || data.payment_type_id || ""),
      });

      if (data.status === "approved") approvePayment(targetPayment.id);
      if (["cancelled", "rejected", "refunded", "charged_back"].includes(String(data.status))) cancelPayment(targetPayment.id);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Erro no webhook Mercado Pago:", error);
      res.status(500).json({ ok: false, error: "Webhook não processado." });
    }
  });

  app.post("/api/payments/admin/approve", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.body?.paymentId || "");
    const existing = getStore().payments.find((item) => item.id === id || item.providerPaymentId === id);
    if (existing?.provider === "mercado_pago") {
      res.status(400).json({ ok: false, error: "Pagamentos Mercado Pago são liberados somente após confirmação automática do webhook." });
      return;
    }
    const payment = approvePayment(id);
    if (!payment) {
      res.status(404).json({ ok: false, error: "Pagamento não encontrado." });
      return;
    }
    res.json({ ok: true, payment });
  });



  app.get("/api/admin/payments", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const store = getStore();
    const payments = store.payments
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((payment) => {
        const user = store.users.find((item) => item.id === payment.userId);
        return {
          ...payment,
          customerName: user?.name || "Cliente não identificado",
          customerEmail: user?.email || "-",
        };
      });

    const totalReceived = store.payments
      .filter((payment) => payment.status === "approved")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalPending = store.payments
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalCancelled = store.payments
      .filter((payment) => payment.status === "cancelled")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    res.json({
      ok: true,
      payments,
      summary: {
        totalReceived,
        totalPending,
        totalCancelled,
        approvedCount: store.payments.filter((payment) => payment.status === "approved").length,
        pendingCount: store.payments.filter((payment) => payment.status === "pending").length,
        cancelledCount: store.payments.filter((payment) => payment.status === "cancelled").length,
        subscriptionsActive: store.users.filter((user) => user.plan === "PRO" || user.plan === "VIP" || user.role === "admin").length,
      },
    });
  });

  app.post("/api/payments/admin/cancel", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const payment = cancelPayment(String(req.body?.paymentId || ""));
    if (!payment) {
      res.status(404).json({ ok: false, error: "Pagamento não encontrado." });
      return;
    }
    res.json({ ok: true, payment });
  });

  app.post("/api/payments/admin/delete", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const payment = deletePayment(String(req.body?.paymentId || ""));
    if (!payment) {
      res.status(404).json({ ok: false, error: "Pagamento não encontrado." });
      return;
    }
    res.json({ ok: true, payment });
  });

  app.post("/api/payments/admin/clear-cancelled", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const count = deleteCancelledPayments();
    res.json({ ok: true, count });
  });

  app.post("/api/admin/users/:id/plan", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const requestedPlan = String(req.body?.plan || "FREE").toUpperCase();
    const accessPlan = requestedPlan === "SOCIO_VIP" ? "VIP" : (requestedPlan === "PRO" || requestedPlan === "VIP" ? requestedPlan : "FREE");
    const days = requestedPlan === "SOCIO_VIP" ? 365 : 30;
    const membership = requestedPlan === "SOCIO_VIP" ? "SOCIO_VIP" : accessPlan;
    const user = setUserPlan(req.params.id, accessPlan, days, membership);
    res.json({ ok: Boolean(user), user: user ? publicUser(user) : null });
  });

  app.get("/api/admin/overview", (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const store = getStore();
    res.json({
      ok: true,
      users: store.users.map(publicUser),
      payments: store.payments,
      favorites: store.favorites,
      audit: store.audit.slice(0, 100),
    });
  });
}
