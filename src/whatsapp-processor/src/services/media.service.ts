import { logger } from '../utils/logger';
import { getWhatsAppDbClient, getDeepLensDbClient } from '../clients/db.client';
import { uploadFile, deleteFile } from '../clients/minio.client';
import { MINIO_CONFIG } from '../config';
import { randomUUID } from 'crypto';

export class MediaService {
    /**
     * Syncs a profile picture for a JID
     * 1. Fetches latest URL from WhatsApp
     * 2. Checks if update is needed
     * 3. Downloads, uploads to MinIO, and registers in DeepLens media table
     */
    public async syncProfilePicture(sock: any, jid: string): Promise<void> {
        try {
            const waClient = getWhatsAppDbClient();
            if (!waClient) return;

            // 1. Get current state from DB
            const chatRes = await waClient.query(
                'SELECT profile_pic_id, profile_pic_url, profile_pic_last_sync FROM wa.chats WHERE jid = $1',
                [jid]
            );

            if (chatRes.rows.length === 0) return;
            const chat = chatRes.rows[0];

            // 2. Fetch latest URL from WhatsApp
            // Using a timeout as Baileys profilePictureUrl can sometimes hang
            let latestUrl: string | undefined;
            try {
                latestUrl = await sock.profilePictureUrl(jid, 'image');
            } catch (err: any) {
                if (err?.output?.statusCode === 404) {
                    // No profile pic set or privacy settings block it
                    logger.debug({ jid }, 'No profile picture found for JID');
                    if (chat.profile_pic_id) {
                        await this.removeProfilePicture(jid, chat.profile_pic_id, chat.profile_pic_url);
                    }
                    return;
                }
                throw err;
            }

            if (!latestUrl) return;

            // 3. Simple change detection (metadata stores the original WA URL if we want, but let's just check sync time)
            // If we synced in the last 24 hours, maybe skip? 
            // Or better: download and check if it's different? 
            // For now, let's just update if it's been more than 12 hours.
            const lastSync = chat.profile_pic_last_sync ? new Date(chat.profile_pic_last_sync).getTime() : 0;
            const now = Date.now();
            if (now - lastSync < 12 * 60 * 60 * 1000 && chat.profile_pic_id) {
                return;
            }

            logger.info({ jid }, 'Syncing profile picture...');

            // 4. Download image
            const response = await fetch(latestUrl);
            if (!response.ok) throw new Error(`Failed to download profile pic: ${response.statusText}`);
            const buffer = Buffer.from(await response.arrayBuffer());

            // 5. Generate new IDs and Path
            const newMediaId = randomUUID();
            const timestamp = Date.now();
            const storagePath = `profiles/${jid.split('@')[0]}_${timestamp}.jpg`;
            const fullStoragePath = `${MINIO_CONFIG.bucket}/${storagePath}`;

            // 6. Upload to MinIO
            await uploadFile(storagePath, buffer, 'image/jpeg');

            // 7. Register in DeepLens media table
            const dlClient = getDeepLensDbClient();
            if (dlClient) {
                await dlClient.query(
                    `INSERT INTO public.media (
                        id, storage_path, media_type, original_filename, 
                        file_size_bytes, mime_type, status, category, subcategory
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        newMediaId,
                        fullStoragePath,
                        1, // Image
                        `${jid}_profile.jpg`,
                        buffer.length,
                        'image/jpeg',
                        0, // Status: Uploaded
                        'whatsapp',
                        'profiles'
                    ]
                );
            }

            // 8. Update WhatsApp chats table
            await waClient.query(
                `UPDATE wa.chats 
                 SET profile_pic_id = $1, profile_pic_url = $2, profile_pic_last_sync = NOW() 
                 WHERE jid = $3`,
                [newMediaId, fullStoragePath, jid]
            );

            // 9. Cleanup OLD media
            if (chat.profile_pic_id) {
                await this.cleanupMedia(chat.profile_pic_id, chat.profile_pic_url);
            }

            logger.info({ jid, mediaId: newMediaId }, '✅ Profile picture synced successfully');

        } catch (err: any) {
            logger.error({ err: err.message, jid }, 'Failed to sync profile picture');
        }
    }

    /**
     * Removes profile picture reference and cleans up storage
     */
    private async removeProfilePicture(jid: string, oldId: string, oldPath: string): Promise<void> {
        const waClient = getWhatsAppDbClient();
        if (waClient) {
            await waClient.query(
                'UPDATE wa.chats SET profile_pic_id = NULL, profile_pic_url = NULL, profile_pic_last_sync = NOW() WHERE jid = $1',
                [jid]
            );
        }
        await this.cleanupMedia(oldId, oldPath);
    }

    /**
     * Cleans up media from DB and MinIO
     */
    private async cleanupMedia(mediaId: string, fullPath: string): Promise<void> {
        try {
            const dlClient = getDeepLensDbClient();
            if (dlClient) {
                await dlClient.query('DELETE FROM public.media WHERE id = $1', [mediaId]);
            }

            // Remove bucket name from path for MinIO client
            const path = fullPath.replace(`${MINIO_CONFIG.bucket}/`, '');
            await deleteFile(path);
            
            logger.debug({ mediaId, path }, 'Cleaned up old profile picture media');
        } catch (err: any) {
            logger.warn({ err: err.message, mediaId }, 'Failed to cleanup old media');
        }
    }
}

export const mediaService = new MediaService();
