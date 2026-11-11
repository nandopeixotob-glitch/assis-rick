import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const port = Number(process.env.PORT || 3001);
const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const systemPrompt = [
  'Você é um assistente de voz sobre o universo de Rick and Morty.',
  'Responda sempre em português do Brasil, com humor seco e sarcasmo inspirado em Rick Sanchez, sem imitar falas específicas.',
  'Use frases curtas, naturais para leitura em voz alta. Não use markdown, listas, emojis ou URLs.',
  'Use as ferramentas quando a pergunta pedir informações sobre personagens, locais ou episódios.',
  'Não invente dados. Se uma busca não encontrar resultados, diga isso claramente.',
].join(' ');

const tools = [
  {
    type: 'function',
    name: 'getCharacter',
    description: 'Busca um personagem de Rick and Morty pelo nome.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nome do personagem.' } },
      required: ['name'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'getLocation',
    description: 'Busca um local de Rick and Morty pelo nome.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nome do local.' } },
      required: ['name'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'getEpisode',
    description: 'Busca um episódio pelo número ou pelo nome.',
    parameters: {
      type: 'object',
      properties: { idOrName: { type: 'string', description: 'Número/ID ou nome do episódio.' } },
      required: ['idOrName'],
      additionalProperties: false,
    },
    strict: true,
  },
];

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

async function fetchRickAndMorty(path, params) {
  const url = new URL(`https://rickandmortyapi.com/api/${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `A API de Rick and Morty respondeu com status ${response.status}.`);
  }
  return data;
}

async function runTool(name, args) {
  let data;

  if (name === 'getCharacter') {
    data = await fetchRickAndMorty('character/', { name: args.name });
  } else if (name === 'getLocation') {
    data = await fetchRickAndMorty('location/', { name: args.name });
  } else if (name === 'getEpisode') {
    const query = args.idOrName.trim();
    data = /^\d+$/.test(query)
      ? await fetchRickAndMorty(`episode/${encodeURIComponent(query)}`)
      : await fetchRickAndMorty('episode/', { name: query });
  } else {
    throw new Error(`Ferramenta desconhecida: ${name}`);
  }

  const mediaData = Array.isArray(data.results) ? (data.results[0] || null) : data;
  return { mediaData, results: data.results ? data.results.slice(0, 5) : [data] };
}

app.post('/api/ask', async (request, response) => {
  const transcript = request.body?.transcript;
  if (typeof transcript !== 'string' || transcript.trim().length === 0) {
    response.status(400).json({ error: 'Envie uma transcrição não vazia.' });
    return;
  }
  if (transcript.length > 1000) {
    response.status(413).json({ error: 'A transcrição deve ter no máximo 1000 caracteres.' });
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({ error: 'OPENAI_API_KEY não está configurada no servidor.' });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let result = await openai.responses.create({
      model,
      instructions: systemPrompt,
      input: transcript.trim(),
      tools,
    });
    let mediaData = null;

    for (let turn = 0; turn < 4; turn += 1) {
      const calls = result.output.filter((item) => item.type === 'function_call');
      if (calls.length === 0) break;

      const toolOutputs = [];
      for (const call of calls) {
        let output;
        try {
          const args = JSON.parse(call.arguments);
          output = await runTool(call.name, args);
          if (output.mediaData) mediaData = output.mediaData;
        } catch (error) {
          output = { error: error.message || 'Não foi possível consultar a API.' };
        }
        toolOutputs.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(output),
        });
      }

      result = await openai.responses.create({
        model,
        instructions: systemPrompt,
        tools,
        input: [...result.output, ...toolOutputs],
      });
    }

    response.json({
      replyText: result.output_text?.trim() || 'Não consegui formular uma resposta agora. Tente de novo.',
      mediaData,
    });
  } catch (error) {
    console.error('Erro em POST /api/ask:', error);
    response.status(500).json({ error: 'Não foi possível processar sua pergunta agora.' });
  }
});

app.listen(port, () => {
  console.log(`Assistente disponível em http://localhost:${port}`);
});