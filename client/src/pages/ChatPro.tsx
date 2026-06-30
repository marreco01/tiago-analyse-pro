import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { MessageCircle } from "lucide-react";

function openTestChatRoom() {
  window.dispatchEvent(new CustomEvent("tap-open-live-chat", {
    detail: {
      roomId: "match:sala-teste-chat",
      roomLabel: "Sala Teste do Chat",
      matchLabel: "Ambiente de teste do chat",
    },
  }));
}

export default function ChatPro() {
  return (
    <PremiumAppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">Chat por partida</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Comunidade Analyse Pro</h1>
          <p className="mt-3 max-w-3xl text-slate-400">O chat funciona por sala de jogo. Cada partida abre uma conversa exclusiva sem misturar mensagens.</p>
        </div>
        <GlassCard className="p-8 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
          <h2 className="text-2xl font-black">Ativar chat</h2>
          <p className="mt-2 text-slate-400">Entre em uma partida ao vivo e toque em “Sala ao vivo”, ou use o botão abaixo para testar a abertura do chat.</p>
          <button
            type="button"
            onClick={openTestChatRoom}
            className="mt-6 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4 font-black text-black shadow-[0_0_22px_rgba(250,204,21,0.18)]"
          >
            💬 Ativar chat de teste
          </button>
        </GlassCard>
      </div>
    </PremiumAppShell>
  );
}
