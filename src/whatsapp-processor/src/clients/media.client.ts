import { minioClient } from './minio.client';
import { MINIO_CONFIG } from '../config';
import pino from 'pino';
import { Readable } from 'stream';

const logger = pino({ level: 'info' });

export type MediaType = 'photo' | 'video' | 'audio' | 'document';

/**
 * Gets the folder path for a media type
 */
function getMediaFolder(mediaType: MediaType): string {
    const folderMap: Record<MediaType, string> = {
        photo: 'photos',
        video: 'videos',
        audio: 'audio',
        document: 'documents'
    };
    return folderMap[mediaType] || 'documents';
}

/**
 * Uploads media to MinIO and returns the URL
 * 
 * Note: Bucket existence is guaranteed by ensureBucketExists() called at application startup.
 * No need to verify bucket on every upload - it's a performance optimization.
 */
export async function uploadMedia(
    buffer: Buffer,
    jid: string,
    filename: string,
    mediaType: MediaType
): Promise<string> {
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

            return url;
        } catch (err: any) {
            lastError = err;
            logger.warn({
                err: err.message,
                jid,
                filename,
                attempt,
                maxRetries,
                endpoint: MINIO_CONFIG.endpoint,
                bucket: MINIO_CONFIG.bucket
            }, `Failed to upload media (attempt ${attempt}/${maxRetries})`);

            // Don't retry on certain errors
            if (err.code === 'NoSuchBucket' || err.code === 'InvalidAccessKeyId') {
                logger.error({ err: err.message }, 'Fatal MinIO error - bucket may not exist. Check startup logs.');
                break;
            }

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    logger.error({ err: lastError, jid, filename }, 'Failed to upload media to MinIO after all retries');
    throw lastError || new Error('Upload failed');
}

/**
 * Gets the public URL for a media object (for future HTTP access)
 */
export async function getMediaUrl(objectName: string): Promise<string> {
    try {
        // Generate a presigned URL valid for 7 days
        const url = await minioClient.presignedGetObject(
            MINIO_CONFIG.bucket,
            objectName,
            7 * 24 * 60 * 60
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
