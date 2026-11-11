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
	server.js
	.env.example
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
