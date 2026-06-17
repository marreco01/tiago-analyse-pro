import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "server", "data", "worldcup-last10-all-competitions.json");

export function getWorldCupLast10Database() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

export function getWorldCupTeamLast10(teamName: string) {
  const db = getWorldCupLast10Database();
  return db.teams.find((team: any) => team.team.toLowerCase() === teamName.toLowerCase()) || null;
}
