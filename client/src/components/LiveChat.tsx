import { useEffect, useMemo, useRef, useState } from "react";
import { authHeaders, getAuthToken, getCurrentUser, hasChatAccess, type LocalUser } from "@/lib/localAuth";
import { Mic, Square } from "lucide-react";

type ChatMessage = {
  id?: string;
  user: string;
  userId?: string;
  avatar?: string;
  message: string;
  audioUrl?: string;
  audioMime?: string;
  createdAt?: string;
  system?: boolean;
  replyTo?: { id: string; user: string; message: string };
  privateTo?: string;
  roomId?: string;
  roomType?: "match";
  roomLabel?: string;
  matchLabel?: string;
};

type OnlineUser = { id: string; user: string; userId?: string };

const USER_KEY = "tap_chat_user";
const emojis = ["⚽", "🔥", "✅", "👀", "👏", "💸", "🚀", "😎"];

function getInitialUser() {
  if (typeof window === "undefined") return "Visitante";
  const current = getCurrentUser();
  if (current?.name) return current.name;
  const saved = window.localStorage.getItem(USER_KEY);
  if (saved) return saved;
  const generated = `Visitante ${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem(USER_KEY, generated);
  return generated;
}

function playNotification() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.value = 0.045;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

function isAdminName(name: string) {
  const clean = name.toLowerCase();
  return clean.includes("admin") || clean.includes("analyse") || clean.includes("tiago") || clean.includes("oliveira");
}

function AdminAvatar() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-yellow-400/40 bg-black shadow-[0_0_22px_rgba(250,204,21,0.18)]">
      <LogoBars className="h-8 w-8" />
    </div>
  );
}

function LogoBars({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <div className={`flex items-end gap-0.5 ${className}`} aria-label="Analyse Pro 2.0">
      <span className="h-[34%] w-[22%] rounded-sm bg-white shadow-[0_0_8px_rgba(255,255,255,0.28)]" />
      <span className="h-[52%] w-[22%] rounded-sm bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.28)]" />
      <span className="h-[74%] w-[22%] rounded-sm bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.28)]" />
      <span className="h-full w-[22%] rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.28)]" />
    </div>
  );
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function formatRecordingTime(seconds: number) {
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState(getInitialUser);
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(() => getCurrentUser());
  const [online, setOnline] = useState(0);
  const [, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [roomContext, setRoomContext] = useState<{ roomId: string; roomLabel: string; matchLabel: string } | null>(() => ({
    roomId: "match:chat-geral",
    roomLabel: "Chat Geral",
    matchLabel: "Sala principal do site",
  }));
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCount = useRef(0);

  const encodedUser = useMemo(() => encodeURIComponent(user || "Visitante"), [user]);
  const token = getAuthToken();
  const activeRoomId = roomContext?.roomId || "";
  const activeRoomLabel = roomContext?.roomLabel || "Chat da Partida";
  const activeMatchLabel = roomContext?.matchLabel || "Sala exclusiva da partida";
  const chatAllowed = hasChatAccess(currentUser);

  useEffect(() => {
    const openRoom = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const rawRoomId = String(detail.roomId || detail.fixtureId || detail.matchId || "");
      if (!rawRoomId || rawRoomId === "general") return;
      const roomLabel = String(detail.roomLabel || detail.room || "Sala da partida");
      const matchLabel = String(detail.matchLabel || detail.match || roomLabel);
      setRoomContext({ roomId: `match:${rawRoomId.replace(/^match:/, "")}`, roomLabel, matchLabel });
      setIsOpen(true);
      setError("");
    };

    const openByDataAttribute = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("[data-chat-room-id]") : null;
      if (!target) return;
      const rawRoomId = target.getAttribute("data-chat-room-id") || "";
      if (!rawRoomId || rawRoomId === "general") return;
      event.preventDefault();
      event.stopPropagation();
      openRoom(new CustomEvent("tap-open-live-chat", {
        detail: {
          roomId: rawRoomId,
          roomLabel: target.getAttribute("data-chat-room-label") || "Sala da partida",
          matchLabel: target.getAttribute("data-chat-match-label") || target.getAttribute("data-chat-room-label") || "Sala exclusiva",
        },
      }));
    };

    window.addEventListener("tap-open-live-chat", openRoom as EventListener);
    window.addEventListener("analyse-open-match-chat", openRoom as EventListener);
    document.addEventListener("click", openByDataAttribute, true);
    return () => {
      window.removeEventListener("tap-open-live-chat", openRoom as EventListener);
      window.removeEventListener("analyse-open-match-chat", openRoom as EventListener);
      document.removeEventListener("click", openByDataAttribute, true);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const latest = getCurrentUser();
      setCurrentUser(latest);
      if (latest?.name) setUser(latest.name);
    };
    window.addEventListener("tap-auth-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tap-auth-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(USER_KEY, user || "Visitante");
  }, [user]);

  useEffect(() => {
    if (!recording) return;
    setRecordingSeconds(0);
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    let closed = false;

    if (!roomContext || !chatAllowed) {
      setConnected(false);
      setMessages([]);
      setOnline(0);
      setOnlineUsers([]);
      return;
    }

    const stateQs = new URLSearchParams({ roomId: activeRoomId, roomLabel: activeRoomLabel, matchLabel: activeMatchLabel });
    fetch(`/api/chat/state?${stateQs.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!closed) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
          setOnline(Number(data.online || 0));
          setOnlineUsers(Array.isArray(data.onlineUsers) ? data.onlineUsers : []);
        }
      })
      .catch(() => setError("Não foi possível carregar o chat."));

    const qs = new URLSearchParams({ user: encodedUser, roomId: activeRoomId, roomLabel: activeRoomLabel, matchLabel: activeMatchLabel });
    if (token) qs.set("token", token);
    const source = new EventSource(`/api/chat/stream?${qs.toString()}`);

    source.addEventListener("open", () => {
      setConnected(true);
      setError("");
    });

    source.addEventListener("state", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setOnline(Number(data.online || 0));
      setOnlineUsers(Array.isArray(data.onlineUsers) ? data.onlineUsers : []);
    });

    source.addEventListener("message", (event) => {
      const item = JSON.parse((event as MessageEvent).data) as ChatMessage;
      setMessages((current) => {
        if (item.id && current.some((message) => message.id === item.id)) return current;
        const next = [...current, item].slice(-500);
        if (lastMessageCount.current && item.user !== user) playNotification();
        lastMessageCount.current = next.length;
        return next;
      });
    });

    source.addEventListener("online", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setOnline(Number(data.online || 0));
      setOnlineUsers(Array.isArray(data.onlineUsers) ? data.onlineUsers : []);
    });

    source.addEventListener("error", () => {
      setConnected(false);
      setError("Conexão instável. Tentando reconectar...");
    });

    return () => {
      closed = true;
      source.close();
    };
  }, [encodedUser, token, user, chatAllowed, activeRoomId, activeRoomLabel, activeMatchLabel]);

  async function sendChatPayload(payload: { message?: string; audioUrl?: string; audioMime?: string }) {
    setError("");
    const response = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        user,
        roomId: activeRoomId,
        roomLabel: activeRoomLabel,
        matchLabel: activeMatchLabel,
        message: payload.message || "",
        audioUrl: payload.audioUrl,
        audioMime: payload.audioMime,
        replyTo: replyTo ? { id: replyTo.id, user: replyTo.user, message: replyTo.message } : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Não foi possível enviar a mensagem.");
      return false;
    }
    setText("");
    setReplyTo(null);
    return true;
  }

  async function sendMessage() {
    const cleanText = text.trim();
    if (!cleanText) return;
    await sendChatPayload({ message: cleanText });
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      setRecordingSeconds(0);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setRecording(false);
        setRecordingSeconds(0);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        if (blob.size > 2_500_000) {
          setError("Áudio muito grande. Grave até 60 segundos.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => sendChatPayload({ message: "🎙️ Áudio", audioUrl: String(reader.result || ""), audioMime: blob.type || "audio/webm" });
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
      window.setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setRecording(false);
        }
      }, 60000);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  // O botão flutuante precisa aparecer sempre.
  // Quando nenhuma partida foi escolhida, usa a sala geral "match:chat-geral".
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[99999] rounded-full border border-yellow-400/70 bg-[#07090d]/95 px-5 py-3 text-sm font-black text-white shadow-[0_0_34px_rgba(250,204,21,0.42)] backdrop-blur hover:bg-black md:bottom-6 md:right-6"
      >
        💬 Chat ao vivo {online > 0 ? <span className="text-yellow-400">({online})</span> : null}
      </button>
    );
  }

  if (!chatAllowed) {
    return (
      <aside className="fixed bottom-3 left-3 right-3 z-[9999] flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-yellow-400/30 bg-[#07090d]/95 text-white shadow-2xl backdrop-blur md:left-auto md:right-6 md:top-28 md:w-[410px]">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xl font-black">Chat da Partida</p>
            <p className="text-xs font-bold text-yellow-300">Entre para comentar nesta sala</p>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.06] font-black text-slate-100">×</button>
        </header>
        <div className="space-y-4 p-6 text-sm text-slate-300">
          <p>Entre com sua conta gratuita para participar do chat da comunidade.</p>
          <a href={currentUser ? "/plans" : "/login"} className="block rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-center font-black text-black hover:from-yellow-300 hover:to-orange-400">
            {currentUser ? "Atualizar" : "Entrar ou criar conta"}
          </a>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed bottom-3 left-3 right-3 z-[9999] flex h-[78vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#07090d]/95 text-white shadow-[0_0_50px_rgba(0,0,0,0.65)] backdrop-blur md:left-auto md:right-6 md:top-24 md:h-[590px] md:w-[390px]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xl font-black">{roomContext?.roomLabel || "Chat da Partida"}</p>
          <p className="text-xs font-bold text-green-400"><span className={connected ? "text-green-400" : "text-yellow-400"}>•</span> {online || 1} online nesta sala • {roomContext?.matchLabel || "Sala exclusiva"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-yellow-400/20 px-3 py-2 text-xs font-black text-yellow-300">Partida</span>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar chat" className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.06] font-black text-slate-100">×</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
        {messages.length ? messages.map((item, index) => {
          const admin = isAdminName(item.user);
          const displayName = admin ? "ANALYSE PRO 2.0" : item.user;
          return (
            <div key={item.id || `${item.user}-${index}`} className="mb-5 flex gap-4">
              {admin ? (
                <AdminAvatar />
              ) : item.avatar ? (
                <img src={item.avatar} className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-sm font-black text-black shadow-[0_0_22px_rgba(250,204,21,0.18)]">
                  {initials(item.user)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <strong className={admin ? "font-black text-yellow-400" : "font-black text-white"}>{displayName}</strong>
                  {admin ? <span className="rounded bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-black">ADMIN</span> : null}
                  {item.privateTo && !admin ? <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-200">privado</span> : null}
                  {item.createdAt ? <span className="ml-auto text-xs text-slate-500">{new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
                </div>
                {item.replyTo ? <div className="mt-2 rounded-lg border-l-2 border-yellow-400 bg-black/30 px-3 py-2 text-xs text-slate-400">↪ {isAdminName(item.replyTo.user) ? "ANALYSE PRO 2.0" : item.replyTo.user}: {item.replyTo.message}</div> : null}
                <p className="mt-1 break-words text-base text-slate-300">{item.message}</p>
                {item.audioUrl ? <audio controls src={item.audioUrl} className="mt-3 w-full max-w-[260px]" /> : null}
                {!item.system ? <button type="button" onClick={() => setReplyTo(item)} className="mt-1 text-xs font-bold text-yellow-400">Responder</button> : null}
              </div>
            </div>
          );
        }) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-slate-400">"Nenhuma mensagem nesta partida. Seja o primeiro a comentar este jogo."</div>
        )}
        <div ref={endRef} />
      </div>

      {replyTo ? <div className="border-t border-white/10 bg-black/40 px-5 py-3 text-xs text-slate-300">Respondendo {replyTo.user}: {replyTo.message.slice(0, 60)} <button onClick={() => setReplyTo(null)} className="ml-2 font-bold text-red-300">cancelar</button></div> : null}
      {error ? <p className="px-5 pb-2 text-xs font-bold text-yellow-300">{error}</p> : null}

      <div className="flex gap-1 border-t border-white/10 bg-[#07090d] px-5 pt-3">
        {emojis.map((emoji) => <button key={emoji} type="button" onClick={() => setText((value) => `${value}${emoji}`)} className="rounded-lg bg-white/[0.06] px-2 py-1 text-sm hover:bg-white/[0.10]">{emoji}</button>)}
      </div>
      {recording ? (
        <div className="border-t border-white/10 bg-red-500/10 px-5 py-3 text-sm font-black text-red-200">
          <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Gravando áudio {formatRecordingTime(recordingSeconds)} · pressione ENTER para enviar
        </div>
      ) : null}
      <form onSubmit={(event) => { event.preventDefault(); recording ? toggleRecording() : sendMessage(); }} className="flex gap-3 bg-[#07090d] p-5">
        <button type="button" onClick={toggleRecording} className={`h-14 rounded-2xl px-4 font-black ${recording ? "bg-red-500 text-white animate-pulse" : "border border-yellow-400/30 bg-yellow-400/10 text-yellow-300"}`} aria-label={recording ? "Enviar áudio" : "Gravar áudio"}>
          {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={recording ? `Gravando ${formatRecordingTime(recordingSeconds)}... ENTER envia` : `Mensagem nesta partida...`}
          className="h-14 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-yellow-400"
        />
        <button type="submit" disabled={!recording && !text.trim()} className="h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 text-xl font-black text-black disabled:cursor-not-allowed disabled:opacity-40">➤</button>
      </form>
    </aside>
  );
}
