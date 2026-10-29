import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Languages, Loader2, Pause, Play, Square } from 'lucide-react';
import { SUPPORTED_LANGS } from '@/lib/i18n';
import { getLessonTranslation } from '@/lib/academy';
import useSpeechReader from '@/hooks/useSpeechReader';

const RATES = [0.8, 1, 1.15, 1.3];

function sentencePart(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return /[.!?。！？؟।:]$/.test(text) ? text : `${text}.`;
}

function plainText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*(.+)$/gm, (_, heading) => `${sentencePart(heading)} `)
    .replace(/^[\s>*+-]+/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lessonSpeechText(content) {
  if (!content) return '';
  const points = Array.isArray(content.keyPoints) ? content.keyPoints : [];
  return [
    content.title,
    content.summary,
    ...points,
    plainText(content.content),
  ].map(sentencePart).filter(Boolean).join(' ');
}

function languageLabel(code) {
  return SUPPORTED_LANGS.find((item) => item.code === code)?.label || 'English';
}

export default function AcademyListen({ pathKey, courseKey, lessonKey, content }) {
  const reader = useSpeechReader();
  const [language, setLanguage] = useState('en');
  const [translated, setTranslated] = useState({});
  const [preparing, setPreparing] = useState(false);
  const [prepSeconds, setPrepSeconds] = useState(0);
  const [translationAttempt, setTranslationAttempt] = useState(0);
  const [translationError, setTranslationError] = useState('');
  const languageRef = useRef('en');
  const mountedRef = useRef(true);

  const activeContent = language === 'en' ? content : translated[language];
  const text = useMemo(() => lessonSpeechText(activeContent || content), [activeContent, content]);
  const words = useMemo(() => (text.match(/\S+/g) || []).length, [text]);
  const minutes = Math.max(1, Math.round(words / 160));
  const label = languageLabel(language);
  const playing = reader.status === 'playing';
  const paused = reader.status === 'paused';
  const finished = reader.status === 'ended';
  const visibleError = translationError || reader.error;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!preparing) {
      setPrepSeconds(0);
      return undefined;
    }
    const timer = window.setInterval(() => setPrepSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [preparing]);

  useEffect(() => {
    reader.stop();
    setTranslated({});
    setLanguage('en');
    languageRef.current = 'en';
    setPreparing(false);
    setTranslationAttempt(0);
    setTranslationError('');
  }, [lessonKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prepare the translation as soon as a language is chosen, never inside
  // the click handler. iOS Safari only allows SpeechSynthesis to start from
  // a user gesture, so the Listen button must call speak() synchronously.
  useEffect(() => {
    if (language === 'en' || translated[language]) return undefined;
    let live = true;
    setPreparing(true);
    setTranslationError('');
    // Debounce so scrolling through the language menu does not queue a
    // translation for every option on a CPU-only SI server.
    const timer = window.setTimeout(() => {
      getLessonTranslation(pathKey, courseKey, lessonKey, language)
        .then((result) => {
          if (!live || !mountedRef.current || languageRef.current !== language) return;
          setTranslated((prev) => ({ ...prev, [language]: result.content }));
        })
        .catch((err) => {
          if (!live || !mountedRef.current || languageRef.current !== language) return;
          setTranslationError(err.message || 'Could not prepare the translated audio.');
        })
        .finally(() => {
          if (live && mountedRef.current && languageRef.current === language) setPreparing(false);
        });
    }, 500);
    return () => { live = false; window.clearTimeout(timer); };
  }, [language, translated, translationAttempt, pathKey, courseKey, lessonKey]);

  const toggle = () => {
    setTranslationError('');
    if (preparing) return;
    if (playing) {
      reader.pause();
      return;
    }
    if (paused) {
      reader.resume();
      return;
    }

    const requested = language;
    const source = activeContent;
    if (requested !== 'en' && !source) {
      // Translation failed or was interrupted. Retry preparation; the next
      // click starts playback synchronously.
      setTranslationAttempt((value) => value + 1);
      return;
    }
    reader.start(lessonSpeechText(source || content), requested);
  };

  const changeLanguage = (event) => {
    const next = event.target.value;
    reader.stop();
    languageRef.current = next;
    setLanguage(next);
    setPreparing(next !== 'en' && !translated[next]);
    setTranslationError('');
  };

  const prepClock = `${Math.floor(prepSeconds / 60)}:${String(prepSeconds % 60).padStart(2, '0')}`;
  const statusTitle = preparing
    ? `Preparing ${label} audio · ${prepClock}`
    : playing
      ? `Reading aloud · ${reader.progress}%`
      : paused
        ? `Paused · ${reader.progress}%`
        : finished
          ? 'Finished · listen again'
          : 'Listen to this lesson';

  const statusSub = preparing
    ? 'The SI translates the lesson once, then saves it for instant replay.'
    : language !== 'en' && !translated[language]
      ? translationError
        ? 'Translation failed. Press Retry translation to try again.'
        : `Preparing the ${label} translation.`
      : language !== 'en'
        ? `Translated audio · about ${minutes} min`
        : `SI voice · about ${minutes} min`;

  return (
    <section className={`ac-listen${playing ? ' is-playing' : ''}`} aria-label="Listen to this lesson">
      <div className="ac-listen-lead">
        <span className="ac-listen-icon"><Headphones className="h-4 w-4" /></span>
        <div>
          <span className="ac-listen-kicker">Listen · SI voice</span>
          <strong className="ac-listen-title" aria-live="polite">{statusTitle}</strong>
          <p className="ac-listen-sub">{statusSub}</p>
        </div>
      </div>

      <div className="ac-listen-actions">
        <label className="ac-listen-select">
          <Languages className="h-3.5 w-3.5" />
          <select value={language} onChange={changeLanguage} aria-label="Audio language">
            {SUPPORTED_LANGS.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="ac-listen-select ac-listen-rate">
          <select
            value={reader.rate}
            onChange={(event) => reader.setRate(event.target.value)}
            aria-label="Reading speed"
          >
            {RATES.map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
          </select>
        </label>
        <button
          type="button"
          className="ac-listen-toggle"
          onClick={toggle}
          disabled={!reader.supported || preparing}
          aria-label={preparing
            ? 'Preparing translated audio'
            : language !== 'en' && !translated[language]
              ? 'Retry translation'
              : playing ? 'Pause reading' : paused ? 'Resume reading' : 'Listen to this lesson'}
        >
          {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {preparing ? 'Preparing…' : language !== 'en' && !translated[language] ? 'Retry translation' : playing ? 'Pause' : paused ? 'Resume' : finished ? 'Listen again' : 'Listen'}
        </button>
        {(playing || paused) && (
          <button type="button" className="ac-listen-stop" onClick={reader.stop} aria-label="Stop reading">
            <Square className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {(playing || paused || finished) && (
        <div className="ac-listen-progress" aria-hidden="true">
          <span style={{ width: `${reader.progress}%` }} />
        </div>
      )}

      {visibleError && <p className="ac-listen-error" role="alert">{visibleError}</p>}
      {!reader.supported && <p className="ac-listen-note">Read-aloud needs a browser with speech synthesis. Try Chrome, Safari, or Edge.</p>}
      {!visibleError && reader.supported && language !== 'en' && !translated[language] && !preparing && (
        <p className="ac-listen-note">The lesson is written in English. Choose your language to hear a translated reading.</p>
      )}
    </section>
  );
}
