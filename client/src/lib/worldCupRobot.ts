export async function fetchWorldCupRobot() {
  const response = await fetch("/api/world-cup/robot", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao carregar Robô Copa.");
  return data;
}
export async function fetchWorldCupCompare(home: string, away: string) {
  const params = new URLSearchParams({ home, away });
  const response = await fetch(`/api/world-cup/compare?${params.toString()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || "Erro ao comparar seleções da Copa.");
  return data;
}
