import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Film, Image as ImageIcon, Music, Play, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { PremiumAppShell, GlassCard } from "@/components/PremiumShell";
import { getCurrentUser, isAdminUser } from "@/lib/localAuth";
import {
  fetchInstagramProjects,
  runInstagramRobot,
  updateInstagramProjectStatus,
  type InstagramProject,
} from "@/lib/instagramRobot";

function brDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: InstagramProject["status"]) {
  if (status === "approved") return "Aprovado";
  if (status === "published") return "Publicado";
  return "Pendente";
}

function templateLabel(template: InstagramProject["template"]) {
  if (template === "breaking") return "Última Hora";
  if (template === "injury") return "Lesão/Desfalque";
  if (template === "market") return "Mercado da Bola";
  return "Análise";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 8) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
    if (lines.length >= maxLines - 1) {
      const remaining = words.slice(words.indexOf(word) + 1).join(" ");
      if (remaining) line = `${line} ${remaining}`;
      break;
    }
  }

  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number, startSize: number, minSize: number) {
  for (let size = startSize; size >= minSize; size -= 3) {
    ctx.font = `900 ${size}px Arial`;
    const lines = wrapLines(ctx, text, maxWidth, maxLines);
    if (lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= maxWidth)) {
      return { size, lines };
    }
  }
  ctx.font = `900 ${minSize}px Arial`;
  return { size: minSize, lines: wrapLines(ctx, text, maxWidth, maxLines) };
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawAnalyseLogo(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const widths = [12, 12, 12, 12];
  const heights = [32, 54, 78, 104];
  const colors = ["#ffffff", "#facc15", "#fb923c", "#ef4444"];

  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    const bx = x + index * 26 * scale;
    const by = y + (104 - heights[index]) * scale;
    drawRoundRect(ctx, bx, by, widths[index] * scale, heights[index] * scale, 9 * scale);
    ctx.fill();
  });

  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${26 * scale}px Arial`;
  ctx.fillText("ANALYSE", x + 125 * scale, y + 44 * scale);
  ctx.fillStyle = "#facc15";
  ctx.fillText("PRO 2.0", x + 255 * scale, y + 44 * scale);
  ctx.shadowBlur = 0;
}

function drawImageCoverZoom(ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, imageIndex = 0) {
  const zoom = 1.04 + Math.min(0.22, (elapsed / 30) * 0.22);
  const baseScale = Math.max(1080 / img.width, 1920 / img.height);
  const scale = baseScale * zoom;
  const w = img.width * scale;
  const h = img.height * scale;

  // leve deslocamento contínuo para parecer vídeo, sem deixar borda
  const panX = Math.sin(elapsed * 0.18 + imageIndex) * Math.max(0, (w - 1080) * 0.12);
  const panY = Math.cos(elapsed * 0.16 + imageIndex) * Math.max(0, (h - 1920) * 0.08);

  const x = (1080 - w) / 2 + panX;
  const y = (1920 - h) / 2 + panY;
  ctx.drawImage(img, x, y, w, h);
}

function drawCaptionPng(ctx: CanvasRenderingContext2D, text: string) {
  const fit = fitFontSize(ctx, text, 940, 4, 50, 32);
  const lineHeight = fit.size + 12;
  const boxHeight = fit.lines.length * lineHeight + 54;
  const y = 1920 - boxHeight - 120;

  ctx.save();

  // faixa branca estilo PNG na parte inferior
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  drawRoundRect(ctx, 50, y, 980, boxHeight, 28);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020617";
  ctx.font = `900 ${fit.size}px Arial`;
  fit.lines.forEach((line, index) => {
    ctx.fillText(line, 85, y + 56 + index * lineHeight);
  });

  ctx.fillStyle = "#facc15";
  drawRoundRect(ctx, 85, y + boxHeight - 18, 220, 8, 5);
  ctx.fill();

  ctx.restore();
}

function getProjectImages(project: InstagramProject) {
  const p = project as any;
  const raw = [
    p.imageUrl,
    p.thumbnail,
    p.image,
    p.mediaUrl,
    ...(Array.isArray(p.images) ? p.images : []),
    ...(Array.isArray(p.mediaImages) ? p.mediaImages : []),
  ].filter(Boolean);

  return Array.from(new Set(raw)).slice(0, 5) as string[];
}

function getProjectImageUrl(project: InstagramProject) {
  return getProjectImages(project)[0] || "";
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Imagem indisponível"));
      img.src = url;
    });
    return img;
  } catch {
    return null;
  }
}

async function loadImages(urls: string[]) {
  const loaded = await Promise.all(urls.map((url) => loadImage(url)));
  return loaded.filter(Boolean) as HTMLImageElement[];
}


function drawImageBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, imageIndex = 0) {
  const zoom = 1.08 + Math.min(0.18, (elapsed / 30) * 0.18);
  const scale = Math.max(1080 / img.width, 1920 / img.height) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const panX = Math.sin(elapsed * 0.16 + imageIndex) * Math.max(0, (w - 1080) * 0.07);
  const panY = Math.cos(elapsed * 0.14 + imageIndex) * Math.max(0, (h - 1920) * 0.05);
  ctx.save();
  ctx.filter = "blur(24px)";
  ctx.globalAlpha = 0.72;
  ctx.drawImage(img, (1080 - w) / 2 + panX, (1920 - h) / 2 + panY, w, h);
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(0, 0, 1080, 1920);
}

function drawMainImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, imageIndex = 0) {
  // Fill the vertical frame properly. It crops instead of leaving black side bars.
  const zoom = 1.02 + Math.min(0.14, (elapsed / 30) * 0.14);
  const scale = Math.max(1080 / img.width, 1420 / img.height) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const panX = Math.sin(elapsed * 0.12 + imageIndex) * Math.max(0, (w - 1080) * 0.06);
  const panY = Math.cos(elapsed * 0.10 + imageIndex) * Math.max(0, (h - 1420) * 0.05);

  const yArea = 180;
  const areaH = 1260;
  const x = (1080 - w) / 2 + panX;
  const y = yArea + (areaH - h) / 2 + panY;

  ctx.save();
  drawRoundRect(ctx, 36, yArea, 1008, areaH, 34);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  const shade = ctx.createLinearGradient(0, yArea, 0, yArea + areaH);
  shade.addColorStop(0, "rgba(0,0,0,0.08)");
  shade.addColorStop(0.65, "rgba(0,0,0,0.04)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(36, yArea, 1008, areaH);
  ctx.restore();
}

function drawCleanLogo(ctx: CanvasRenderingContext2D) {
  drawAnalyseLogo(ctx, 62, 58, 0.86);
}

function drawBottomCaption(ctx: CanvasRenderingContext2D, text: string) {
  const fit = fitFontSize(ctx, text, 900, 4, 52, 34);
  const lineHeight = fit.size + 12;
  const boxHeight = fit.lines.length * lineHeight + 60;
  const y = 1920 - boxHeight - 82;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  drawRoundRect(ctx, 54, y, 972, boxHeight, 30);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020617";
  ctx.font = `900 ${fit.size}px Arial`;
  fit.lines.forEach((line, index) => {
    ctx.fillText(line, 92, y + 58 + index * lineHeight);
  });

  ctx.fillStyle = "#facc15";
  drawRoundRect(ctx, 92, y + boxHeight - 20, 210, 8, 6);
  ctx.fill();
  ctx.restore();
}


function drawReelsCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, imageIndex = 0) {
  const zoom = 1.03 + Math.min(0.18, (elapsed / 30) * 0.18);
  const scale = Math.max(1080 / img.width, 1920 / img.height) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;

  const panX = Math.sin(elapsed * 0.12 + imageIndex) * Math.max(0, (w - 1080) * 0.06);
  const panY = Math.cos(elapsed * 0.10 + imageIndex) * Math.max(0, (h - 1920) * 0.06);

  ctx.drawImage(img, (1080 - w) / 2 + panX, (1920 - h) / 2 + panY, w, h);
}

function drawReelsOverlay(ctx: CanvasRenderingContext2D) {
  const overlay = ctx.createLinearGradient(0, 0, 0, 1920);
  overlay.addColorStop(0, "rgba(0,0,0,0.38)");
  overlay.addColorStop(0.35, "rgba(0,0,0,0.05)");
  overlay.addColorStop(0.70, "rgba(0,0,0,0.08)");
  overlay.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, 1080, 1920);
}

function drawReelsLogo(ctx: CanvasRenderingContext2D) {
  drawAnalyseLogo(ctx, 62, 58, 0.78);
}

function drawReelsCaption(ctx: CanvasRenderingContext2D, text: string) {
  const fit = fitFontSize(ctx, text, 910, 4, 50, 32);
  const lineHeight = fit.size + 12;
  const boxHeight = fit.lines.length * lineHeight + 60;
  const y = 1920 - boxHeight - 95;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.30)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  drawRoundRect(ctx, 55, y, 970, boxHeight, 28);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020617";
  ctx.font = `900 ${fit.size}px Arial`;
  fit.lines.forEach((line, index) => {
    ctx.fillText(line, 92, y + 58 + index * lineHeight);
  });

  ctx.fillStyle = "#facc15";
  drawRoundRect(ctx, 92, y + boxHeight - 19, 210, 8, 5);
  ctx.fill();
  ctx.restore();
}


function drawReelsSafeCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, elapsed: number, imageIndex = 0) {
  // Fundo preenchido para não sobrar borda
  const bgScale = Math.max(1080 / img.width, 1920 / img.height) * 1.08;
  const bgW = img.width * bgScale;
  const bgH = img.height * bgScale;

  ctx.save();
  ctx.filter = "blur(22px)";
  ctx.globalAlpha = 0.70;
  ctx.drawImage(img, (1080 - bgW) / 2, (1920 - bgH) / 2, bgW, bgH);
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.fillRect(0, 0, 1080, 1920);

  const safeX = 34;
  const safeY = 170;
  const safeW = 1012;
  const safeH = 1235;

  // Zoom-in contínuo focado no assunto principal.
  // Começa aberto e aproxima sem sair de foco.
  const progress = Math.max(0, Math.min(1, elapsed / 30));
  const zoom = 1.00 + progress * 0.18;

  const baseScale = Math.max(safeW / img.width, safeH / img.height);
  const scale = baseScale * zoom;
  const w = img.width * scale;
  const h = img.height * scale;

  // Foco central levemente acima do meio, melhor para rosto/jogador/matéria.
  const focusX = img.width * 0.50;
  const focusY = img.height * 0.43;

  let x = safeX + safeW / 2 - focusX * scale;
  let y = safeY + safeH / 2 - focusY * scale;

  x = Math.min(safeX, Math.max(safeX + safeW - w, x));
  y = Math.min(safeY, Math.max(safeY + safeH - h, y));

  ctx.save();
  drawRoundRect(ctx, safeX, safeY, safeW, safeH, 34);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);

  const shade = ctx.createLinearGradient(0, safeY, 0, safeY + safeH);
  shade.addColorStop(0, "rgba(0,0,0,0.06)");
  shade.addColorStop(0.70, "rgba(0,0,0,0.03)");
  shade.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = shade;
  ctx.fillRect(safeX, safeY, safeW, safeH);
  ctx.restore();
}

function drawReelsSafeCaption(ctx: CanvasRenderingContext2D, text: string) {
  const fit = fitFontSize(ctx, text, 870, 4, 46, 30);
  const lineHeight = fit.size + 11;
  const boxHeight = fit.lines.length * lineHeight + 56;

  // Sobe a legenda para não bater nos botões do Instagram
  const y = 1455;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  drawRoundRect(ctx, 80, y, 920, boxHeight, 28);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020617";
  ctx.font = `900 ${fit.size}px Arial`;
  fit.lines.forEach((line, index) => {
    ctx.fillText(line, 116, y + 54 + index * lineHeight);
  });

  ctx.fillStyle = "#facc15";
  drawRoundRect(ctx, 116, y + boxHeight - 18, 190, 7, 5);
  ctx.fill();
  ctx.restore();
}

function drawReelsSafeLogo(ctx: CanvasRenderingContext2D) {
  // Topo dentro da safe area, sem encostar nas bordas
  drawAnalyseLogo(ctx, 72, 76, 0.72);
}

async function generateReelsVideo(project: InstagramProject, onProgress: (value: string) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  const imgs = await loadImages(getProjectImages(project));

  const stream = canvas.captureStream(30);
  let audioContext: AudioContext | null = null;
  try {
    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const gain = audioContext.createGain();
    gain.gain.value = 0.018;
    gain.connect(destination);

    const now = audioContext.currentTime;
    for (let i = 0; i < 30; i += 0.5) {
      const osc = audioContext.createOscillator();
      const localGain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = i % 2 === 0 ? 110 : 146.83;
      localGain.gain.setValueAtTime(0.0001, now + i);
      localGain.gain.exponentialRampToValueAtTime(0.18, now + i + 0.03);
      localGain.gain.exponentialRampToValueAtTime(0.0001, now + i + 0.35);
      osc.connect(localGain);
      localGain.connect(gain);
      osc.start(now + i);
      osc.stop(now + i + 0.4);
    }
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  } catch {
    audioContext = null;
  }

  const chunks: Blob[] = [];
  const mp4Type = "video/mp4;codecs=avc1.42E01E,mp4a.40.2";
  const mp4Basic = "video/mp4";
  const mimeType = MediaRecorder.isTypeSupported(mp4Type)
    ? mp4Type
    : MediaRecorder.isTypeSupported(mp4Basic)
      ? mp4Basic
      : "";

  if (!mimeType) {
    throw new Error("Este navegador não exporta MP4 direto. Abra no Chrome/Edge atualizado no computador e tente novamente.");
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

  const drawFrame = (elapsed: number) => {
    const slide = project.slides.find((item) => elapsed >= item.start && elapsed < item.end) || project.slides[project.slides.length - 1];

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, 1080, 1920);

    if (imgs.length) {
      const imageIndex = Math.min(imgs.length - 1, Math.floor(elapsed / Math.max(1, 30 / imgs.length)));
      drawReelsSafeCover(ctx, imgs[imageIndex], elapsed, imageIndex);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
      gradient.addColorStop(0, "#111827");
      gradient.addColorStop(1, "#020617");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);
    }

    drawReelsSafeLogo(ctx);

    const caption = elapsed < 5 ? project.title : slide.caption;
    drawReelsSafeCaption(ctx, caption);
  };

  return await new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Falha ao gravar vídeo."));
    recorder.onstop = () => {
      audioContext?.close().catch(() => undefined);
      resolve(new Blob(chunks, { type: "video/mp4" }));
    };

    recorder.start();
    const started = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - started) / 1000;
      drawFrame(elapsed);
      onProgress(`Gerando vídeo: ${Math.min(30, elapsed).toFixed(1)}s / 30s`);
      if (elapsed < 30) requestAnimationFrame(loop);
      else recorder.stop();
    };
    loop();
  });
}

export default function AdminInstagram() {
  const currentUser = getCurrentUser();
  const isAdmin = isAdminUser(currentUser);
  const [projects, setProjects] = useState<InstagramProject[]>([]);
  const [selected, setSelected] = useState<InstagramProject | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [rendering, setRendering] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewProjectId, setPreviewProjectId] = useState("");

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const data = await fetchInstagramProjects();
      setProjects(data.projects || []);
      setSelected((current) => current || data.projects?.[0] || null);
      setUpdatedAt(data.updatedAt);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    setLoading(true);
    try {
      await runInstagramRobot();
      await load();
      setNotice("Robô Instagram executado com sucesso.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Erro ao executar.");
      setLoading(false);
    }
  }

  async function setStatus(status: InstagramProject["status"]) {
    if (!selected) return;
    const updated = await updateInstagramProjectStatus(selected.id, status);
    setSelected(updated);
    setProjects((items) => items.map((item) => item.id === updated.id ? updated : item));
  }

  function exportJson(project: InstagramProject) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.id}-reels-30s.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function previewVideo(project: InstagramProject) {
    setRendering("Gerando prévia...");
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blob = await generateReelsVideo(project, setRendering);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewProjectId(project.id);
      setRendering("");
      setNotice("Prévia gerada. Assista antes de aprovar/publicar.");
    } catch (err) {
      setRendering("");
      setNotice(err instanceof Error ? err.message : "Erro ao gerar prévia.");
    }
  }

  async function downloadVideo(project: InstagramProject) {
    try {
      let url = previewUrl;
      if (!url || previewProjectId !== project.id) {
        setRendering("Gerando vídeo para download...");
        const blob = await generateReelsVideo(project, setRendering);
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewProjectId(project.id);
        setRendering("");
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.id}-reels-30s.mp4`;
      link.click();
      setNotice("Vídeo baixado em MP4 1080x1920 pronto para testar no Instagram.");
    } catch (err) {
      setRendering("");
      setNotice(err instanceof Error ? err.message : "Erro ao baixar vídeo.");
    }
  }

  function regenerateSelected() {
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewProjectId("");
    setNotice("Prévia limpa. Clique em Assistir prévia para gerar novamente.");
  }

  useEffect(() => {
    if (isAdmin) load();
    else {
      setLoading(false);
      setNotice("Faça login como administrador.");
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!selected || previewProjectId === selected.id) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewProjectId("");
  }, [selected?.id]);

  const totals = useMemo(() => ({
    pending: projects.filter((item) => item.status === "pending").length,
    approved: projects.filter((item) => item.status === "approved").length,
    published: projects.filter((item) => item.status === "published").length,
  }), [projects]);

  return (
    <PremiumAppShell>
      <div className="space-y-5">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">Privado Admin</p>
              <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Robô Instagram PRO+</h1>
              <p className="mt-3 max-w-3xl text-slate-300">
                Gera Reels 30s em MP4 no formato Instagram 9:16 com zoom-in contínuo focado na matéria principal, logo no topo e legenda branca embaixo.
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">Atualizado: {brDate(updatedAt)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={load} disabled={!isAdmin} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10 disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> Atualizar
              </button>
              <button onClick={runNow} disabled={!isAdmin} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300 disabled:opacity-50">
                <Play className="h-4 w-4" /> Gerar agora
              </button>
            </div>
          </div>
        </GlassCard>

        {notice ? <GlassCard className="p-4 text-sm font-bold text-yellow-200">{notice}</GlassCard> : null}
        {rendering ? <GlassCard className="p-4 text-sm font-black text-green-200">{rendering}</GlassCard> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Film />} label="Projetos" value={projects.length} />
          <Metric icon={<Sparkles />} label="Pendentes" value={totals.pending} />
          <Metric icon={<ShieldCheck />} label="Aprovados" value={totals.approved} />
          <Metric icon={<Music />} label="Publicados" value={totals.published} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-white/10 p-4">
              <h2 className="text-xl font-black text-white">Posts pendentes</h2>
            </div>
            <div className="max-h-[720px] divide-y divide-white/10 overflow-auto">
              {loading ? <p className="p-5 font-bold text-slate-400">Carregando...</p> : null}
              {!loading && !projects.length ? <p className="p-5 font-bold text-slate-400">Nenhum projeto gerado.</p> : null}
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelected(project)}
                  className={`block w-full p-4 text-left hover:bg-white/[0.04] ${selected?.id === project.id ? "bg-yellow-400/10" : ""}`}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">{templateLabel(project.template)} · {statusLabel(project.status)}</p>
                  <h3 className="mt-2 line-clamp-2 font-black text-white">{project.title}</h3>
                  <p className="mt-2 text-xs font-bold text-slate-500">{project.source || "Robô Notícias"} · {project.duration}s</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {selected ? (
            <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
              <GlassCard className="space-y-4 p-4">
                {previewUrl && previewProjectId === selected.id ? (
                  <video src={previewUrl} controls className="aspect-[9/16] w-full rounded-3xl border border-yellow-400/20 bg-black object-cover" />
                ) : (
                  <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-yellow-400/20 bg-black">
                    {getProjectImageUrl(selected) ? <img src={getProjectImageUrl(selected)} className="absolute inset-0 h-full w-full object-cover opacity-100" /> : null}
                    <div className="absolute left-5 top-5 text-xs font-black text-yellow-300 drop-shadow-lg">ANALYSE PRO 2.0</div>
                    <div className="absolute inset-x-5 bottom-8">
                      <div className="rounded-3xl bg-white/95 p-4">
                        <h2 className="text-2xl font-black leading-tight text-slate-950">{selected.title}</h2>
                        <p className="mt-2 text-sm font-black text-yellow-600">Reels 9:16 com área segura</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <button onClick={() => previewVideo(selected)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 font-black text-black hover:bg-yellow-300">
                    <Eye className="h-4 w-4" /> Assistir prévia
                  </button>
                  <button onClick={() => downloadVideo(selected)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-black text-white hover:bg-white/10">
                    <Download className="h-4 w-4" /> Baixar vídeo
                  </button>
                  <button onClick={regenerateSelected} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-black text-white hover:bg-white/10">
                    <RotateCcw className="h-4 w-4" /> Gerar novamente
                  </button>
                </div>
              </GlassCard>

              <div className="space-y-5">
                <GlassCard className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">{templateLabel(selected.template)}</p>
                      <h2 className="mt-2 text-2xl font-black text-white">{selected.title}</h2>
                      <p className="mt-2 text-sm font-bold text-slate-400">{selected.backgroundMusic.note}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-400">
                        <ImageIcon className="h-4 w-4" /> {getProjectImageUrl(selected) ? "Imagem da notícia aplicada" : "Sem imagem da notícia; usando template Analyse Pro"}
                      </p>
                    </div>
                    <button onClick={() => exportJson(selected)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-black text-white hover:bg-white/10">
                      <Download className="h-4 w-4" /> Exportar roteiro
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => setStatus("pending")} className="rounded-xl border border-white/10 px-4 py-2 font-black text-slate-300 hover:bg-white/10">Pendente</button>
                    <button onClick={() => setStatus("approved")} className="rounded-xl bg-green-500/20 px-4 py-2 font-black text-green-200 hover:bg-green-500/30">Aprovar</button>
                    <button onClick={() => setStatus("published")} disabled={selected.status !== "approved"} className="rounded-xl bg-yellow-400 px-4 py-2 font-black text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">Publicado</button>
                    <button onClick={() => setStatus("pending")} className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 font-black text-red-200 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /> Reprovar</button>
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <h3 className="text-xl font-black text-white">Timeline do Reels</h3>
                  <div className="mt-4 space-y-3">
                    {selected.slides.map((slide) => (
                      <div key={slide.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs font-black text-yellow-300">{slide.start}s — {slide.end}s</p>
                        <h4 className="mt-1 font-black text-white">{slide.headline}</h4>
                        <p className="mt-1 text-sm font-bold text-slate-300">{slide.caption}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <h3 className="text-xl font-black text-white">Legenda para postar</h3>
                  <p className="mt-3 whitespace-pre-line rounded-2xl bg-black/30 p-4 text-sm font-bold text-slate-200">
                    {selected.title}{"\n\n"}{selected.slides[1]?.caption}{"\n\n"}{selected.hashtags.join(" ")}
                  </p>
                </GlassCard>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </PremiumAppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <GlassCard className="p-5">
      <div className="text-yellow-300">{icon}</div>
      <p className="mt-3 text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-4xl font-black text-white">{value}</p>
    </GlassCard>
  );
}
