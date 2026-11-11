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

export class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function createResponse(payload) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `A OpenAI respondeu com status ${response.status}.`);
  }
  return data;
}

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

export async function answerTranscript(transcript) {
  if (typeof transcript !== 'string' || transcript.trim().length === 0) {
    throw new RequestError('Envie uma transcrição não vazia.', 400);
  }
  if (transcript.length > 1000) {
    throw new RequestError('A transcrição deve ter no máximo 1000 caracteres.', 413);
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new RequestError('OPENAI_API_KEY não está configurada no servidor.', 503);
  }

  let result = await createResponse({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
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
        output = await runTool(call.name, JSON.parse(call.arguments));
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

    result = await createResponse({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: systemPrompt,
      tools,
      input: [...result.output, ...toolOutputs],
    });
  }

  return {
    replyText: result.output_text?.trim() || 'Não consegui formular uma resposta agora. Tente de novo.',
    mediaData,
  };
}