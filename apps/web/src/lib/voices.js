// Device voice catalog helpers. Browsers expose voice names but not gender,
// so we use conservative name matching and leave unknown voices as "Other".
// The UI always shows the real device voice name; the gender label is only a
// convenience for choosing a reader.

const FEMALE_HINTS = /\b(female|woman|girl|mrs|ms)\b/i;
const MALE_HINTS = /\b(male|man|boy|mr)\b/i;
const NOVELTY = /\b(bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;

const FEMALE_NAMES = [
	'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'susan', 'zira',
	'aria', 'jenny', 'michelle', 'ana', 'sofia', 'maria', 'paula', 'helena',
	'amelie', 'amélie', 'audrey', 'aurelie', 'celine', 'julie', 'virginie', 'anna',
	'katja', 'hedda', 'klara', 'monica', 'mónica', 'paulina', 'marisol', 'sabina',
	'joana', 'ines', 'luciana', 'catarina', 'hoda', 'naayf', 'zeina', 'laila',
	'ting-ting', 'mei-jia', 'sin-ji', 'yaoyao', 'xiaoxiao', 'xiaoyi', 'lekha',
	'kalpana', 'swara', 'neerja', 'heera', 'allison', 'ava', 'kate', 'laura',
	'linda', 'mary', 'sarah', 'nicole', 'cynthia', 'hazel', 'serena', 'olivia',
	'emma', 'alice', 'siri', 'flo', 'grandma', 'kathy', 'sandy', 'shelley',
	'google uk english female', 'google us english female',
];

const MALE_NAMES = [
	'david', 'mark', 'daniel', 'alex', 'fred', 'tom', 'oliver', 'thomas',
	'george', 'james', 'ryan', 'guy', 'aaron', 'rishi', 'liam', 'christopher',
	'eric', 'brian', 'matthew', 'joey', 'justin', 'diego', 'jorge', 'juan',
	'pablo', 'pedro', 'luca', 'matteo', 'alessandro', 'hans', 'stefan', 'klaus',
	'yuri', 'dmitri', 'guillaume', 'bernard', 'conrad', 'markus', 'felipe',
	'ricardo', 'duarte', 'maged', 'tarik', 'yunjian', 'hemant', 'ravi',
	'prabhat', 'albert', 'eddy', 'grandpa', 'junior', 'ralph', 'reed',
	'rocko', 'google uk english male', 'google us english male',
];

function voiceText(voice) {
	return `${voice?.name || ''} ${voice?.voiceURI || ''}`.toLowerCase();
}

export function voiceGender(voice) {
	const text = voiceText(voice);
	if (FEMALE_HINTS.test(text)) return 'female';
	if (MALE_HINTS.test(text)) return 'male';
	if (FEMALE_NAMES.some((name) => text.includes(name))) return 'female';
	if (MALE_NAMES.some((name) => text.includes(name))) return 'male';
	return 'other';
}

export function voiceGenderLabel(gender) {
	if (gender === 'female') return 'Female';
	if (gender === 'male') return 'Male';
	return 'Other';
}

export function voiceLanguage(voice) {
	return String(voice?.lang || '').toLowerCase().replace(/_/g, '-').split('-')[0];
}

export function voicesForLanguage(voices, lang) {
	const code = String(lang || 'en').toLowerCase().replace(/_/g, '-').split('-')[0];
	return (voices || []).filter((voice) => voiceLanguage(voice) === code && !NOVELTY.test(voiceText(voice)));
}

export function voiceLabel(voice) {
	if (!voice) return 'Auto';
	const gender = voiceGender(voice);
	return `${voice.name} · ${voiceGenderLabel(gender)}${voice.localService ? '' : ' · network'}`;
}

export function pickVoice(voices, lang, gender = 'auto', currentURI = '') {
	const pool = voicesForLanguage(voices, lang);
	if (!pool.length) return null;
	const current = currentURI ? pool.find((voice) => voice.voiceURI === currentURI) : null;
	if (gender === 'female' || gender === 'male') {
		if (current && voiceGender(current) === gender) return current;
		const match = pool.find((voice) => voiceGender(voice) === gender);
		if (match) return match;
	}
	if (current) return current;
	return pool.find((voice) => voice.default) || pool[0];
}

export function genderCounts(voices, lang) {
	const pool = voicesForLanguage(voices, lang);
	return {
		all: pool.length,
		female: pool.filter((voice) => voiceGender(voice) === 'female').length,
		male: pool.filter((voice) => voiceGender(voice) === 'male').length,
		other: pool.filter((voice) => voiceGender(voice) === 'other').length,
	};
}
