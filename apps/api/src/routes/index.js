import { Router } from 'express';
import healthCheck from './health-check.js';
import integratedAiRouter from './integrated-ai.js';
import marketData from './market-data.js';
import quotes from './quotes.js';
import candles from './candles.js';
import indicator from './indicator.js';
import heatmap from './heatmap.js';
import economicCalendar from './economic-calendar.js';
import authSendEmail from './auth-send-email.js';
import { intraday, daily, weekly, monthly } from './market-series.js';
import paddleRouter from './paddle.js';
import affiliateRouter from './affiliate.js';
import securityRouter from './security.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.post('/auth/send-email', authSendEmail);
    router.use('/integrated-ai', integratedAiRouter);
    router.get('/market-data', marketData);
    router.get('/quotes', quotes);
    router.get('/candles', candles);
    router.get('/indicator', indicator);
    router.get('/heatmap', heatmap);
    router.get('/economic-calendar', economicCalendar);
    router.get('/intraday', intraday);
    router.get('/daily', daily);
    router.get('/weekly', weekly);
    router.get('/monthly', monthly);
    router.use('/paddle', paddleRouter);
    router.use('/affiliate', affiliateRouter);
    router.use('/security', securityRouter);

    return router;
};
