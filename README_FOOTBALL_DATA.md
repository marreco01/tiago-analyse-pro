# TIAGO ANALYSE PRO — Football-Data.org

Esta versão troca a base principal de dados para Football-Data.org.

## Configuração

Crie/edite `.env.local` na raiz do projeto:

```env
FOOTBALL_DATA_API_KEY=sua_chave_nova_football_data_org
TAVILY_API_KEY=sua_chave_tavily_opcional
OPENAI_API_KEY=
```

## Rodar

```bash
npm install
npm run dev
```

## O que mudou

- Football-Data.org virou a fonte principal de últimos jogos e confrontos.
- Tavily ficou apenas para contexto/notícias, se configurado.
- SofaScore não é mais usado como motor principal.
- Escanteios e cartões ficam N/D quando a API não fornecer dado estruturado confiável.
- O painel agora usa indicadores estatísticos neutros, sem recomendações de aposta.

## Observação importante

A Football-Data.org pode limitar competições conforme o plano da sua chave. Se um campeonato/time não estiver disponível na conta, o painel mostra N/D em vez de inventar dados.
