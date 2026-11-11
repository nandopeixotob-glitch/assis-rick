# assis-rick

Assistente de voz para consultar personagens, locais e episódios de Rick and Morty.

## Estrutura

```text
client/
	src/App.jsx
	src/main.jsx
	src/styles.css
	src/useVoiceAssistant.js
server/
	assistant-core.js
	server.js
	.env.example
netlify/
	functions/ask.mjs
netlify.toml
```

## Executar

Requer Node.js 18 ou superior. Instale as dependências e configure a chave da OpenAI:

```bash
npm install --prefix server
cp server/.env.example server/.env
# Edite server/.env e informe OPENAI_API_KEY
npm install --prefix client
```

Em terminais separados, inicie a API e o frontend:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

O frontend fica em `http://localhost:5173` e a API em `http://localhost:3001`.
O reconhecimento de voz depende de um navegador com suporte à Web Speech API e permissão para usar o microfone.

## Deploy na Netlify

Conecte este repositório à Netlify usando a raiz do projeto. O `netlify.toml` já configura o build e publica `client/dist`; a rota `/api/ask` é encaminhada à função serverless.

No painel do site, cadastre `OPENAI_API_KEY` em **Site configuration > Environment variables** e faça o deploy. `OPENAI_MODEL` é opcional. Em produção, o frontend usa a rota da própria origem e não precisa de `VITE_API_URL`.
