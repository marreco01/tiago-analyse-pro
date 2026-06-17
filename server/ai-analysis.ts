/**
 * Serviço de análise com IA usando OpenAI GPT
 */

import { invokeLLM } from './_core/llm';

interface MatchAnalysisInput {
  teamA: string;
  teamB: string;
  competition: string;
  statsA: Record<string, any>;
  statsB: Record<string, any>;
  headToHead?: any[];
}

interface AnalysisResult {
  summary: string;
  prediction: string;
  confidence: number;
  strengths: {
    teamA: string[];
    teamB: string[];
  };
  weaknesses: {
    teamA: string[];
    teamB: string[];
  };
  tacticalAnalysis: string;
  marketProbabilities: {
    over15: number;
    over25: number;
    over35: number;
    bothScore: number;
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  likelyScores: Array<{
    score: string;
    probability: number;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  riskDescription: string;
}

/**
 * Gerar análise completa de uma partida usando IA
 */
export async function analyzeMatch(input: MatchAnalysisInput): Promise<AnalysisResult> {
  try {
    const prompt = buildAnalysisPrompt(input);

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `Você é um analista de futebol especializado em análise estatística e previsão de partidas. 
          Forneça análises detalhadas, baseadas em dados, justificando sempre suas conclusões.
          Responda em JSON estruturado conforme solicitado.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'match_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Resumo completo da análise',
              },
              prediction: {
                type: 'string',
                description: 'Previsão principal da partida',
              },
              confidence: {
                type: 'number',
                description: 'Nível de confiança de 0 a 100',
              },
              strengths: {
                type: 'object',
                properties: {
                  teamA: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  teamB: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              weaknesses: {
                type: 'object',
                properties: {
                  teamA: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  teamB: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              tacticalAnalysis: {
                type: 'string',
                description: 'Análise tática detalhada',
              },
              marketProbabilities: {
                type: 'object',
                properties: {
                  over15: { type: 'number' },
                  over25: { type: 'number' },
                  over35: { type: 'number' },
                  bothScore: { type: 'number' },
                  homeWin: { type: 'number' },
                  draw: { type: 'number' },
                  awayWin: { type: 'number' },
                },
              },
              likelyScores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    score: { type: 'string' },
                    probability: { type: 'number' },
                  },
                },
              },
              riskLevel: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
              },
              riskDescription: {
                type: 'string',
              },
            },
            required: [
              'summary',
              'prediction',
              'confidence',
              'strengths',
              'weaknesses',
              'tacticalAnalysis',
              'marketProbabilities',
              'likelyScores',
              'riskLevel',
              'riskDescription',
            ],
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Nenhuma resposta da IA');
    }

    const parsed = JSON.parse(content);
    return parsed as AnalysisResult;
  } catch (error) {
    console.error('Erro ao analisar partida com IA:', error);
    throw error;
  }
}

/**
 * Construir prompt de análise detalhado
 */
function buildAnalysisPrompt(input: MatchAnalysisInput): string {
  const { teamA, teamB, competition, statsA, statsB, headToHead } = input;

  let prompt = `Analise a seguinte partida de futebol:

**PARTIDA:** ${teamA} vs ${teamB}
**COMPETIÇÃO:** ${competition}

**ESTATÍSTICAS ${teamA}:**
${formatStats(statsA)}

**ESTATÍSTICAS ${teamB}:**
${formatStats(statsB)}`;

  if (headToHead && headToHead.length > 0) {
    prompt += `

**CONFRONTOS DIRETOS (últimos 10):**
${headToHead
  .map(
    (m) =>
      `- ${m.homeTeam} ${m.homeGoals}x${m.awayGoals} ${m.awayTeam} (${m.date})`
  )
  .join('\n')}`;
  }

  prompt += `

**ANÁLISE SOLICITADA:**
1. Resumo completo da análise comparativa
2. Previsão principal (vitória, empate ou derrota)
3. Nível de confiança (0-100%)
4. Pontos fortes e fracos de cada time
5. Análise tática detalhada
6. Indicadores estatísticos de gols, forma recente e desempenho
7. Top 5 placares mais prováveis com percentuais
8. Nível de risco (baixo, médio, alto) e justificativa

Sempre justifique suas conclusões com base nos dados fornecidos.`;

  return prompt;
}

/**
 * Formatar estatísticas para o prompt
 */
function formatStats(stats: Record<string, any>): string {
  const lines: string[] = [];

  const mapping: Record<string, string> = {
    possession: 'Posse de Bola',
    shots: 'Chutes',
    shotsOnTarget: 'Chutes no Alvo',
    passes: 'Passes',
    corners: 'Escanteios',
    fouls: 'Faltas',
    yellowCards: 'Cartões Amarelos',
    redCards: 'Cartões Vermelhos',
    xG: 'xG (Gols Esperados)',
    xGA: 'xGA (Gols Esperados Contra)',
    wins: 'Vitórias',
    draws: 'Empates',
    losses: 'Derrotas',
    goalsFor: 'Gols Marcados',
    goalsAgainst: 'Gols Sofridos',
  };

  for (const [key, label] of Object.entries(mapping)) {
    if (stats[key] !== undefined && stats[key] !== null) {
      lines.push(`- ${label}: ${stats[key]}`);
    }
  }

  return lines.join('\n');
}

/**
 * Gerar análise extrema (cruzamento de múltiplos dados)
 */
export async function generateExtremeAnalysis(input: MatchAnalysisInput): Promise<string> {
  try {
    const prompt = `Você é um analista de futebol especializado em análise extrema.
    
Forneça uma análise EXTREMAMENTE DETALHADA da seguinte partida, cruzando:
- Forma recente
- Desempenho em casa/fora
- Confrontos diretos
- xG e estatísticas avançadas
- Escanteios e cartões
- Indicadores de contexto
- Momento das equipes
- Pressão por resultado

**PARTIDA:** ${input.teamA} vs ${input.teamB}
**COMPETIÇÃO:** ${input.competition}

${formatStats(input.statsA)}

${formatStats(input.statsB)}

Forneça uma conclusão extremamente detalhada e justificada.`;

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content:
            'Você é um analista de futebol especializado em análise estatística profunda.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === 'string' ? content : '';
  } catch (error) {
    console.error('Erro ao gerar análise extrema:', error);
    throw error;
  }
}
