import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Support both lowercase (preferred) and uppercase (deprecated) env var names
const getEnvVar = (lowercase: string, uppercase: string): string | undefined => {
    const lowerValue = process.env[lowercase];
    const upperValue = process.env[uppercase];

    if (upperValue && !lowerValue) {
        console.warn(`⚠️  WARNING: Using deprecated uppercase env var ${uppercase}. Please use ${lowercase} instead.`);
        return upperValue;
    }

    return lowerValue || upperValue;
};

// --- Session Configuration ---
export const SESSION_ID = process.env.SESSION_ID || 'default_session';
export const TENANT_NAME = process.env.TENANT_NAME || 'standalone';
export const DATA_DIR = process.env.DATA_DIR || './sessions';

// --- MinIO Configuration ---
export const MINIO_CONFIG = {
    endpoint: process.env.MINIO_ENDPOINT || 'deeplens-minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'whatsapp-data',
    useSSL: false
};

// --- Redis Configuration ---
export const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '1')
};


// --- Database Configuration ---
// DeepLens Core Database (for tenant metadata, feature extraction, etc.)
export const DEEPLENS_VAYYARI_CONNECTION_STRING = getEnvVar(
    'deeplens_vayyari_connection_string',
    'DEEPLENS_VAYYARI_CONNECTION_STRING'
);

// WhatsApp Data Database (for messages, chats, media metadata)
export const VAYYARI_WA_DB_CONNECTION_STRING = getEnvVar(
    'vayyari_wa_db_connection_string',
    'VAYYARI_WA_DB_CONNECTION_STRING'
);

// Validate database configuration
if (!VAYYARI_WA_DB_CONNECTION_STRING) {
    console.error('❌ ERROR: vayyari_wa_db_connection_string is required but not set in .env file');
    console.error('   Please copy .env.example to .env and configure your database connection.');
}

if (VAYYARI_WA_DB_CONNECTION_STRING && VAYYARI_WA_DB_CONNECTION_STRING.includes(':5432/')) {
    console.warn('⚠️  WARNING: Database connection string uses port 5432.');
    console.warn('   If using DeepLens Podman infrastructure, the correct port is 5433.');
    console.warn('   See infrastructure/setup-deeplens-dev.ps1 for details.');
}

// --- Server Configuration ---
export const API_PORT = parseInt(process.env.API_PORT || '3000');
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const SYNC_NEWSLETTERS = process.env.SYNC_NEWSLETTERS === 'true'; // Disabled by default

// --- Paths ---
export const SESSION_PATH = path.join(DATA_DIR, SESSION_ID);
export const CONFIG_PATH = path.join(DATA_DIR, 'config');
export const WHITELIST_FILE = path.join(CONFIG_PATH, 'whitelist.json');

// --- Rate Limiter Configuration ---
export const RATE_LIMIT_CONFIG = {
    maxRequestsPerMinute: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE || '30'),
    minDelayMs: parseInt(process.env.RATE_LIMIT_MIN_DELAY_MS || '1000'),
    maxDelayMs: parseInt(process.env.RATE_LIMIT_MAX_DELAY_MS || '3000'),
    jitterPercent: parseInt(process.env.RATE_LIMIT_JITTER_PERCENT || '30'),
};

// --- Default Tracking Policies ---
export const DEFAULT_TRACK_GROUPS = process.env.DEFAULT_TRACK_GROUPS === 'true'; // Blueprint: false
export const DEFAULT_TRACK_PRIVATE = process.env.DEFAULT_TRACK_PRIVATE !== 'false'; // Blueprint: true

// --- Kafka Configuration ---
export const KAFKA_CONFIG = {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'whatsapp-processor',
    groupId: process.env.KAFKA_GROUP_ID || 'whatsapp-processing-group',
    topic: process.env.KAFKA_TOPIC || 'whatsapp-ready-messages'
};

