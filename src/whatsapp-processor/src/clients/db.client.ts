import { Client } from 'pg';
import { VAYYARI_WA_DB_CONNECTION_STRING } from '../config';
import { logger } from '../utils/logger';

// Shared Database Client for both DeepLens and WhatsApp
export let dbClient: Client | null = null;

/**
 * Initializes the database client connection
 */
export async function initializeDbClient(): Promise<void> {
    if (!VAYYARI_WA_DB_CONNECTION_STRING) {
        logger.error('No database connection string provided');
        return;
    }

    dbClient = new Client({ connectionString: VAYYARI_WA_DB_CONNECTION_STRING });

    try {
        await dbClient.connect();
        logger.info(`Connected to Database: ${VAYYARI_WA_DB_CONNECTION_STRING.split('/').pop()}`);
    } catch (err) {
        logger.error({ err }, 'Failed to connect to Database');
        dbClient = null;
    }
}

/**
 * Gets the database client instance
 * Historically separated, now sharing the same instance
 */
export function getDeepLensDbClient(): Client | null {
    return dbClient;
}

export function getWhatsAppDbClient(): Client | null {
    return dbClient;
}

// Keeping these for initialization compatibility in index.ts
export const initializeDeepLensDbClient = initializeDbClient;
export const initializeWhatsAppDbClient = async () => {}; // No-op as it's already initialized
