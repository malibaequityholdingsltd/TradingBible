import { deriveEmployeeNo } from './employeeNo.js';
import { staffCardFromApplication } from './staffCard.js';

// Human-readable public staff profile slugs.
//
// The printed ID-card QR used to encode the job-application UUID. New cards
// encode the employee's name (for example /staff/malik-nlem). UUID links
// remain resolvable and redirect to the canonical name URL.

export function slugifyStaffName(value) {
	const text = String(value ?? '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/['’`]/g, '')
		.replace(/&/g, ' and ')
		.toLowerCase();
	return text
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/g, '');
}

function fallbackStaffSlug(app) {
	const id = String(app?.id || app?.appId || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
	return id ? `employee-${id.slice(0, 10)}` : 'employee';
}

function baseStaffSlug(app) {
	const card = staffCardFromApplication(app);
	const stored = slugifyStaffName(card.profileSlug);
	return stored || slugifyStaffName(app?.name) || fallbackStaffSlug(app);
}

function aliasList(card) {
	const values = [];
	if (Array.isArray(card.slugAliases)) values.push(...card.slugAliases);
	if (Array.isArray(card.slugHistory)) values.push(...card.slugHistory);
	return [...new Set(values.map(slugifyStaffName).filter(Boolean))];
}

/**
 * Assign one stable, unique slug per hired application.
 * Duplicate names get the employee number as a suffix instead of an
 * arbitrary counter, so the URL stays tied to the person.
 */
export function staffSlugMap(apps) {
	const list = Array.isArray(apps) ? apps.filter((app) => app && (app.id || app.appId)) : [];
	const counts = new Map();
	for (const app of list) {
		const base = baseStaffSlug(app);
		counts.set(base, (counts.get(base) || 0) + 1);
	}

	const used = new Set();
	const result = new Map();
	for (const app of list) {
		const id = app.id || app.appId;
		const base = baseStaffSlug(app);
		let slug = base;
		if ((counts.get(base) || 0) > 1) {
			const suffix = slugifyStaffName(deriveEmployeeNo(id)) || fallbackStaffSlug(app);
			slug = `${base}-${suffix}`;
		}
		let unique = slug;
		let n = 2;
		while (used.has(unique)) {
			unique = `${slug}-${n}`;
			n += 1;
		}
		used.add(unique);

		const card = staffCardFromApplication(app);
		result.set(id, {
			slug: unique,
			aliases: aliasList(card).filter((alias) => alias !== unique),
		});
	}

	// Never let an old alias shadow another employee's current canonical slug.
	const canonical = new Set([...result.values()].map((entry) => entry.slug));
	for (const entry of result.values()) {
		entry.aliases = entry.aliases.filter((alias) => !canonical.has(alias));
	}
	return result;
}

export function findStaffAppBySlug(apps, requested) {
	const wanted = slugifyStaffName(requested);
	if (!wanted || !Array.isArray(apps)) return null;
	const slugs = staffSlugMap(apps);
	for (const app of apps) {
		const entry = slugs.get(app?.id || app?.appId);
		if (entry?.slug === wanted) return { app, ...entry };
	}
	for (const app of apps) {
		const entry = slugs.get(app?.id || app?.appId);
		if (entry?.aliases.includes(wanted)) return { app, ...entry };
	}
	return null;
}
