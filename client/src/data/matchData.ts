
export type MatchFormItem = {
  id: string;
  result: "V" | "E" | "D";
  home: string;
  away: string;
  score: string;
  league: string;
  date: string;
};

export type UpcomingMatch = {
  id: string;
  date: string;
  time: string;
  league: string;
  home: string;
  away: string;
  market: string;
  confidence: number | null;
  odd: string;
};

function hashText(value: string) {
  return value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function addDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function parseBrazilDateInput(date: string | Date) {
  if (date instanceof Date) return date;

  // Datas vindas dos robôs chegam como YYYY-MM-DD.
  // new Date("YYYY-MM-DD") interpreta como UTC e, no Brasil, pode cair no dia anterior.
  // Aqui forçamos meio-dia local para preservar o dia correto na tela.
  const onlyDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (onlyDate) {
    const [, year, month, day] = onlyDate;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  return new Date(date);
}

export function formatDatePt(date: string | Date) {
  const d = parseBrazilDateInput(date);
  if (Number.isNaN(d.getTime())) return "Data indefinida";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getTeamForm(teamName: string, opponentName?: string): MatchFormItem[] {
  // Dados falsos removidos. A forma recente agora deve vir da API real.
  // Mantido apenas para compatibilidade com telas antigas.
  return [];
}

export function getUpcomingMatches(limit = 12): UpcomingMatch[] {
  // Dados falsos removidos. Próximos jogos agora devem vir de /api/football/upcoming.
  return [];
}
