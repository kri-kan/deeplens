import { Client } from 'pg';
import { DEEPLENS_VAYYARI_CONNECTION_STRING, VAYYARI_WA_DB_CONNECTION_STRING } from '../config';
import pino from 'pino';

const logger = pino({ level: 'info' });

// DeepLens Core Database Client (for tenant metadata, feature extraction, etc.)
export let deeplensDbClient: Client | null = null;

// WhatsApp Data Database Client (for messages, chats, media metadata)
export let whatsappDbClient: Client | null = null;

/**
 * Initializes the DeepLens core database client connection
 */
export async function initializeDeepLensDbClient(): Promise<void> {
    if (!DEEPLENS_VAYYARI_CONNECTION_STRING) {
        logger.info('No DEEPLENS_VAYYARI_CONNECTION_STRING provided, skipping DeepLens DB connection');
        return;
    }

    deeplensDbClient = new Client({ connectionString: DEEPLENS_VAYYARI_CONNECTION_STRING });

    try {
        await deeplensDbClient.connect();
        logger.info(`Connected to DeepLens DB: ${DEEPLENS_VAYYARI_CONNECTION_STRING.split('/').pop()}`);
    } catch (err) {
        logger.error({ err }, 'Failed to connect to DeepLens DB');
        deeplensDbClient = null;
    }
}

/**
 * Initializes the WhatsApp database client connection
 */
export async function initializeWhatsAppDbClient(): Promise<void> {
    if (!VAYYARI_WA_DB_CONNECTION_STRING) {
        logger.warn('No VAYYARI_WA_DB_CONNECTION_STRING provided, WhatsApp data will not be persisted to database');
        return;
    }

    whatsappDbClient = new Client({ connectionString: VAYYARI_WA_DB_CONNECTION_STRING });

    try {
        await whatsappDbClient.connect();
        logger.info(`Connected to WhatsApp DB: ${VAYYARI_WA_DB_CONNECTION_STRING.split('/').pop()}`);
    } catch (err) {
        logger.error({ err }, 'Failed to connect to WhatsApp DB');
        whatsappDbClient = null;
    }
}

/**
 * Gets the DeepLens database client instance
 */
export function getDeepLensDbClient(): Client | null {
    return deeplensDbClient;
}

/**
 * Gets the WhatsApp database client instance
 */
export function getWhatsAppDbClient(): Client | null {
    if (!whatsappDbClient) {
        // console.log('DEBUG: whatsappDbClient is null');
    }
    return whatsappDbClient;
}
