function unauthorizedError(message) {
	const error = new Error(message);
	error.status = 401;
	return error;
}

function forbiddenError(message) {
	const error = new Error(message);
	error.status = 403;
	return error;
}

export async function supabaseAuth(req, res, next) {
	const token = req.headers.authorization?.split(' ')?.[1];

	// Auth is enforced by default. To allow public (anonymous) access, remove this
	// middleware from the route (apps/api/src/routes/integrated-ai.js).
	if (!token) {
		return next(unauthorizedError('Please sign in or create an account to use the chat.'));
	}

	try {
		const supabaseUrl = process.env.SUPABASE_URL;
		const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
		if (!supabaseUrl || !supabaseAnonKey) {
			return next(unauthorizedError('Your session has expired. Please sign in again.'));
		}

		const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
			method: 'GET',
			headers: {
				apikey: supabaseAnonKey,
				Authorization: `Bearer ${token}`,
			},
		});

		if (!userResponse.ok) {
			return next(unauthorizedError('Your session has expired. Please sign in again.'));
		}

		const user = await userResponse.json();
		req.userId = user?.id;

		if (!user?.email_confirmed_at) {
			return next(forbiddenError('Please verify your email to use the chat. Check your inbox for the verification link.'));
		}

		// Accounts that were closed are blocked from every API surface. Their
		// data is never deleted — retention is by law. Deactivated (soft-paused)
		// accounts may log back in and are auto-reactivated on next login.
		try {
			const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			const settingsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user?.id)}`, {
				headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` },
			});
			const rows = settingsRes.ok ? await settingsRes.json() : [];
			const account = rows?.[0]?.user_settings?.account;
			if (account?.status === 'closed') {
				return next(forbiddenError('This account has been closed. Your data is retained per our legal obligations. Contact support if you believe this is an error.'));
			}
		} catch {
			// If the settings check itself fails, fall through with the auth check above.
		}

		return next();
	} catch {
		return next(unauthorizedError('Your session has expired. Please sign in again.'));
	}
}
