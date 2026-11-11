import { useState } from 'react';
import { useVoiceAssistant } from './useVoiceAssistant.js';

const stateLabels = {
  idle: 'Pronto para ouvir',
  listening: 'Estou ouvindo',
  processing: 'Consultando o multiverso',
  speaking: 'Resposta em andamento',
};

function MediaCard({ data }) {
  if (!data) return null;

  const isCharacter = Boolean(data.image);
  const category = isCharacter ? 'PERSONAGEM' : data.dimension ? 'LOCAL' : 'EPISÓDIO';
  const detail = isCharacter
    ? `${data.species || 'Espécie desconhecida'}${data.status ? ` · ${data.status}` : ''}`
    : data.dimension
      ? data.dimension
      : `${data.episode || ''}${data.air_date ? ` · ${data.air_date}` : ''}`;

  return (
    <article className="media-card">
      {isCharacter ? (
        <img className="media-image" src={data.image} alt={`Imagem de ${data.name}`} />
      ) : (
        <div className="media-image media-placeholder" aria-hidden="true">
          <span>{data.dimension ? '⌖' : '◷'}</span>
        </div>
      )}
      <div className="media-copy">
        <span className="eyebrow">{category} // ARQUIVO ENCONTRADO</span>
        <h2>{data.name}</h2>
        <p>{detail}</p>
        {data.origin?.name && <p className="media-extra">Origem: {data.origin.name}</p>}
        {data.location?.name && <p className="media-extra">Localização: {data.location.name}</p>}
        {data.type && <p className="media-extra">Tipo: {data.type}</p>}
        {data.residents && <p className="media-extra">Habitantes: {data.residents.length}</p>}
      </div>
    </article>
  );
}

export default function App() {
  const [question, setQuestion] = useState('');
  const {
    assistantState,
    transcript,
    replyText,
    mediaData,
    error,
    speaker,
    setSpeaker,
    startListening,
    stopListening,
    askQuestion,
  } = useVoiceAssistant();

  const toggleListening = () => {
    if (assistantState === 'listening') stopListening();
    else if (assistantState === 'idle') startListening();
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    const submittedQuestion = question.trim();
    if (!submittedQuestion) return;
    setQuestion('');
    await askQuestion(submittedQuestion);
  };

  return (
    <main className="app-shell min-h-screen">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Rick, início">R<span>•</span>M</a>
        <div className="connection"><span className="connection-dot" /> C-137 // CONECTADO</div>
      </header>

      <section className="assistant-panel" aria-labelledby="page-title">
        <div className="title-block">
          <p className="eyebrow">TERMINAL DE CONSULTA INTERDIMENSIONAL</p>
          <h1 id="page-title">Fale, mortal.</h1>
          <p className="subtitle">Personagens, lugares e episódios. Sem papo furado.</p>
        </div>

        <div className={`voice-orbit state-${assistantState}`}>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <button
            className="voice-button"
            type="button"
            onClick={toggleListening}
            disabled={assistantState === 'processing' || assistantState === 'speaking'}
            aria-label={assistantState === 'listening' ? 'Parar de ouvir' : 'Começar a falar'}
          >
            <span className="voice-glyph" aria-hidden="true">{assistantState === 'listening' ? '■' : '◖'}</span>
          </button>
        </div>
        <p className="state-label" aria-live="polite">{stateLabels[assistantState]}</p>

        <div className="voice-selector" role="radiogroup" aria-label="Perfil da voz de resposta">
          <button
            type="button"
            role="radio"
            aria-checked={speaker === 'rick'}
            className={speaker === 'rick' ? 'speaker-option selected' : 'speaker-option'}
            onClick={() => setSpeaker('rick')}
          >
            Rick <span>grave</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={speaker === 'morty'}
            className={speaker === 'morty' ? 'speaker-option selected' : 'speaker-option'}
            onClick={() => setSpeaker('morty')}
          >
            Morty <span>aguda</span>
          </button>
        </div>

        <form className="question-form" onSubmit={submitQuestion}>
          <label className="eyebrow" htmlFor="question-input">OU DIGITE SUA PERGUNTA</label>
          <div className="question-controls">
            <input
              id="question-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: Quem é o Morty?"
              maxLength={1000}
              disabled={assistantState === 'processing' || assistantState === 'speaking'}
            />
            <button
              className="ask-button"
              type="submit"
              disabled={!question.trim() || assistantState === 'processing' || assistantState === 'speaking'}
            >
              Perguntar
            </button>
          </div>
        </form>

        <div className="conversation" aria-live="polite">
          <div className="conversation-row">
            <span className="row-index">01</span>
            <div>
              <span className="eyebrow">SUA TRANSMISSÃO</span>
              <p className={transcript ? 'transcript-text' : 'muted-text'}>
                {transcript || (assistantState === 'listening' ? 'Aguardando sua pergunta...' : 'Sua fala aparecerá aqui.')}
              </p>
            </div>
          </div>
          {replyText && (
            <div className="conversation-row reply-row">
              <span className="row-index">02</span>
              <div>
                <span className="eyebrow">RESPOSTA DO RICK</span>
                <p>{replyText}</p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="error-message" role="status">{error}</p>}
        <MediaCard data={mediaData} />
        <p className="privacy-note">ÁUDIO PROCESSADO PELO NAVEGADOR · RESPOSTAS VIA API</p>
      </section>
    </main>
  );
}