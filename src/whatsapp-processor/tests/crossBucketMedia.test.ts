import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { minioClient } from '../src/clients/minio.client';
import { getPresignedUrl } from '../src/clients/media.client';
import { MINIO_CONFIG } from '../src/config';

describe('Cross-Bucket MinIO Presigned URL Resolution (ADO #617)', () => {
    test('resolves standard objectName using default bucket (MINIO_CONFIG.bucket)', async () => {
        let capturedBucket = '';
        let capturedObjectName = '';
        const originalPresigned = minioClient.presignedGetObject;

        minioClient.presignedGetObject = (async (bucket: string, objectName: string, expiry?: number) => {
            capturedBucket = bucket;
            capturedObjectName = objectName;
            return `http://minio:9000/${bucket}/${objectName}?token=dummy`;
        }) as any;

        try {
            const url = await getPresignedUrl('photos/120363_g_us/123_photo.jpg');
            assert.equal(capturedBucket, MINIO_CONFIG.bucket);
            assert.equal(capturedObjectName, 'photos/120363_g_us/123_photo.jpg');
            assert.ok(url.includes(MINIO_CONFIG.bucket));
        } finally {
            minioClient.presignedGetObject = originalPresigned;
        }
    });

    test('resolves objectName with explicit bucket parameter', async () => {
        let capturedBucket = '';
        let capturedObjectName = '';
        const originalPresigned = minioClient.presignedGetObject;

        minioClient.presignedGetObject = (async (bucket: string, objectName: string) => {
            capturedBucket = bucket;
            capturedObjectName = objectName;
            return `http://minio:9000/${bucket}/${objectName}?token=dummy`;
        }) as any;

        try {
            const url = await getPresignedUrl('product_abc123/img_1.jpg', 'general');
            assert.equal(capturedBucket, 'general');
            assert.equal(capturedObjectName, 'product_abc123/img_1.jpg');
            assert.match(url, /http:\/\/minio:9000\/general\/product_abc123/);
        } finally {
            minioClient.presignedGetObject = originalPresigned;
        }
    });

    test('extracts bucket and objectName from minio://general/... URI', async () => {
        let capturedBucket = '';
        let capturedObjectName = '';
        const originalPresigned = minioClient.presignedGetObject;

        minioClient.presignedGetObject = (async (bucket: string, objectName: string) => {
            capturedBucket = bucket;
            capturedObjectName = objectName;
            return `http://minio:9000/${bucket}/${objectName}?token=dummy`;
        }) as any;

        try {
            const url = await getPresignedUrl('minio://general/product_e272d897-7522-4bde-b3eb/1779778634360_IMG_0006.MOV');
            assert.equal(capturedBucket, 'general');
            assert.equal(capturedObjectName, 'product_e272d897-7522-4bde-b3eb/1779778634360_IMG_0006.MOV');
            assert.match(url, /http:\/\/minio:9000\/general\/product_e272d897/);
        } finally {
            minioClient.presignedGetObject = originalPresigned;
        }
    });

    test('extracts bucket and objectName from minio://whatsapp-data/... URI', async () => {
        let capturedBucket = '';
        let capturedObjectName = '';
        const originalPresigned = minioClient.presignedGetObject;

        minioClient.presignedGetObject = (async (bucket: string, objectName: string) => {
            capturedBucket = bucket;
            capturedObjectName = objectName;
            return `http://minio:9000/${bucket}/${objectName}?token=dummy`;
        }) as any;

        try {
            const url = await getPresignedUrl('minio://whatsapp-data/stickers/120363025595_g_us/1783698898803.webp');
            assert.equal(capturedBucket, 'whatsapp-data');
            assert.equal(capturedObjectName, 'stickers/120363025595_g_us/1783698898803.webp');
            assert.match(url, /http:\/\/minio:9000\/whatsapp-data\/stickers/);
        } finally {
            minioClient.presignedGetObject = originalPresigned;
        }
    });

    test('extracts bucket from prefix paths (whatsapp-data/profiles/... and general/...)', async () => {
        let capturedBucket = '';
        let capturedObjectName = '';
        const originalPresigned = minioClient.presignedGetObject;

        minioClient.presignedGetObject = (async (bucket: string, objectName: string) => {
            capturedBucket = bucket;
            capturedObjectName = objectName;
            return `http://minio:9000/${bucket}/${objectName}?token=dummy`;
        }) as any;

        try {
            // Test whatsapp-data prefix
            await getPresignedUrl('whatsapp-data/profiles/102474228719726_1782652191974.jpg');
            assert.equal(capturedBucket, 'whatsapp-data');
            assert.equal(capturedObjectName, 'profiles/102474228719726_1782652191974.jpg');

            // Test general prefix
            await getPresignedUrl('general/catalog/thumbnails/saree_456.webp');
            assert.equal(capturedBucket, 'general');
            assert.equal(capturedObjectName, 'catalog/thumbnails/saree_456.webp');
        } finally {
            minioClient.presignedGetObject = originalPresigned;
        }
    });
});
