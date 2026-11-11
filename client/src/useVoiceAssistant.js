import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : '');

export function useVoiceAssistant() {
  const [assistantState, setAssistantState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [replyText, setReplyText] = useState('');
  const [mediaData, setMediaData] = useState(null);
  const [error, setError] = useState('');
  const [speaker, setSpeaker] = useState('rick');
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const latestTranscriptRef = useRef('');
  const shouldSubmitRecognitionRef = useRef(true);

  const speak = (text) => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setAssistantState('idle');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    const voiceProfile = speaker === 'rick'
      ? { pitch: 0.78, rate: 0.9 }
      : { pitch: 1.2, rate: 1.12 };
    const portugueseVoice = window.speechSynthesis.getVoices()
      .find((voice) => voice.lang.toLowerCase() === 'pt-br');
    if (portugueseVoice) utterance.voice = portugueseVoice;
    utterance.pitch = voiceProfile.pitch;
    utterance.rate = voiceProfile.rate;
    utterance.onend = () => setAssistantState('idle');
    utterance.onerror = () => setAssistantState('idle');
    setAssistantState('speaking');
    window.speechSynthesis.speak(utterance);
  };

  const askServer = async (spokenText) => {
    setAssistantState('processing');
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: spokenText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao consultar o assistente.');

      setReplyText(data.replyText);
      setMediaData(data.mediaData || null);
      speak(data.replyText);
    } catch (requestError) {
      const message = requestError.message || 'Não foi possível conectar ao servidor.';
      setError(message);
      setReplyText(message);
      speak(message);
    }
  };

  const askQuestion = async (question) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    shouldSubmitRecognitionRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setTranscript(trimmedQuestion);
    latestTranscriptRef.current = trimmedQuestion;
    finalTranscriptRef.current = trimmedQuestion;
    await askServer(trimmedQuestion);
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Reconhecimento de voz indisponível neste navegador.');
      return;
    }

    window.speechSynthesis?.cancel();
    setError('');
    setReplyText('');
    setMediaData(null);
    setTranscript('');
    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    shouldSubmitRecognitionRef.current = true;

    const recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalTranscriptRef.current += `${phrase} `;
        else interim += phrase;
      }
      const currentTranscript = `${finalTranscriptRef.current}${interim}`.trim();
      latestTranscriptRef.current = currentTranscript;
      setTranscript(currentTranscript);
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('O microfone não conseguiu captar sua voz. Verifique a permissão do navegador.');
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      const spokenText = (finalTranscriptRef.current || latestTranscriptRef.current).trim();
      if (shouldSubmitRecognitionRef.current && spokenText) askServer(spokenText);
      else setAssistantState('idle');
      shouldSubmitRecognitionRef.current = true;
    };

    recognitionRef.current = recognition;
    setAssistantState('listening');
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setAssistantState('idle');
      setError('Não foi possível iniciar o microfone. Tente novamente.');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  return {
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
  };
}