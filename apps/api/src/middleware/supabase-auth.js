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

		return next();
	} catch {
		return next(unauthorizedError('Your session has expired. Please sign in again.'));
	}
}
