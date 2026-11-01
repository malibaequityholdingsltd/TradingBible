import { describe, expect, it } from 'vitest';
import {
  genderCounts, pickVoice, voiceGender, voicesForLanguage,
} from './voices';

const voices = [
  { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', default: true, localService: true },
  { name: 'Albert', lang: 'en-US', voiceURI: 'Albert', default: false, localService: true },
  { name: 'Google US English', lang: 'en-US', voiceURI: 'Google US English', default: false, localService: false },
  { name: 'Bad News', lang: 'en-US', voiceURI: 'Bad News', default: false, localService: true },
  { name: 'Eddy (Spanish (Spain))', lang: 'es-ES', voiceURI: 'Eddy (Spanish (Spain))', default: false, localService: true },
  { name: 'Mónica', lang: 'es-ES', voiceURI: 'Mónica', default: true, localService: true },
];

describe('voice catalog', () => {
  it('labels known male and female voices and leaves unknown voices as other', () => {
    expect(voiceGender(voices[0])).toBe('female');
    expect(voiceGender(voices[1])).toBe('male');
    expect(voiceGender(voices[2])).toBe('other');
  });

  it('normalises underscores in device language tags', () => {
    const underscore = [{ name: 'Albert', lang: 'en_US', voiceURI: 'Albert', default: true }];
    expect(voicesForLanguage(underscore, 'en')).toHaveLength(1);
  });

  it('hides novelty system voices from the reader picker', () => {
    const names = voicesForLanguage(voices, 'en').map((voice) => voice.name);
    expect(names).toContain('Samantha');
    expect(names).not.toContain('Bad News');
  });

  it('honours an explicit gender even when another voice is selected', () => {
    const next = pickVoice(voices, 'en', 'male', 'Samantha');
    expect(next?.name).toBe('Albert');
  });

  it('keeps the current voice when no gender is requested', () => {
    const next = pickVoice(voices, 'en', 'auto', 'Samantha');
    expect(next?.name).toBe('Samantha');
  });

  it('counts the usable readers for a language', () => {
    expect(genderCounts(voices, 'en')).toMatchObject({ all: 3, female: 1, male: 1, other: 1 });
  });
});
