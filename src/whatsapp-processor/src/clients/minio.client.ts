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
        const bucketName = MINIO_CONFIG.bucket;
        logger.info({ bucket: bucketName }, 'Checking MinIO bucket existence...');

        const exists = await minioClient.bucketExists(bucketName);

        if (!exists) {
            logger.warn({ bucket: bucketName }, 'Bucket does not exist, creating...');

            try {
                await minioClient.makeBucket(bucketName, 'us-east-1');
                logger.info({ bucket: bucketName }, '✅ Bucket created successfully');
            } catch (createErr: any) {
                // If bucket already exists (race condition), that's fine
                if (createErr.code === 'BucketAlreadyOwnedByYou' || createErr.code === 'BucketAlreadyExists') {
                    logger.info({ bucket: bucketName }, 'Bucket already exists (created by another process)');
                } else {
                    throw createErr;
                }
            }
        } else {
            logger.info({ bucket: bucketName }, '✅ Bucket exists');
        }

        // Set bucket policy to allow read access (optional, for development)
        try {
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
            logger.debug({ bucket: bucketName }, 'Bucket policy set for public read access');
        } catch (policyErr) {
            // Policy setting is optional, don't fail if it doesn't work
            logger.debug({ err: policyErr }, 'Could not set bucket policy (non-critical)');
        }

    } catch (err: any) {
        logger.error({ err: err.message, config: MINIO_CONFIG }, '❌ Failed to verify/create MinIO bucket');
        throw new Error(`MinIO bucket setup failed: ${err.message}`);
    }
}

/**
 * Clears all objects from the MinIO bucket
 * Used for reset/cleanup operations
 */
export async function clearBucket(): Promise<number> {
    try {
        const bucketName = MINIO_CONFIG.bucket;
        logger.info({ bucket: bucketName }, 'Clearing MinIO bucket...');

        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            logger.warn({ bucket: bucketName }, 'Bucket does not exist, nothing to clear');
            return 0;
        }

        // List all objects
        const objectsList: string[] = [];
        const objectsStream = minioClient.listObjects(bucketName, '', true);

        await new Promise<void>((resolve, reject) => {
            objectsStream.on('data', (obj) => {
                if (obj.name) {
                    objectsList.push(obj.name);
                }
            });
            objectsStream.on('error', reject);
            objectsStream.on('end', resolve);
        });

        if (objectsList.length === 0) {
            logger.info({ bucket: bucketName }, 'Bucket is already empty');
            return 0;
        }

        // Delete all objects
        logger.info({ bucket: bucketName, count: objectsList.length }, 'Deleting objects...');
        await minioClient.removeObjects(bucketName, objectsList);

        logger.info({ bucket: bucketName, deleted: objectsList.length }, '✅ Bucket cleared successfully');
        return objectsList.length;

    } catch (err: any) {
        logger.error({ err: err.message }, '❌ Failed to clear MinIO bucket');
        throw new Error(`MinIO bucket clear failed: ${err.message}`);
    }
}
