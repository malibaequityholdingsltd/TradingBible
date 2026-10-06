import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import { getCircleX402Middleware } from './middleware/circle-x402.js';
import logger from './utils/logger.js';
import { BodyLimit } from './constants/common.js';

const app = express();

app.set('trust proxy', true);

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
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

app.use(helmet());
const devOrigins = ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://172.20.10.4:3000'];
const allowedOrigins = process.env.CORS_ORIGIN
  ? [process.env.CORS_ORIGIN, ...devOrigins]
  : devOrigins;

app.use(cors({
	origin: allowedOrigins,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'QUERY'],
	allowedHeaders: ['Authorization', 'Content-Type'],
	credentials: true,
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
});

export default app;
