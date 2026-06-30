# Ajuste SofaScore - TIAGO ANALYSE PRO

Esta versão separa as fontes corretamente:

- SofaScore: últimos jogos reais dos dois times, placares e forma recente.
- Tavily: notícias, contexto e fontes públicas complementares.
- IA/OpenAI: apenas resumo textual. A IA não altera placares/estatísticas estruturadas.

Arquivos principais alterados:

- server/sofascore.ts
- server/public-web-analyze.ts
- client/src/pages/Analyze.tsx

Observação: o SofaScore pode bloquear requisições em alguns ambientes. Se isso acontecer, o sistema mostra aviso e não inventa últimos jogos.

Para rodar:

```bash
npm install
npm run dev
```

Para melhorar contexto/notícias, coloque sua chave Tavily nova em `.env.local`:

```env
TAVILY_API_KEY=sua_chave_nova
```
