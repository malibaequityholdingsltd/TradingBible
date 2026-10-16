// Bounded upstream fetch + parallel host race.
// Every market-data provider fetch MUST go through here: a blackholed host
// (geo-block, dead DNS, stalled TLS) hangs plain fetch() for minutes and
// stalls whole quotes/candles responses. 8s per attempt keeps the worst
// case to seconds and lets callers fall through to the next feed.
export async function fetchTimeout(url, { timeoutMs = 8000, ...init } = {}) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

// Query mirror hosts in PARALLEL, first success in priority order wins.
// Sequential host loops multiply a blackhole hang by the host count; racing
// keeps the worst case to a single timeout window while preserving host
// preference. Throws the last error when every host fails.
export async function firstUpstream(hosts, buildUrl, { timeoutMs = 8000, init } = {}) {
	const attempts = hosts.map(async (host) => fetchTimeout(buildUrl(host), { ...(init || {}), timeoutMs }));
	const errors = [];
	for (const p of attempts) {
		try {
			const res = await p;
			if (!res.ok) throw new Error(`http ${res.status}`);
			return res;
		} catch (err) {
			errors.push(err);
		}
	}
	throw errors[errors.length - 1] || new Error('all upstream hosts failed');
}
