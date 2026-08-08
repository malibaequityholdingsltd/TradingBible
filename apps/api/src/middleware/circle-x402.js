import logger from '../utils/logger.js';

const passthrough = (_req, _res, next) => next();
let circleGatewayMiddlewarePromise;

async function loadCircleGatewayMiddleware(sellerAddress, amount) {
	if (!circleGatewayMiddlewarePromise) {
		// The Circle package exposes this subpath at runtime, but the local ESLint resolver
		// does not understand the package exports map here.
		// eslint-disable-next-line import/no-unresolved
		circleGatewayMiddlewarePromise = import('@circle-fin/x402-batching/server')
			.then(({ createGatewayMiddleware }) => createGatewayMiddleware({ sellerAddress }).require(amount));
	}

	return circleGatewayMiddlewarePromise;
}

export function getCircleX402Middleware() {
	const enabled = String(process.env.CIRCLE_X402_ENABLED || '').toLowerCase() === 'true';
	if (!enabled) return passthrough;

	const sellerAddress = String(process.env.CIRCLE_X402_SELLER_ADDRESS || '').trim();
	if (!sellerAddress) {
		logger.warn('CIRCLE_X402_ENABLED=true but CIRCLE_X402_SELLER_ADDRESS is missing. x402 gate disabled.');
		return passthrough;
	}

	const amount = String(process.env.CIRCLE_X402_PRICE || '$0.01').trim();

	return async (req, res, next) => {
		try {
			const gateway = await loadCircleGatewayMiddleware(sellerAddress, amount);
			return gateway(req, res, next);
		} catch (error) {
			logger.error('Failed to initialize Circle x402 middleware:', error);
			return passthrough(req, res, next);
		}
	};
}
