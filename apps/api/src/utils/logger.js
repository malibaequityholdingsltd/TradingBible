const RECENT_MAX = 200;
const recentLogs = [];

function fmt(arg) {
	if (typeof arg === 'string') return arg;
	try { return JSON.stringify(arg); } catch { return String(arg); }
}

function push(level, args) {
	recentLogs.push({ ts: new Date().toISOString(), level, msg: args.map(fmt).join(' ').slice(0, 500) });
	if (recentLogs.length > RECENT_MAX) recentLogs.shift();
}

const logger = {
    // Application errors - goes to stdout
    error: (...args) => {
        push('error', args);
        console.log('[ERROR]', ...args);
    },

    // Critical system errors - goes to stderr
    fatal: (...args) => {
        push('fatal', args);
        console.error('[FATAL]', ...args);
    },

    info: (...args) => {
        push('info', args);
        console.log('[INFO]', ...args);
    },

    debug: (...args) => {
        push('debug', args);
        console.log('[DEBUG]', ...args);
    },

    warn: (...args) => {
        push('warn', args);
        console.log('[WARN]', ...args);
    },

    // In-memory ring buffer for the admin log feed (GET /admin/logs).
    recent: (limit = 100) => recentLogs.slice(-Math.max(1, Math.min(200, Number(limit) || 100))),
};

export default logger;

export { logger };

