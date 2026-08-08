import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: (req) => {
		// Market data endpoints are polled by dashboards and can burst across tabs.
		// Keep these generous while preserving stricter limits for all other routes.
		if (req.method === 'GET' && /^\/(quotes|market-data|candles|heatmap)(\/|$)/.test(req.path)) {
			return 1200;
		}
		return 300;
	},
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests, please try again later' },
	validate: { trustProxy: false },
});
