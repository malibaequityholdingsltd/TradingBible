import { Router } from 'express';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { supabaseRest } from '../utils/supabaseClient.js';

// Private member-to-member messages.
//
// Storage note: the production database already has the owner-scoped
// `notifications` table (RLS: auth.uid() = owner). A direct message is stored
// as two private rows — one for each participant — so each person can only
// read their own copy. The service-role API is the only writer; browser
// clients never touch another member's rows. The `dm:` title prefix and
// `kind = 'dm'` keep these rows separate from security notifications.
const router = Router();
const DM_KIND = 'dm';
const DM_PREFIX = 'dm:';
const MAX_BODY = 4000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function profileName(row) {
	return String(row?.name || row?.username || row?.email?.split?.('@')?.[0] || 'Member').trim() || 'Member';
}

function profileAvatar(row) {
	const settings = row?.user_settings && typeof row.user_settings === 'object' ? row.user_settings : {};
	return String(settings.avatarUrl || settings.avatar || row?.avatarUrl || row?.avatar || '');
}

function conversationId(a, b) {
	return [a, b].sort().join(':');
}

function conversationTitle(a, b) {
	return `${DM_PREFIX}${conversationId(a, b)}`;
}

function parseMeta(link) {
	try {
		const value = typeof link === 'string' ? JSON.parse(link) : link;
		return value && typeof value === 'object' ? value : {};
	} catch {
		return {};
	}
}

function messageFor(row, userId) {
	const meta = parseMeta(row.link);
	return {
		id: row.id,
		body: String(row.message || ''),
		at: row.created,
		own: row.owner === userId,
		seen: Boolean(row.seen),
		peerId: meta.peerId || null,
	};
}

function peerFor(row) {
	const meta = parseMeta(row.link);
	return {
		id: meta.peerId || null,
		name: meta.peerName || 'Member',
		avatar: meta.peerAvatar || '',
	};
}

async function loadProfile(id) {
	const rows = await supabaseRest('/rest/v1/users', {
		query: { select: 'id,username,name,email,user_settings', id: `eq.${id}`, limit: 1 },
	}).catch(() => []);
	return rows?.[0] || null;
}

async function loadProfiles(ids) {
	const unique = [...new Set(ids.filter(Boolean))];
	if (unique.length === 0) return new Map();
	const rows = await supabaseRest('/rest/v1/users', {
		query: { select: 'id,username,name,email,user_settings', id: `in.(${unique.join(',')})`, limit: unique.length },
	}).catch(() => []);
	return new Map((rows || []).map((row) => [String(row.id), row]));
}

async function markRead(userId, peerId) {
	const title = conversationTitle(userId, peerId);
	await supabaseRest('/rest/v1/notifications', {
		method: 'PATCH',
		query: { owner: `eq.${userId}`, kind: `eq.${DM_KIND}`, title: `eq.${title}`, seen: 'eq.false' },
		body: { seen: true },
		prefer: 'return=minimal',
	}).catch(() => null);
}

router.use(supabaseAuth);

// GET /api/messages/conversations — private inbox, newest activity first.
router.get('/conversations', async (req, res, next) => {
	try {
		const userId = req.userId;
		const rows = await supabaseRest('/rest/v1/notifications', {
			query: {
				select: 'id,owner,kind,title,message,link,seen,created',
				owner: `eq.${userId}`,
				kind: `eq.${DM_KIND}`,
				order: 'created.desc',
				limit: 1000,
			},
		});
		const groups = new Map();
		for (const row of rows || []) {
			if (!String(row.title || '').startsWith(DM_PREFIX)) continue;
			const title = row.title;
			if (!groups.has(title)) groups.set(title, []);
			groups.get(title).push(row);
		}
		const peerIds = [...groups.values()].map((items) => peerFor(items[0]).id).filter(Boolean);
		const profiles = await loadProfiles(peerIds);
		const conversations = [...groups.entries()].map(([title, items]) => {
			const last = items[0];
			const peer = peerFor(last);
			const profile = peer.id ? profiles.get(String(peer.id)) : null;
			const unread = items.filter((row) => !row.seen && row.owner === userId).length;
			return {
				conversationId: title.slice(DM_PREFIX.length),
				peerId: peer.id,
				peerName: profile ? profileName(profile) : peer.name,
				peerAvatar: profile ? profileAvatar(profile) : peer.avatar,
				lastMessage: String(last.message || ''),
				lastAt: last.created,
				lastFromMe: last.owner === userId,
				unread,
			};
		}).filter((item) => item.peerId).sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
		res.setHeader('Cache-Control', 'private, no-store');
		res.json(conversations);
	} catch (err) {
		next(err);
	}
});

