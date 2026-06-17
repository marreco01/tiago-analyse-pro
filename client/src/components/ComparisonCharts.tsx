import {
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";

interface TeamStats {
  name: string;
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  corners: number;
  fouls: number;
  xG?: number;
  xGA?: number;
}

interface ComparisonChartsProps {
  teamA: TeamStats;
  teamB: TeamStats;
}

const COLORS = ["#22c55e", "#3b82f6"];

export function ComparisonCharts({ teamA, teamB }: ComparisonChartsProps) {
  // Dados para gráfico de barras
  const barData = [
    {
      stat: "Posse",
      [teamA.name]: teamA.possession || 0,
      [teamB.name]: teamB.possession || 0,
    },
    {
      stat: "Chutes",
      [teamA.name]: teamA.shots || 0,
      [teamB.name]: teamB.shots || 0,
    },
    {
      stat: "Chutes no Alvo",
      [teamA.name]: teamA.shotsOnTarget || 0,
      [teamB.name]: teamB.shotsOnTarget || 0,
    },
    {
      stat: "Passes",
      [teamA.name]: (teamA.passes || 0) / 10, // Normalizar para escala
      [teamB.name]: (teamB.passes || 0) / 10,
    },
    {
      stat: "Escanteios",
      [teamA.name]: teamA.corners || 0,
      [teamB.name]: teamB.corners || 0,
    },
    {
      stat: "Faltas",
      [teamA.name]: teamA.fouls || 0,
      [teamB.name]: teamB.fouls || 0,
    },
  ];

  // Dados para radar chart
  const radarData = [
    {
      stat: "Posse",
      [teamA.name]: teamA.possession || 0,
      [teamB.name]: teamB.possession || 0,
      fullMark: 100,
    },
    {
      stat: "Chutes",
      [teamA.name]: Math.min((teamA.shots || 0) * 5, 100),
      [teamB.name]: Math.min((teamB.shots || 0) * 5, 100),
      fullMark: 100,
    },
    {
      stat: "Precisão",
      [teamA.name]: teamA.shots ? ((teamA.shotsOnTarget || 0) / teamA.shots) * 100 : 0,
      [teamB.name]: teamB.shots ? ((teamB.shotsOnTarget || 0) / teamB.shots) * 100 : 0,
      fullMark: 100,
    },
    {
      stat: "Passes",
      [teamA.name]: Math.min((teamA.passes || 0) / 5, 100),
      [teamB.name]: Math.min((teamB.passes || 0) / 5, 100),
      fullMark: 100,
    },
    {
      stat: "Escanteios",
      [teamA.name]: Math.min((teamA.corners || 0) * 10, 100),
      [teamB.name]: Math.min((teamB.corners || 0) * 10, 100),
      fullMark: 100,
    },
    {
      stat: "Disciplina",
      [teamA.name]: Math.max(100 - (teamA.fouls || 0) * 5, 0),
      [teamB.name]: Math.max(100 - (teamB.fouls || 0) * 5, 0),
      fullMark: 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Gráfico de Barras Comparativo */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4">Comparação de Estatísticas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="stat" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            />
            <Legend />
            <Bar dataKey={teamA.name} fill={COLORS[0]} />
            <Bar dataKey={teamB.name} fill={COLORS[1]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Radar Chart */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4">Análise Comparativa Detalhada</h3>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="stat" stroke="rgba(255,255,255,0.5)" />
            <PolarRadiusAxis stroke="rgba(255,255,255,0.3)" />
            <Radar
              name={teamA.name}
              dataKey={teamA.name}
              stroke={COLORS[0]}
              fill={COLORS[0]}
              fillOpacity={0.25}
            />
            <Radar
              name={teamB.name}
              dataKey={teamB.name}
              stroke={COLORS[1]}
              fill={COLORS[1]}
              fillOpacity={0.25}
            />
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Eficiência */}
      {teamA.xG !== undefined && teamB.xG !== undefined && (
        <Card className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4">Eficiência Ofensiva (xG)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                {
                  metric: "xG",
                  [teamA.name]: teamA.xG || 0,
                  [teamB.name]: teamB.xG || 0,
                },
                {
                  metric: "xGA",
                  [teamA.name]: teamA.xGA || 0,
                  [teamB.name]: teamB.xGA || 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="metric" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              />
              <Legend />
              <Bar dataKey={teamA.name} fill={COLORS[0]} />
              <Bar dataKey={teamB.name} fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
