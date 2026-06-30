import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { authHeaders, getCurrentUser, isAdminUser } from "@/lib/localAuth";
import { Ban, MessageCircle, RefreshCw, Trash2, Users } from "lucide-react";

type ChatMessage = {
  id?: string;
  user: string;
  message: string;
  createdAt?: string;
  system?: boolean;
  privateTo?: string;
  roomId?: string;
  roomLabel?: string;
  matchLabel?: string;
};
type OnlineUser = { id: string; user: string; userId?: string; roomId?: string; roomLabel?: string };
type ChatRoom = { roomId: string; roomLabel: string; matchLabel: string; messages: number; online: number; lastMessageAt?: string };

type ChatOverview = {
  messages: ChatMessage[];
  online: number;
  totalOnline: number;
  onlineUsers: OnlineUser[];
  blockedUsers: string[];
  rooms: ChatRoom[];
  activeRooms: number;
  updatedAt?: string;
};

export default function AdminChat() {
  const [overview, setOverview] = useState<ChatOverview>({ messages: [], online: 0, totalOnline: 0, onlineUsers: [], blockedUsers: [], rooms: [], activeRooms: 0 });
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [blockName, setBlockName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const currentUser = getCurrentUser();
  const isAdmin = isAdminUser(currentUser);

  async function loadState() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const response = await fetch("/api/chat/admin/overview", { headers: authHeaders() });
      const data = await response.json();
      setOverview({
        messages: Array.isArray(data.messages) ? data.messages : [],
        online: Number(data.online || data.totalOnline || 0),
        totalOnline: Number(data.totalOnline || data.online || 0),
        onlineUsers: Array.isArray(data.onlineUsers) ? data.onlineUsers : [],
        blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers : [],
        rooms: Array.isArray(data.rooms) ? data.rooms : [],
        activeRooms: Number(data.activeRooms || 0),
        updatedAt: data.updatedAt,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadState();
    const timer = setInterval(loadState, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredMessages = useMemo(() => {
    if (selectedRoom === "all") return overview.messages;
    return overview.messages.filter((item) => item.roomId === selectedRoom);
  }, [overview.messages, selectedRoom]);

  async function clearChat() {
    if (!confirm("Deseja apagar todas as mensagens de todas as salas?")) return;
    await fetch("/api/chat/admin/clear", { method: "POST", headers: authHeaders() });
    setStatus("Mensagens apagadas com sucesso.");
    loadState();
  }

  async function blockUser(userFromButton?: string) {
    const user = (userFromButton || blockName).trim();
    if (!user) return;
    await fetch("/api/chat/admin/block", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ user }) });
    setBlockName("");
    setStatus(`${user} bloqueado no chat.`);
    loadState();
  }

  async function unblockUser(user: string) {
    await fetch("/api/chat/admin/unblock", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ user }) });
    setStatus(`${user} desbloqueado.`);
    loadState();
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02060d] p-6 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/30 bg-[#07111f] p-8 text-center">
          <h1 className="text-3xl font-black">Acesso restrito</h1>
          <p className="mt-3 text-slate-300">Esta página é exclusiva do administrador.</p>
          <a href="/login" className="mt-6 inline-block rounded-xl bg-green-500 px-6 py-3 font-black text-white">Entrar como admin</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#02060d] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/users" className="font-bold text-green-400">← Voltar ao ADM</Link>
          <button onClick={loadState} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white hover:bg-white/[0.08]">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">ADMIN • MENSAGENS</p>
            <h1 className="text-4xl font-black md:text-5xl">Central de Mensagens</h1>
            <p className="mt-2 text-slate-400">Moderação profissional do chat por partida. Não existe mais chat geral misturando jogos.</p>
            {overview.updatedAt ? <p className="mt-2 text-xs font-bold text-slate-500">Última atualização: {new Date(overview.updatedAt).toLocaleString("pt-BR")}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Online" value={overview.totalOnline} icon={<Users className="h-5 w-5" />} />
            <Metric label="Salas" value={overview.rooms.length} icon={<MessageCircle className="h-5 w-5" />} />
            <Metric label="Mensagens" value={overview.messages.length} icon={<MessageCircle className="h-5 w-5" />} />
            <Metric label="Bloqueados" value={overview.blockedUsers.length} icon={<Ban className="h-5 w-5" />} />
          </div>
        </div>

        {status ? <p className="mt-5 rounded-xl border border-yellow-400/25 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">{status}</p> : null}

        <div className="mt-8 grid gap-5 xl:grid-cols-[310px_1fr_330px]">
          <aside className="space-y-5">
            <section className="rounded-3xl border border-yellow-400/20 bg-[#07111f]/90 p-5">
              <h2 className="text-xl font-black">Salas por partida</h2>
              <button onClick={() => setSelectedRoom("all")} className={`mt-4 w-full rounded-xl px-3 py-3 text-left text-sm font-black ${selectedRoom === "all" ? "bg-yellow-400 text-black" : "border border-white/10 bg-slate-950/70 text-white"}`}>Todas as mensagens</button>
              <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto">
                {overview.rooms.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">Nenhuma sala ativa ainda.</p> : null}
                {overview.rooms.map((room) => (
                  <button key={room.roomId} onClick={() => setSelectedRoom(room.roomId)} className={`w-full rounded-xl p-3 text-left text-sm ${selectedRoom === room.roomId ? "bg-green-500/20 ring-1 ring-green-400" : "border border-white/10 bg-slate-950/70 hover:bg-white/[0.05]"}`}>
                    <strong className="block text-white">{room.roomLabel}</strong>
                    <span className="mt-1 block text-xs text-slate-400">{room.messages} mensagens • {room.online} online</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Histórico de mensagens</h2>
              <button onClick={clearChat} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400"><Trash2 className="h-4 w-4" /> Limpar mensagens</button>
            </div>
            <div className="max-h-[690px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
              {filteredMessages.length === 0 ? <p className="rounded-xl border border-white/10 bg-slate-950/70 p-5 text-center text-slate-400">Nenhuma mensagem nesta seleção.</p> : null}
              {filteredMessages.map((item, index) => (
                <div key={item.id || `${item.user}-${index}`} className="mb-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <strong className={item.system ? "text-yellow-300" : "text-green-400"}>{item.user}</strong>
                      <p className="text-xs text-slate-500">{item.roomLabel || "Sala da partida"}</p>
                    </div>
                    {item.createdAt ? <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("pt-BR")}</span> : null}
                  </div>
                  {item.privateTo ? <p className="mt-1 text-xs font-bold text-purple-300">Privado para: {item.privateTo}</p> : null}
                  <p className="mt-2 break-words text-slate-100">{item.message}</p>
                  {!item.system ? <button onClick={() => blockUser(item.user)} className="mt-2 text-xs font-bold text-red-300">Bloquear usuário</button> : null}
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-5">
              <h2 className="text-xl font-black">Usuários online</h2>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {overview.onlineUsers.length === 0 ? <p className="text-sm text-slate-400">Nenhum usuário online.</p> : null}
                {overview.onlineUsers.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="font-bold">{item.user}</span><button onClick={() => blockUser(item.user)} className="text-xs font-bold text-red-300">Banir</button></div><p className="mt-1 text-xs text-slate-500">{item.roomLabel || item.roomId}</p></div>)}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-5">
              <h2 className="text-xl font-black">Bloquear usuário</h2>
              <div className="mt-4 flex gap-2">
                <input value={blockName} onChange={(event) => setBlockName(event.target.value)} placeholder="Nome do usuário" className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-white outline-none focus:border-green-400" />
                <button onClick={() => blockUser()} className="rounded-xl bg-green-500 px-4 text-sm font-black text-white hover:bg-green-400">Bloquear</button>
              </div>
              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                {overview.blockedUsers.map((user) => <div key={user} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"><span>{user}</span><button onClick={() => unblockUser(user)} className="text-sm font-bold text-green-400">Desbloquear</button></div>)}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="rounded-2xl border border-green-400/25 bg-green-500/10 px-5 py-4"><div className="flex items-center justify-center gap-2 text-sm text-slate-300">{icon}{label}</div><p className="mt-1 text-center text-4xl font-black text-green-400">{value}</p></div>;
}
