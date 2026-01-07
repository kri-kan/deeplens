import { minioClient } from './minio.client';
import { MINIO_CONFIG } from '../config';
import pino from 'pino';
import { Readable } from 'stream';

const logger = pino({ level: 'info' });

// Track MinIO availability to avoid repeated failed attempts
let isMinIOAvailable = true;
let lastMinIOCheck = 0;
const MINIO_CHECK_INTERVAL = 60000; // Re-check every 60 seconds

export type MediaType = 'photo' | 'video' | 'audio' | 'document' | 'sticker';

/**
 * Sets MinIO availability status
 */
export function setMinIOAvailability(available: boolean): void {
    isMinIOAvailable = available;
    lastMinIOCheck = Date.now();
    if (!available) {
        logger.warn('⚠️  MinIO marked as unavailable - media uploads will be skipped');
    } else {
        logger.info('✅ MinIO marked as available');
    }
}

/**
 * Gets MinIO availability status
 */
export function getMinIOAvailability(): boolean {
    return isMinIOAvailable;
}

/**
 * Gets the folder path for a media type
 */
function getMediaFolder(mediaType: MediaType): string {
    const folderMap: Record<MediaType, string> = {
        photo: 'photos',
        video: 'videos',
        audio: 'audio',
        document: 'documents',
        sticker: 'stickers'
    };
    return folderMap[mediaType] || 'documents';
}

/**
 * Uploads media to MinIO and returns the URL
 * Returns null if MinIO is unavailable (graceful degradation)
 * 
 * Note: Bucket existence is guaranteed by ensureBucketExists() called at application startup.
 * No need to verify bucket on every upload - it's a performance optimization.
 */
export async function uploadMedia(
    buffer: Buffer,
    jid: string,
    filename: string,
    mediaType: MediaType
): Promise<string | null> {
    // Fast-fail if MinIO is known to be unavailable
    if (!isMinIOAvailable && (Date.now() - lastMinIOCheck) < MINIO_CHECK_INTERVAL) {
        logger.debug({ jid, filename }, 'Skipping media upload - MinIO unavailable');
        return null;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const timestamp = Date.now();
            const folder = getMediaFolder(mediaType);
            const sanitizedJid = jid.replace(/[^a-zA-Z0-9]/g, '_');
            const objectName = `${folder}/${sanitizedJid}/${timestamp}_${filename}`;

            // Convert buffer to stream
            const stream = Readable.from(buffer);

            await minioClient.putObject(
                MINIO_CONFIG.bucket,
                objectName,
                stream,
                buffer.length
            );

            // Return the MinIO URL (can be updated later for DeepLens migration)
            const url = `minio://${MINIO_CONFIG.bucket}/${objectName}`;

            logger.info({ objectName, size: buffer.length, attempt }, 'Media uploaded to MinIO');

            // Mark MinIO as available if it was previously down
            if (!isMinIOAvailable) {
                setMinIOAvailability(true);
            }

            return url;
        } catch (err: any) {
            lastError = err;
            logger.warn({
                err: err.message,
                code: err.code,
                jid,
                filename,
                attempt,
                maxRetries,
                endpoint: MINIO_CONFIG.endpoint,
                bucket: MINIO_CONFIG.bucket
            }, `Failed to upload media (attempt ${attempt}/${maxRetries})`);

            // Don't retry on certain errors
            if (err.code === 'NoSuchBucket' || err.code === 'InvalidAccessKeyId' || err.code === 'ECONNREFUSED') {
                logger.error({
                    err: err.message,
                    code: err.code
                }, 'Fatal MinIO error - marking as unavailable');
                setMinIOAvailability(false);
                break;
            }

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    logger.error({
        err: lastError?.message,
        code: (lastError as any)?.code,
        jid,
        filename
    }, 'Failed to upload media to MinIO after all retries - continuing without media');

    // Mark MinIO as unavailable after repeated failures
    setMinIOAvailability(false);

    // Return null instead of throwing - allow message processing to continue
    return null;
}

/**
 * Gets a presigned URL for a media object with configurable TTL
 */
export async function getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    try {
        const url = await minioClient.presignedGetObject(
            MINIO_CONFIG.bucket,
            objectName,
            expirySeconds
        );
        return url;
    } catch (err) {
        logger.error({ err, objectName }, 'Failed to generate presigned URL');
        throw err;
    }
}


/**
 * Updates media URL in the database (for future DeepLens migration)
 */
export function updateMediaUrlForDeepLens(oldUrl: string, newUrl: string): string {
    // This will be used when migrating from MinIO to DeepLens bucket
    // For now, just return the old URL
    // In the future, this will update the database records
    return newUrl;
}
