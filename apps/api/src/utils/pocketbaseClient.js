import Pocketbase from 'pocketbase';
import logger from './logger.js';

const POCKETBASE_HOST = process.env.POCKETBASE_URL || 'http://localhost:8090';

async function waitForHealth({ retries = 10, delayMs = 1000 } = {}) {
    for (let i = 1; i <= retries; i++) {
        try {
            const response = await fetch(`${POCKETBASE_HOST}/api/health`, { method: 'HEAD' });

            if (response.ok) {
                return;
            }
        } catch {
            // PocketBase not reachable yet; retry below
        }

        logger.warn(`PocketBase not ready, retrying (${i}/${retries})...`);

        await new Promise((r) => setTimeout(r, delayMs));
    }

    throw new Error(`PocketBase health check failed after ${retries} retries`);
}

const pocketbaseClient = new Pocketbase(POCKETBASE_HOST);

pocketbaseClient.autoCancellation(false);

let authPromise = null;

pocketbaseClient.beforeSend = async function (url, options) {
    if (url.includes('/api/collections/_superusers/auth-with-password')) {
        return { url, options };
    }

    if (!pocketbaseClient.authStore.isValid && !authPromise) {
        authPromise = pocketbaseClient.collection('_superusers').authWithPassword(
            process.env.PB_SUPERUSER_EMAIL,
            process.env.PB_SUPERUSER_PASSWORD,
        ).finally(() => {
            authPromise = null;
        });
    }

    if (authPromise) {
        await authPromise;
    }

    if (pocketbaseClient.authStore.isValid && pocketbaseClient.authStore.token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = pocketbaseClient.authStore.token;
    }

    return { url, options };
};

(async () => {
	try {
		await waitForHealth();

		if (!pocketbaseClient.authStore.isValid && !authPromise) {
			authPromise = pocketbaseClient.collection('_superusers').authWithPassword(
				process.env.PB_SUPERUSER_EMAIL,
				process.env.PB_SUPERUSER_PASSWORD,
			).finally(() => {
				authPromise = null;
			});
		}

		if (authPromise) {
			await authPromise;
		}

		logger.info(`PocketBase client initialized successfully (${POCKETBASE_HOST})`);
	} catch (err) {
		// Keep the API process alive even if PocketBase is temporarily unavailable.
		logger.error('PocketBase initialization failed (continuing without hard exit):', err);
	}
})();

export default pocketbaseClient;
export { pocketbaseClient };
