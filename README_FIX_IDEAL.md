# IDEAL ANALYSE PRO - Correções aplicadas

## Correções
- Removido `package-lock.json` com URLs internas que causavam erro de rede no `npm install`.
- Criado `.npmrc` usando `https://registry.npmjs.org/`.
- Fundo da tela de análise alterado para imagem local `client/public/stadium-bg.png`.
- Scripts compatíveis com Windows usando `cross-env`.

## Como rodar
1. Extraia o ZIP.
2. Abra a pasta no VS Code.
3. Rode:

```bash
npm install
npm run dev
```

Se o npm ainda reclamar de rede:
```bash
npm cache clean --force
npm install --registry=https://registry.npmjs.org/ --legacy-peer-deps
```

## Tavily
Crie uma nova chave Tavily e coloque no `.env`:

```env
TAVILY_API_KEY=sua_nova_chave
```
