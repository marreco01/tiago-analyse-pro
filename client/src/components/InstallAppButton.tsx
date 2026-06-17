import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __analyseProInstallPrompt?: Event;
  }
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

function getManualInstallMessage() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.";
  }
  if (/android/.test(ua)) {
    return "No Android: toque no menu do navegador (⋮) e escolha Instalar app ou Adicionar à tela inicial.";
  }
  return "No computador: use o ícone de instalar na barra de endereço do navegador ou o menu do Chrome/Edge > Instalar Analyse Pro.";
}

export default function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setInstalled(isStandaloneMode());

    const savedPrompt = window.__analyseProInstallPrompt as InstallPromptEvent | undefined;
    if (savedPrompt) setPrompt(savedPrompt);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      window.__analyseProInstallPrompt = event;
      setPrompt(event as InstallPromptEvent);
      setNotice("");
    };

    const onPromptReady = () => {
      const readyPrompt = window.__analyseProInstallPrompt as InstallPromptEvent | undefined;
      if (readyPrompt) setPrompt(readyPrompt);
    };

    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      window.__analyseProInstallPrompt = undefined;
      setNotice("App instalado com sucesso.");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("analysepro-install-ready", onPromptReady);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("analysepro-install-ready", onPromptReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installed) return;

    const installPrompt = prompt || (window.__analyseProInstallPrompt as InstallPromptEvent | undefined);
    if (!installPrompt) {
      const message = getManualInstallMessage();
      setNotice(message);
      window.alert(message);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setPrompt(null);
        window.__analyseProInstallPrompt = undefined;
        setNotice("Instalação iniciada com sucesso.");
      } else {
        setNotice("Instalação cancelada. Você pode tentar novamente pelo botão ou pelo menu do navegador.");
      }
    } catch {
      const message = getManualInstallMessage();
      setNotice(message);
      window.alert(message);
    }
  }

  if (installed) {
    return <p className="inline-flex items-center gap-2 rounded-xl border border-green-400/25 bg-green-400/10 px-4 py-3 text-sm font-black text-green-300"><Smartphone className="h-4 w-4" /> App instalado</p>;
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={install} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-3 font-black text-black hover:from-yellow-300 hover:to-orange-400">
        <Download className="h-4 w-4" />
        {prompt ? "Instalar app" : "Ativar / instalar site"}
      </button>
      {notice ? <p className="max-w-xs text-xs font-bold text-slate-400">{notice}</p> : null}
    </div>
  );
}
