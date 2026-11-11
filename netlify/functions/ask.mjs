import { answerTranscript, RequestError } from '../../server/assistant-core.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Método não permitido.' },
      { status: 405, headers: { Allow: 'POST' } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'O corpo da requisição deve ser JSON válido.' }, { status: 400 });
  }

  try {
    return Response.json(await answerTranscript(body?.transcript));
  } catch (error) {
    if (!(error instanceof RequestError)) console.error('Erro na função ask:', error);
    const status = error.status || 500;
    const message = error.status ? error.message : 'Não foi possível processar sua pergunta agora.';
    return Response.json({ error: message }, { status });
  }
};