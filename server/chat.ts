import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  addChatMessage,
  blockUserName,
  clearChatMessages,
  getBlockedUsers,
  getAllChatMessages,
  getChatMessages,
  getStore,
  getUserByToken,
  isAdmin,
  unblockUserName,
} from "./app-data";

type ChatRoomType = "match";
type ChatClient = { id: string; res: Response; user: string; userId?: string; roomId: string; roomType: ChatRoomType; roomLabel: string; matchLabel?: string };
const clients = new Map<string, ChatClient>();

function normalizeName(name: string) {
  return String(name || "Visitante").trim().replace(/\s+/g, " ").slice(0, 28) || "Visitante";
}
function normalizeMessage(message: string) {
  return String(message || "").trim().replace(/[<>]/g, "").slice(0, 500);
}
function normalizeAudioUrl(audioUrl: string) {
  const value = String(audioUrl || "");
  if (!value.startsWith("data:audio/")) return "";
  if (value.length > 3_000_000) return "";
  return value;
}
function normalizeAudioMime(audioMime: string) {
  return String(audioMime || "audio/webm").replace(/[^a-z0-9/;.+-]/gi, "").slice(0, 80) || "audio/webm";
}

function normalizeRoomId(roomId: string) {
  const value = String(roomId || "").trim();
  const clean = value.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 80);
  if (!clean || clean === "general") return "";
  return clean.startsWith("match:") ? clean : `match:${clean}`;
}
function normalizeRoomLabel(label: string) {
  return String(label || "Chat da Partida").trim().replace(/\s+/g, " ").slice(0, 80) || "Chat da Partida";
}
function getRoomFromReq(req: Request) {
  const roomId = normalizeRoomId(String(req.query.roomId || req.body?.roomId || ""));
  const roomType: ChatRoomType = "match";
  const defaultLabel = "Sala da partida";
  const roomLabel = normalizeRoomLabel(String(req.query.roomLabel || req.body?.roomLabel || defaultLabel));
  const matchLabel = normalizeRoomLabel(String(req.query.matchLabel || req.body?.matchLabel || roomLabel));
  return { roomId, roomType, roomLabel, matchLabel };
}
function roomOnline(roomId: string) {
  return Array.from(clients.values()).filter((client) => client.roomId === roomId);
}

function getToken(req: Request) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) return header.slice(7);
  return String(req.headers["x-session-token"] || req.query.token || "");
}
function requireAdmin(req: Request, res: Response) {
  const user = getUserByToken(getToken(req));
  if (!user) {
    res.status(401).json({ ok: false, error: "Faça login como administrador." });
    return null;
  }
  if (!isAdmin(user)) {
    res.status(403).json({ ok: false, error: "Acesso permitido apenas ao administrador." });
    return null;
  }
  return user;
}
function snapshot(roomId = "") {
  const safeRoom = normalizeRoomId(roomId);
  const onlineClients = roomOnline(safeRoom);
  return {
    roomId: safeRoom,
    online: onlineClients.length,
    totalOnline: clients.size,
    onlineUsers: onlineClients.map((client) => ({ id: client.id, user: client.user, userId: client.userId })),
    messages: getChatMessages(safeRoom),
    blockedUsers: getBlockedUsers(),
    updatedAt: new Date().toISOString(),
  };
}
function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function broadcast(event: string, data: unknown, roomId?: string) {
  for (const client of clients.values()) {
    if (roomId && client.roomId !== roomId) continue;
    sendEvent(client.res, event, data);
  }
}
function addSystemMessage(message: string, roomId = "") {
  const safeRoom = normalizeRoomId(roomId);
  if (!safeRoom) return null as any;
  const item = addChatMessage({ user: "Sistema", message, system: true, roomId: safeRoom, roomType: "match", roomLabel: "Sala da partida" });
  broadcast("message", item, roomId);
  return item;
}

