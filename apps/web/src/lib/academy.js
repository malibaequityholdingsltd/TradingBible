import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

function headers() {
	return { Authorization: pb.authStore.token, 'Content-Type': 'application/json' };
}

async function parse(res, fallbackMsg) {
	if (res.ok) return res.json().catch(() => ({}));
	const body = await res.json().catch(() => ({}));
	const message = body?.error?.message || body?.error || body?.message || fallbackMsg;
	const err = new Error(message);
	err.code = body?.error?.code || null;
	throw err;
}

export async function getAcademyAccess() {
	const res = await apiServerClient.fetch('/academy/access', { headers: headers() });
	return parse(res, 'Could not check Academy access');
}

export async function enrollInPath(pathKey) {
	const res = await apiServerClient.fetch('/academy/enroll', {
		method: 'POST', headers: headers(), body: JSON.stringify({ pathKey }),
	});
	return parse(res, 'Could not enroll');
}

export async function getCurriculum(pathKey, level, about) {
	const q = new URLSearchParams({ pathKey });
	if (level) q.set('level', level);
	if (about) q.set('about', about);
	const res = await apiServerClient.fetch(`/academy/curriculum?${q.toString()}`, { headers: headers() });
	return parse(res, 'Could not load your curriculum');
}

export async function getLesson(pathKey, courseKey, lessonKey) {
	const res = await apiServerClient.fetch('/academy/lesson', {
		method: 'POST', headers: headers(), body: JSON.stringify({ pathKey, courseKey, lessonKey }),
	});
	return parse(res, 'Could not load the lesson');
}

export async function gradeQuiz(pathKey, courseKey, lessonKey, answers) {
	const res = await apiServerClient.fetch('/academy/quiz/grade', {
		method: 'POST', headers: headers(), body: JSON.stringify({ pathKey, courseKey, lessonKey, answers }),
	});
	return parse(res, 'Could not grade the quiz');
}

export async function completeLesson(pathKey, courseKey, lessonKey) {
	const res = await apiServerClient.fetch('/academy/complete', {
		method: 'POST', headers: headers(), body: JSON.stringify({ pathKey, courseKey, lessonKey }),
	});
	return parse(res, 'Could not save progress');
}

export async function getAcademyProgress() {
	const res = await apiServerClient.fetch('/academy/progress', { headers: headers() });
	return parse(res, 'Could not load progress');
}

export async function claimCertificate(pathKey) {
	const res = await apiServerClient.fetch('/academy/certificate', {
		method: 'POST', headers: headers(), body: JSON.stringify({ pathKey }),
	});
	return parse(res, 'Could not generate your certificate');
}

export async function rsvpWebinar(webinarId) {
	const res = await apiServerClient.fetch('/academy/webinar/rsvp', {
		method: 'POST', headers: headers(), body: JSON.stringify({ webinarId }),
	});
	return parse(res, 'Could not save your RSVP');
}

export async function unrsvpWebinar(webinarId) {
	const res = await apiServerClient.fetch(`/academy/webinar/rsvp?webinarId=${encodeURIComponent(webinarId)}`, {
		method: 'DELETE', headers: headers(),
	});
	return parse(res, 'Could not remove your RSVP');
}

export { pb };
