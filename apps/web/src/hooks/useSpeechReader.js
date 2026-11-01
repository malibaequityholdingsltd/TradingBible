import { useCallback, useEffect, useRef, useState } from 'react';

const BCP47 = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-PT',
  ar: 'ar-SA',
  zh: 'zh-CN',
  hi: 'hi-IN',
};

function speechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;
}

// SpeechSynthesis on Chrome/Safari can drop long utterances. Feed it short
// sentence-sized chunks and queue the next one from onend instead.
function chunkText(text, max = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?。！？؟।]+[.!?。！？؟।]+(?:["'”’)]*)?|[^.!?。！？؟।]+$/g) || [clean];
  const chunks = [];
  let current = '';
  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length > max) {
      push();
      for (const word of sentence.split(/\s+/)) {
        if (current && current.length + 1 + word.length > max) push();
        current = current ? `${current} ${word}` : word;
      }
      continue;
    }
    if (current && current.length + 1 + sentence.length > max) push();
    current = current ? `${current} ${sentence}` : sentence;
  }
  push();
  return chunks;
}

export function speechLang(lang) {
  return BCP47[lang] || BCP47.en;
}

const VOICE_KEY = 'tb.academy.voice';
const RATE_KEY = 'tb.academy.rate';

function stored(key, fallback = '') {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* localStorage can be unavailable in private mode */
  }
}

function initialRate() {
  const value = Number(stored(RATE_KEY, '1'));
  return Number.isFinite(value) && value >= 0.5 && value <= 2 ? value : 1;
}

export default function useSpeechReader() {
  const [supported] = useState(speechSupported);
  const [status, setStatus] = useState('idle'); // idle | playing | paused | ended | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState(() => stored(VOICE_KEY, ''));
  const [rate, setRateState] = useState(initialRate);

  const chunksRef = useRef([]);
  const indexRef = useRef(0);
  const cancelledRef = useRef(false);
  const sessionRef = useRef(0);
  const timerRef = useRef(null);
  const utteranceRef = useRef(null);
  const rateRef = useRef(rate);
  const langRef = useRef('en-US');
  const voicesRef = useRef([]);
  const voiceRef = useRef(voiceURI);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const load = () => {
      const next = synth.getVoices?.() || [];
      voicesRef.current = next;
      setVoices(next);
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
    // Safari populates voices asynchronously without always firing the event.
    const retry = window.setTimeout(load, 350);
    return () => {
      synth.removeEventListener?.('voiceschanged', load);
      window.clearTimeout(retry);
    };
  }, [supported]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const speakAt = useCallback((index) => {
    if (!supported || cancelledRef.current) return;
    const session = sessionRef.current;
    const chunks = chunksRef.current;
    if (index >= chunks.length) {
      indexRef.current = chunks.length;
      setProgress(100);
      setStatus('ended');
      return;
    }
    indexRef.current = index;
    setProgress(Math.round((index / chunks.length) * 100));

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = langRef.current;
    utterance.rate = rateRef.current;
    const prefix = langRef.current.toLowerCase().split('-')[0];
    const selected = voiceRef.current
      ? voicesRef.current.find((item) => item.voiceURI === voiceRef.current)
      : null;
    const voice = selected && selected.lang?.toLowerCase().startsWith(prefix)
      ? selected
      : voicesRef.current.find((item) => item.lang?.toLowerCase().startsWith(prefix));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (cancelledRef.current || session !== sessionRef.current) return;
      const next = index + 1;
      indexRef.current = next;
      setProgress(Math.round((next / chunks.length) * 100));
      if (next >= chunks.length) {
        setStatus('ended');
        return;
      }
      timerRef.current = window.setTimeout(() => speakAt(next), 50);
    };
    utterance.onerror = (event) => {
      if (cancelledRef.current || session !== sessionRef.current || event.error === 'canceled' || event.error === 'interrupted') return;
      setError(event.error === 'not-allowed'
        ? 'Your browser blocked audio. Tap Listen again to allow it.'
        : 'The voice could not finish this lesson. Try a different voice or browser.');
      setStatus('error');
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    sessionRef.current += 1;
    clearTimer();
    if (supported) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    chunksRef.current = [];
    indexRef.current = 0;
    setStatus('idle');
    setProgress(0);
    setError('');
  }, [clearTimer, supported]);

  const start = useCallback((text, lang = 'en') => {
    if (!supported) {
      setError('This browser does not support read-aloud. Try Chrome, Safari, or Edge.');
      setStatus('error');
      return;
    }
    const chunks = chunkText(text);
    if (!chunks.length) {
      setError('There is no lesson text to read yet.');
      setStatus('error');
      return;
    }
    cancelledRef.current = true;
    sessionRef.current += 1;
    clearTimer();
    const synth = window.speechSynthesis;
    // Only cancel if something is actually queued. Calling cancel() and
    // speak() in the same tick makes Chrome drop the new utterance, while
    // delaying speak() breaks iOS Safari's user-gesture requirement.
    if (synth.speaking || synth.pending || synth.paused) synth.cancel();
    cancelledRef.current = false;
    chunksRef.current = chunks;
    indexRef.current = 0;
    langRef.current = speechLang(lang);
    setError('');
    setProgress(0);
    setStatus('playing');
    speakAt(0);
  }, [clearTimer, speakAt, supported]);

  const pause = useCallback(() => {
    if (!supported || status !== 'playing') return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [status, supported]);

  const resume = useCallback(() => {
    if (!supported || status !== 'paused') return;
    window.speechSynthesis.resume();
    setStatus('playing');
  }, [status, supported]);

  const setRate = useCallback((next) => {
    const value = Number(next) || 1;
    rateRef.current = value;
    setRateState(value);
    store(RATE_KEY, value);
  }, []);

  const setVoice = useCallback((next) => {
    const value = String(next || '');
    voiceRef.current = value;
    setVoiceURI(value);
    store(VOICE_KEY, value);
  }, []);

  const preview = useCallback((text, lang = 'en', selectedVoice = voiceRef.current) => {
    if (!supported) return;
    const clean = String(text || '').trim();
    if (!clean) return;
    const synth = window.speechSynthesis;
    // Chrome drops a new utterance if cancel() and speak() happen in the same
    // tick with nothing queued. Only cancel when something is actually active.
    if (synth.speaking || synth.pending || synth.paused) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = speechLang(lang);
    utterance.rate = rateRef.current;
    const voice = voicesRef.current.find((item) => item.voiceURI === selectedVoice)
      || voicesRef.current.find((item) => item.lang?.toLowerCase().startsWith(lang.toLowerCase()));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }, [supported]);

  useEffect(() => () => {
    cancelledRef.current = true;
    sessionRef.current += 1;
    clearTimer();
    if (speechSupported()) window.speechSynthesis.cancel();
  }, [clearTimer]);

  return {
    supported,
    status,
    progress,
    error,
    voices,
    voiceURI,
    setVoice,
    rate,
    setRate,
    preview,
    start,
    pause,
    resume,
    stop,
  };
}
