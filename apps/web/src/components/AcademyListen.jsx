import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Headphones, Languages, Loader2, Mic2, Pause, Play, Square, UserRound, Volume2,
} from 'lucide-react';
import { SUPPORTED_LANGS } from '@/lib/i18n';
import { getLessonTranslation } from '@/lib/academy';
import {
	genderCounts, pickVoice, voiceGender, voiceGenderLabel, voiceLabel, voicesForLanguage,
} from '@/lib/voices';
import useSpeechReader from '@/hooks/useSpeechReader';

const RATES = [0.8, 1, 1.15, 1.3];
const GENDER_KEY = 'tb.academy.voiceGender';

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

function storedGender() {
	try {
		return window.localStorage.getItem(GENDER_KEY) || 'auto';
	} catch {
		return 'auto';
	}
}

function saveGender(value) {
	try {
		window.localStorage.setItem(GENDER_KEY, value);
	} catch {
		/* private mode */
	}
}

export default function AcademyListen({ pathKey, courseKey, lessonKey, content }) {
	const reader = useSpeechReader();
	const [language, setLanguage] = useState('en');
	const [translated, setTranslated] = useState({});
	const [preparing, setPreparing] = useState(false);
	const [prepSeconds, setPrepSeconds] = useState(0);
	const [translationAttempt, setTranslationAttempt] = useState(0);
	const [translationError, setTranslationError] = useState('');
	const [voiceGenderChoice, setVoiceGenderChoice] = useState(storedGender);
	const [voiceNotice, setVoiceNotice] = useState('');
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

	const languageVoices = useMemo(
		() => voicesForLanguage(reader.voices, language),
		[reader.voices, language],
	);
	const counts = useMemo(
		() => genderCounts(reader.voices, language),
		[reader.voices, language],
	);
	const selectedVoice = languageVoices.find((voice) => voice.voiceURI === reader.voiceURI) || null;

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
		setVoiceNotice('');
	}, [lessonKey]); // eslint-disable-line react-hooks/exhaustive-deps

	// Keep an exact voice selected for the active language. If the saved voice
	// belongs to another language, choose the best female/male/auto reader.
	useEffect(() => {
		if (!languageVoices.length || selectedVoice) return;
		const next = pickVoice(reader.voices, language, voiceGenderChoice, reader.voiceURI);
		if (next) reader.setVoice(next.voiceURI);
	}, [language, languageVoices, reader, selectedVoice, voiceGenderChoice]);

	// Prepare the translation as soon as a language is chosen, never inside
	// the click handler. iOS Safari only allows SpeechSynthesis to start from
	// a user gesture, so the Listen button must call speak() synchronously.
	useEffect(() => {
		if (language === 'en' || translated[language]) return undefined;
		let live = true;
		setPreparing(true);
		setTranslationError('');
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
		setVoiceNotice('');
	};

	const changeVoiceGender = (next) => {
		const pool = voicesForLanguage(reader.voices, language);
		const match = next === 'auto' ? null : pool.find((voice) => voiceGender(voice) === next);
		if (next !== 'auto' && !match) {
			setVoiceNotice(`No ${voiceGenderLabel(next).toLowerCase()} voice is installed for ${label}. Add one in your device's speech settings, then reopen the voice menu.`);
			return;
		}
		setVoiceGenderChoice(next);
		saveGender(next);
		if (match) {
			reader.setVoice(match.voiceURI);
		} else if (next === 'auto') {
			const pick = pickVoice(reader.voices, language, next, reader.voiceURI);
			if (pick) reader.setVoice(pick.voiceURI);
		}
		setVoiceNotice('');
	};

	const chooseVoice = (event) => {
		const uri = event.target.value;
		reader.setVoice(uri);
		if (!uri) {
			setVoiceGenderChoice('auto');
			saveGender('auto');
			setVoiceNotice('');
			return;
		}
		const voice = languageVoices.find((item) => item.voiceURI === uri);
		if (voice) {
			const gender = voiceGender(voice);
			const next = gender === 'other' ? 'auto' : gender;
			setVoiceGenderChoice(next);
			saveGender(next);
		}
		setVoiceNotice('');
	};

	const previewVoice = () => {
		reader.stop();
		const sample = language !== 'en' && !translated[language]
			? 'This is a voice preview. Choose your language and wait for the lesson translation to hear the full lesson.'
			: (text || 'This is a voice preview.').slice(0, 190);
		reader.preview(sample, language, reader.voiceURI);
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
				: `About ${minutes} min · choose a reader below`;

	return (
		<section className={`ac-listen ac-listen-v2${playing ? ' is-playing' : ''}`} aria-label="Listen to this lesson">
			<div className="ac-listen-top">
				<div className="ac-listen-lead">
					<span className="ac-listen-icon"><Headphones className="h-4 w-4" /></span>
					<div>
						<span className="ac-listen-kicker">Voice studio · {label}</span>
						<strong className="ac-listen-title" aria-live="polite">{statusTitle}</strong>
						<p className="ac-listen-sub">{statusSub}</p>
					</div>
				</div>

				<div className="ac-listen-wave" aria-hidden="true">
					<i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
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
						<select value={reader.rate} onChange={(event) => reader.setRate(event.target.value)} aria-label="Reading speed">
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
			</div>

			<div className="ac-voice-console">
				<div className="ac-voice-gender" role="group" aria-label="Reader voice gender">
					<span className="ac-voice-console-label"><Mic2 className="h-3.5 w-3.5" /> Reader</span>
					<div className="ac-voice-chips">
						{[
							{ key: 'auto', label: 'Auto', count: counts.all },
							{ key: 'female', label: 'Female', count: counts.female },
							{ key: 'male', label: 'Male', count: counts.male },
						].map((item) => (
							<button
								key={item.key}
								type="button"
								className={`ac-voice-chip ${voiceGenderChoice === item.key ? 'is-active' : ''}`}
								onClick={() => changeVoiceGender(item.key)}
								aria-pressed={voiceGenderChoice === item.key}
							>
								{item.label}<span>{item.count}</span>
							</button>
						))}
					</div>
				</div>

				<label className="ac-voice-select">
					<UserRound className="h-3.5 w-3.5" />
					<select value={reader.voiceURI} onChange={chooseVoice} aria-label="Reader voice" disabled={!languageVoices.length}>
						{!languageVoices.length && <option value="">No {label} voice installed</option>}
						{languageVoices.length > 0 && <option value="">Auto · best available</option>}
						{['female', 'male', 'other'].map((gender) => {
							const list = languageVoices.filter((voice) => voiceGender(voice) === gender);
							if (!list.length) return null;
							return (
								<optgroup key={gender} label={voiceGenderLabel(gender)}>
									{list.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voiceLabel(voice)}</option>)}
								</optgroup>
							);
						})}
					</select>
				</label>

				<button type="button" className="ac-voice-preview" onClick={previewVoice} disabled={!reader.supported || !text}>
					<Volume2 className="h-3.5 w-3.5" /> Preview
				</button>
			</div>

			{(playing || paused || finished) && (
				<div className="ac-listen-progress" aria-hidden="true"><span style={{ width: `${reader.progress}%` }} /></div>
			)}

			{voiceNotice && <p className="ac-listen-note">{voiceNotice}</p>}
			{visibleError && <p className="ac-listen-error" role="alert">{visibleError}</p>}
			{!reader.supported && <p className="ac-listen-note">Read-aloud needs a browser with speech synthesis. Try Chrome, Safari, or Edge.</p>}
			{reader.supported && !languageVoices.length && (
				<p className="ac-listen-note">Your device has no {label} voice installed yet. Install one in your system speech settings, then reopen this page.</p>
			)}
			{!visibleError && reader.supported && language !== 'en' && !translated[language] && !preparing && (
				<p className="ac-listen-note">The lesson is written in English. Choose your language to hear a translated reading.</p>
			)}
		</section>
	);
}
