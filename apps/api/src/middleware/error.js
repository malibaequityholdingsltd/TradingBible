import logger from '../utils/logger.js';
import { NodeEnv } from '../constants/common.js';

const errorMiddleware = (err, req, res, next) => {
	logger.error(err.message, err.stack);

	if (res.headersSent) {
		return next(err);
	}

	const status = Number.isInteger(err?.status) && err.status >= 400 ? err.status : 500;
	const isClientError = status < 500 && status >= 400;

	res.status(status).json({
		message: isClientError ? (err.message || 'Request failed') : 'Something went wrong!',
		...(isClientError || process.env.NODE_ENV !== NodeEnv.Production
			? { error: { name: err.name, message: err.message } }
			: {}),
	});
};

export default errorMiddleware;
export { errorMiddleware };
