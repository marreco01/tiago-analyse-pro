import { authHeaders } from "@/lib/localAuth";

export type InstagramSlide = {
  id: string;
  start: number;
  end: number;
  headline: string;
  caption: string;
  position: "top" | "center" | "bottom";
};

export type InstagramProject = {
  id: string;
  newsId: string;
  title: string;
  source?: string;
  url?: string;
  status: "pending" | "approved" | "published";
  format: "reels-1080x1920";
  duration: number;
  brand: "Analyse Pro 2.0";
  template: "breaking" | "analysis" | "injury" | "market";
  backgroundMusic: {
    mode: "royalty-free-placeholder";
    label: string;
    note: string;
  };
  slides: InstagramSlide[];
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
};

export async function fetchInstagramProjects() {
  const response = await fetch("/api/admin/instagram/projects", {
    cache: "no-store",
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Instagram.");
  return data.data as { updatedAt: string; projects: InstagramProject[] };
}

export async function runInstagramRobot() {
  const response = await fetch("/api/admin/robots/instagram/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao executar Robô Instagram.");
  return data;
}

export async function updateInstagramProjectStatus(id: string, status: "pending" | "approved" | "published") {
  const response = await fetch(`/api/admin/instagram/projects/${id}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao atualizar status.");
  return data.project as InstagramProject;
}
