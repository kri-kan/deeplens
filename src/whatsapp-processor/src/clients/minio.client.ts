import * as Minio from 'minio';
import { MINIO_CONFIG } from '../config';
import pino from 'pino';

const logger = pino({ level: 'info' });

export const minioClient = new Minio.Client({
    endPoint: MINIO_CONFIG.endpoint,
    port: MINIO_CONFIG.port,
    useSSL: MINIO_CONFIG.useSSL,
    accessKey: MINIO_CONFIG.accessKey,
    secretKey: MINIO_CONFIG.secretKey
});

/**
 * Ensures that the MinIO bucket exists
 */
export async function ensureBucketExists(): Promise<void> {
    try {
        const exists = await minioClient.bucketExists(MINIO_CONFIG.bucket);
        if (!exists) {
            logger.warn(`Bucket ${MINIO_CONFIG.bucket} does not exist. In Production, this should be pre-provisioned.`);
            // await minioClient.makeBucket(MINIO_CONFIG.bucket, 'us-east-1'); // Optional: Auto-create
        }
    } catch (err) {
        logger.warn({ err }, 'Could not verify MinIO Bucket');
    }
}