export function registerLiveChat(app: Express) {
  app.get("/api/chat/state", (req: Request, res: Response) => {
    const room = getRoomFromReq(req);
    if (!room.roomId) { res.status(400).json({ ok: false, error: "Chat geral desativado. Abra o chat de uma partida." }); return; }
    getUserByToken(getToken(req));
    // Chat liberado temporariamente para usuários FREE, PRO, VIP e admin.
    // Mantém login para identificar o usuário, mas não bloqueia por plano.
    res.json({ ...snapshot(room.roomId), room });
  });

  app.get("/api/chat/stream", (req: Request, res: Response) => {
    const loggedUser = getUserByToken(getToken(req));
    const room = getRoomFromReq(req);
    if (!room.roomId) { res.status(400).json({ ok: false, error: "Chat geral desativado. Abra o chat de uma partida." }); return; }
    // Chat liberado temporariamente para usuários FREE, PRO, VIP e admin.
    const user = normalizeName(loggedUser?.name || String(req.query.user || "Visitante"));
    const id = randomUUID();
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    clients.set(id, { id, res, user, userId: loggedUser?.id, roomId: room.roomId, roomType: room.roomType, roomLabel: room.roomLabel, matchLabel: room.matchLabel });
    sendEvent(res, "state", { ...snapshot(room.roomId), room });
    broadcast("online", { online: snapshot(room.roomId).online, totalOnline: clients.size, onlineUsers: snapshot(room.roomId).onlineUsers, roomId: room.roomId }, room.roomId);
    const keepAlive = setInterval(() => sendEvent(res, "ping", { now: Date.now() }), 25000);
    req.on("close", () => {
      clearInterval(keepAlive);
      clients.delete(id);
      broadcast("online", { online: snapshot(room.roomId).online, totalOnline: clients.size, onlineUsers: snapshot(room.roomId).onlineUsers, roomId: room.roomId }, room.roomId);
    });
  });

  app.post("/api/chat/message", (req: Request, res: Response) => {
    const loggedUser = getUserByToken(getToken(req));
    const room = getRoomFromReq(req);
    if (!room.roomId) { res.status(400).json({ ok: false, error: "Chat geral desativado. Abra o chat de uma partida." }); return; }
    // Chat liberado temporariamente para usuários FREE, PRO, VIP e admin.
    const user = normalizeName(loggedUser?.name || req.body?.user);
    const message = normalizeMessage(req.body?.message);
    const audioUrl = normalizeAudioUrl(req.body?.audioUrl);
    const audioMime = normalizeAudioMime(req.body?.audioMime);
    const privateTo = normalizeName(req.body?.privateTo || "");
    const reply = req.body?.replyTo;
    if (!message && !audioUrl) { res.status(400).json({ ok: false, error: "Mensagem vazia." }); return; }
    if (getBlockedUsers().includes(user.toLowerCase())) { res.status(403).json({ ok: false, error: "Usuário bloqueado no chat." }); return; }
    const canPrivate = loggedUser?.role === "admin" || loggedUser?.plan === "PRO" || loggedUser?.plan === "VIP";
    const item = addChatMessage({ user, userId: loggedUser?.id, avatar: loggedUser?.avatar, message: message || "🎙️ Áudio enviado", audioUrl: audioUrl || undefined, audioMime: audioUrl ? audioMime : undefined, privateTo: canPrivate && privateTo ? privateTo : undefined, replyTo: reply?.id ? { id: String(reply.id), user: normalizeName(reply.user), message: normalizeMessage(reply.message).slice(0, 120) } : undefined, roomId: room.roomId, roomType: room.roomType, roomLabel: room.roomLabel, matchLabel: room.matchLabel });
    broadcast("message", item, room.roomId);
    res.json({ ok: true, message: item, online: snapshot(room.roomId).online, roomId: room.roomId });
  });

  app.post("/api/chat/admin/clear", (req, res) => { if (!requireAdmin(req, res)) return; const item = clearChatMessages(); for (const room of new Set(Array.from(clients.values()).map((client) => client.roomId))) { broadcast("state", snapshot(room), room); } res.json({ ok: true, cleared: true, updatedAt: new Date().toISOString() }); });
  app.post("/api/chat/admin/block", (req, res) => { if (!requireAdmin(req, res)) return; const user = normalizeName(req.body?.user); if (!user) { res.status(400).json({ ok: false, error: "Informe o nome do usuário." }); return; } blockUserName(user); for (const room of new Set(Array.from(clients.values()).map((client) => client.roomId))) { addSystemMessage(`${user} foi bloqueado pela administração.`, room); broadcast("state", snapshot(room), room); } res.json({ ok: true, blockedUsers: getBlockedUsers(), updatedAt: new Date().toISOString() }); });
  app.post("/api/chat/admin/unblock", (req, res) => { if (!requireAdmin(req, res)) return; const user = normalizeName(req.body?.user); unblockUserName(user); res.json({ ok: true, blockedUsers: getBlockedUsers(), updatedAt: new Date().toISOString() }); });
  app.get("/api/chat/admin/overview", (req, res) => { if (!requireAdmin(req, res)) return; const store = getStore(); const messages = getAllChatMessages().filter((msg: any) => msg.roomId && msg.roomId !== "general"); const rooms = Array.from(new Map(messages.map((msg: any) => [msg.roomId, { roomId: msg.roomId, roomLabel: msg.roomLabel || "Sala da partida", matchLabel: msg.matchLabel || msg.roomLabel || "Partida", messages: 0, lastMessageAt: msg.createdAt }])).values()).map((room: any) => { const roomMessages = messages.filter((msg: any) => msg.roomId === room.roomId); const onlineClients = roomOnline(room.roomId); return { ...room, messages: roomMessages.length, online: onlineClients.length, lastMessageAt: roomMessages[roomMessages.length - 1]?.createdAt || room.lastMessageAt }; }).sort((a: any, b: any) => String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""))); res.json({ ok: true, totalOnline: clients.size, online: clients.size, onlineUsers: Array.from(clients.values()).map((client) => ({ id: client.id, user: client.user, userId: client.userId, roomId: client.roomId, roomLabel: client.roomLabel })), messages, rooms, activeRooms: rooms.length, blockedUsers: getBlockedUsers(), updatedAt: new Date().toISOString(), totalMessages: messages.length, totalUsers: store.users.length, audit: store.audit.slice(0, 100) }); });
}
