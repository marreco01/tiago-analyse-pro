export async function fetchLiveRobotGames(limit = 10) {
  const response = await fetch(`/api/live-robot/games?limit=${limit}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Ao Vivo.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    games: any[];
    notice?: string;
  };
}


export async function refreshLiveRobotFromApi() {
  // Atualização pública segura: força somente o robô interno multifontes.
  // Não chama API privada nem exige login admin para o botão Atualizar da tela ao vivo.
  const response = await fetch("/api/live-robot/games?limit=10&force=1", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao atualizar Robô Ao Vivo.");
  return data as {
    success: true;
    updatedAt: string;
    source: string;
    games: any[];
    notice?: string;
  };
}
