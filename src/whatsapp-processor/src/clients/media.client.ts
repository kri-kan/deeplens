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
 */
export async function uploadMedia(
    buffer: Buffer,
    jid: string,
    filename: string,
    mediaType: MediaType
): Promise<string> {
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

        logger.info({ objectName, size: buffer.length }, 'Media uploaded to MinIO');

        return url;
    } catch (err) {
        logger.error({ err, jid, filename }, 'Failed to upload media to MinIO');
        throw err;
    }
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
