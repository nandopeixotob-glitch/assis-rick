import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerTranscript, RequestError } from './assistant-core.js';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem não autorizada pelo CORS.'));
  },
}));
app.use(express.json({ limit: '16kb' }));

app.post('/api/ask', async (request, response) => {
  try {
    response.json(await answerTranscript(request.body?.transcript));
  } catch (error) {
    if (!(error instanceof RequestError)) console.error('Erro em POST /api/ask:', error);
    response.status(error.status || 500).json({
      error: error.status ? error.message : 'Não foi possível processar sua pergunta agora.',
    });
  }
});

app.listen(port, () => {
  console.log(`Assistente disponível em http://localhost:${port}`);
});