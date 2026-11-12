import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import { getCircleX402Middleware } from './middleware/circle-x402.js';
import logger from './utils/logger.js';
import { startSiWarmup } from './services/si-warmup.js';
import { BodyLimit } from './constants/common.js';

const app = express();

function trustProxySetting() {
	const raw = process.env.TRUST_PROXY;
	if (raw === undefined || raw === '') {
		// Production is behind one local Nginx hop. Development normally has no
		// trusted proxy. Do not trust arbitrary client-supplied forwarding chains.
		return process.env.NODE_ENV === 'production' ? 1 : false;
	}
	if (raw === 'false') return false;
	if (raw === 'true') return 1;
	const hops = Number(raw);
	return Number.isInteger(hops) && hops >= 0 && hops <= 4 ? hops : false;
}

const TRUST_PROXY = trustProxySetting();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.set('trust proxy', TRUST_PROXY);
app.set('json escape', true);
app.disable('x-powered-by');

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
	// A process that continued after an uncaught exception may be in an
	// undefined state. Let PM2 restart it after the log flush.
	setTimeout(() => process.exit(1), 100).unref();
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
	setTimeout(() => process.exit(1), 100).unref();
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});

app.use(helmet({
	contentSecurityPolicy: {
		useDefaults: true,
		directives: {
			'default-src': ["'self'"],
			'base-uri': ["'self'"],
			'frame-ancestors': ["'self'"],
			'object-src': ["'none'"],
			'script-src': ["'self'"],
			'style-src': ["'self'", "'unsafe-inline'"],
			'img-src': ["'self'", 'data:'],
			'connect-src': ["'self'"],
			'form-action': ["'self'"],
		},
	},
	crossOriginEmbedderPolicy: false,
	hsts: IS_PRODUCTION && process.env.HELMET_HSTS !== 'false'
		? { maxAge: 31536000, includeSubDomains: true, preload: false }
		: false,
	referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use((req, res, next) => {
	const requestId = req.headers['cf-ray'] || req.headers['x-request-id'] || crypto.randomUUID();
	req.requestId = String(requestId).slice(0, 120);
	res.setHeader('X-Request-ID', req.requestId);
	res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
	next();
});

const devOrigins = ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://172.20.10.4:3000'];
const configuredOrigins = [process.env.CORS_ORIGIN, process.env.CORS_ORIGINS]
	.filter(Boolean)
	.flatMap((value) => String(value).split(','))
	.map((value) => value.trim())
	.filter((value) => value && value !== '*');
const allowedOrigins = configuredOrigins.length
	? (IS_PRODUCTION ? configuredOrigins : [...new Set([...configuredOrigins, ...devOrigins])])
	: devOrigins;

app.use(cors({
	origin: allowedOrigins,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'QUERY'],
	allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
	exposedHeaders: ['X-Request-ID', 'RateLimit-Policy', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
	credentials: true,
	maxAge: 600,
}));
app.use(morgan('combined'));
app.use(globalRateLimit);
app.use('/integrated-ai', getCircleX402Middleware());
app.use(express.json({
	limit: BodyLimit,
	// Capture the raw request body so Paddle webhook signatures can be verified.
	verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ 
	extended: true,
	limit: BodyLimit,
}));

app.use('/', routes());

app.use(errorMiddleware);

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
	logger.info(`🚀 API Server running on http://localhost:${port}`);
	startSiWarmup();
});

export default app;
