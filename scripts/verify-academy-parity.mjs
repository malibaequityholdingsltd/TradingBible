#!/usr/bin/env node
/**
 * Fail the release if the web Academy catalog and the API fallback catalog
 * drift apart. The web file is the source of truth; the API mirrors it so a
 * new path cannot appear in the portal and be missing from enrollment or
 * exam assembly.
 */
import { PATHS, STATIC_CURRICULA } from '../apps/web/src/lib/academyCatalog.js';
import { DEFAULT_CURRICULA } from '../apps/api/src/api/academy.js';

const failures = [];

function fail(message) {
	failures.push(message);
}

const webKeys = PATHS.map((path) => path.key).sort();
const apiKeys = Object.keys(DEFAULT_CURRICULA).sort();
if (webKeys.join('|') !== apiKeys.join('|')) {
	fail(`path keys differ\n  web: ${webKeys.join(', ')}\n  api: ${apiKeys.join(', ')}`);
}

for (const path of PATHS) {
	const web = STATIC_CURRICULA[path.key];
	const api = DEFAULT_CURRICULA[path.key];
	if (!web) {
		fail(`${path.key}: missing web curriculum`);
		continue;
	}
	if (!api) {
		fail(`${path.key}: missing API curriculum`);
		continue;
	}
	if (web.pathName !== api.pathName) fail(`${path.key}: pathName differs (${web.pathName} vs ${api.pathName})`);
	if (web.focus !== api.focus) fail(`${path.key}: focus differs`);

	const webCourses = web.courses || [];
	const apiCourses = api.courses || [];
	if (webCourses.length !== apiCourses.length) {
		fail(`${path.key}: course count differs (${webCourses.length} vs ${apiCourses.length})`);
		continue;
	}
	for (let i = 0; i < webCourses.length; i += 1) {
		const wc = webCourses[i];
		const ac = apiCourses[i];
		const label = `${path.key}/${wc.courseKey}`;
		if (wc.courseKey !== ac.courseKey) fail(`${label}: courseKey differs (${wc.courseKey} vs ${ac.courseKey})`);
		if (wc.title !== ac.title) fail(`${label}: title differs`);
		if (Number(wc.minutes) !== Number(ac.minutes)) fail(`${label}: minutes differ (${wc.minutes} vs ${ac.minutes})`);
		const wl = wc.lessons || [];
		const al = ac.lessons || [];
		if (wl.length !== al.length) {
			fail(`${label}: lesson count differs (${wl.length} vs ${al.length})`);
			continue;
		}
		for (let j = 0; j < wl.length; j += 1) {
			const w = wl[j];
			const a = al[j];
			const lessonLabel = `${label}/${w.lessonKey}`;
			if (w.lessonKey !== a.lessonKey) fail(`${lessonLabel}: lessonKey differs (${w.lessonKey} vs ${a.lessonKey})`);
			if (w.title !== a.title) fail(`${lessonLabel}: title differs`);
			if (Number(w.minutes) !== Number(a.minutes)) fail(`${lessonLabel}: minutes differ (${w.minutes} vs ${a.minutes})`);
		}
	}
}

const totalLessons = PATHS.reduce((sum, path) => {
	const curriculum = STATIC_CURRICULA[path.key];
	return sum + (curriculum?.courses || []).reduce((n, course) => n + (course.lessons || []).length, 0);
}, 0);

if (failures.length) {
	console.error(`Academy parity FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Academy parity OK: ${PATHS.length} paths, ${Object.values(STATIC_CURRICULA).reduce((n, c) => n + (c.courses || []).length, 0)} courses, ${totalLessons} lessons.`);