// GET /api/messages/contacts?q=ada — find a member to start a private chat.
// Require at least two characters and never expose email addresses.
router.get('/contacts', async (req, res, next) => {
	try {
		const q = String(req.query.q || '').replace(/[%,()*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
		if (q.length < 2) return res.json([]);
		const rows = await supabaseRest('/rest/v1/users', {
			query: {
				select: 'id,username,name,email,user_settings',
				or: `(username.ilike.*${q}*,name.ilike.*${q}*)`,
				limit: 25,
			},
		});
		const contacts = (rows || [])
			.filter((row) => row.id && row.id !== req.userId)
			.map((row) => ({ id: row.id, name: profileName(row), username: row.username || '', avatar: profileAvatar(row) }));
		res.setHeader('Cache-Control', 'private, no-store');
		res.json(contacts);
	} catch (err) {
		next(err);
	}
});

// GET /api/messages/:peerId — the private thread with one member.
router.get('/:peerId', async (req, res, next) => {
	try {
		const userId = req.userId;
		const peerId = String(req.params.peerId || '');
		if (!UUID_RE.test(peerId) || peerId === userId) return res.status(422).json({ error: 'Invalid member' });
		const title = conversationTitle(userId, peerId);
		const rows = await supabaseRest('/rest/v1/notifications', {
			query: {
				select: 'id,owner,kind,title,message,link,seen,created',
				owner: `eq.${userId}`,
				kind: `eq.${DM_KIND}`,
				title: `eq.${title}`,
				order: 'created.asc',
				limit: 1000,
			},
		});
		const peerProfile = await loadProfile(peerId);
		const peerMeta = peerFor((rows || [])[0] || {});
		await markRead(userId, peerId);
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({
			peer: {
				id: peerId,
				name: peerProfile ? profileName(peerProfile) : (peerMeta.name || 'Member'),
				avatar: peerProfile ? profileAvatar(peerProfile) : (peerMeta.avatar || ''),
			},
			messages: (rows || []).map((row) => messageFor(row, userId)),
		});
	} catch (err) {
		next(err);
	}
});

// POST /api/messages/:peerId/read — clear the unread badge for this thread.
router.post('/:peerId/read', async (req, res, next) => {
	try {
		const userId = req.userId;
		const peerId = String(req.params.peerId || '');
		if (!UUID_RE.test(peerId) || peerId === userId) return res.status(422).json({ error: 'Invalid member' });
		await markRead(userId, peerId);
		res.json({ ok: true });
	} catch (err) {
		next(err);
	}
});

// POST /api/messages/:peerId — send one private message to one member.
router.post('/:peerId', async (req, res, next) => {
	try {
		const userId = req.userId;
		const peerId = String(req.params.peerId || '');
		const body = String(req.body?.body || '').trim();
		if (!UUID_RE.test(peerId) || peerId === userId) return res.status(422).json({ error: 'Invalid member' });
		if (!body) return res.status(422).json({ error: 'Message required' });
		if (body.length > MAX_BODY) return res.status(422).json({ error: `Message must be ${MAX_BODY} characters or fewer` });

		const [senderProfile, peerProfile] = await Promise.all([loadProfile(userId), loadProfile(peerId)]);
		const senderName = profileName(senderProfile);
		const senderAvatar = profileAvatar(senderProfile);
		const peerName = profileName(peerProfile);
		const peerAvatar = profileAvatar(peerProfile);
		const title = conversationTitle(userId, peerId);
		const createdAt = new Date().toISOString();
		const base = { kind: DM_KIND, title, message: body, created: createdAt };
		const rows = await supabaseRest('/rest/v1/notifications', {
			method: 'POST',
			body: [
				{
					...base,
					owner: peerId,
					seen: false,
					link: JSON.stringify({ conversationId: title.slice(DM_PREFIX.length), peerId: userId, peerName: senderName, peerAvatar: senderAvatar }),
				},
				{
					...base,
					owner: userId,
					seen: true,
					link: JSON.stringify({ conversationId: title.slice(DM_PREFIX.length), peerId, peerName, peerAvatar }),
				},
			],
			prefer: 'return=representation',
		});
		const sent = (rows || []).find((row) => row.owner === userId) || (rows || [])[0];
		res.status(201).json({
			message: sent ? messageFor(sent, userId) : { body, at: createdAt, own: true, seen: true, peerId },
			peer: { id: peerId, name: peerName, avatar: peerAvatar },
		});
	} catch (err) {
		next(err);
	}
});

export default router;
