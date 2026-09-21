import { getWhatsAppDbClient, initializeDbClient } from '../clients/db.client';
import { zoningService } from '../services/zoning.service';
import { logger } from '../utils/logger';

export async function runRepartition() {
    await initializeDbClient();
    const client = getWhatsAppDbClient();
    if (!client) {
        logger.error('Failed to connect to WhatsApp database');
        process.exit(1);
    }

    const targetJid = '120363345527865021@g.us';
    logger.info({ targetJid }, 'Starting emoji separator re-partitioning and re-zoning for Fashion Zone...');

    // 1. Rezone chat completely using updated ZoningService
    const rezoneResult = await zoningService.rezoneChat(targetJid, client);
    logger.info(rezoneResult, 'Chat re-zoning finished');

    // 2. Sync wa.message_groups table with newly partitioned product groups
    logger.info('Syncing wa.message_groups entries for newly created product groups...');
    
    // Insert new message groups that do not yet exist
    await client.query(`
        INSERT INTO wa.message_groups (
            group_id, jid, status, process_as_product, media_count, text_count, description, last_message_at, created_at, updated_at
        )
        SELECT 
            m.group_id,
            $1::varchar as jid,
            'staging' as status,
            (COUNT(*) FILTER (WHERE m.media_type IN ('image', 'video', 'photo', 'document')) > 0) as process_as_product,
            COUNT(*) FILTER (WHERE m.media_type IN ('image', 'video', 'photo', 'document')) as media_count,
            COUNT(*) FILTER (WHERE m.media_type IS NULL OR m.media_type = 'text') as text_count,
            STRING_AGG(CASE WHEN m.media_type IS NULL OR m.media_type = 'text' THEN m.content ELSE NULL END, E'\n\n' ORDER BY m.timestamp ASC) as description,
            to_timestamp(MAX(m.timestamp)) AT TIME ZONE 'UTC' as last_message_at,
            NOW() as created_at,
            NOW() as updated_at
        FROM wa.messages m
        WHERE m.jid = $1::varchar 
          AND m.group_id IS NOT NULL 
          AND m.group_id LIKE 'product_%'
          AND m.is_deleted = false
          AND NOT EXISTS (
              SELECT 1 FROM wa.message_groups mg WHERE mg.group_id = m.group_id
          )
        GROUP BY m.group_id;
    `, [targetJid]);

    // Update counts and descriptions for any existing groups that were modified
    await client.query(`
        UPDATE wa.message_groups mg
        SET 
            media_count = stats.media_count,
            text_count = stats.text_count,
            description = stats.description,
            last_message_at = stats.last_message_at,
            updated_at = NOW()
        FROM (
            SELECT 
                m.group_id,
                COUNT(*) FILTER (WHERE m.media_type IN ('image', 'video', 'photo', 'document')) as media_count,
                COUNT(*) FILTER (WHERE m.media_type IS NULL OR m.media_type = 'text') as text_count,
                STRING_AGG(CASE WHEN m.media_type IS NULL OR m.media_type = 'text' THEN m.content ELSE NULL END, E'\n\n' ORDER BY m.timestamp ASC) as description,
                to_timestamp(MAX(m.timestamp)) AT TIME ZONE 'UTC' as last_message_at
            FROM wa.messages m
            WHERE m.jid = $1::varchar 
              AND m.group_id IS NOT NULL 
              AND m.group_id LIKE 'product_%'
              AND m.is_deleted = false
            GROUP BY m.group_id
        ) stats
        WHERE mg.group_id = stats.group_id AND mg.jid = $1::varchar;
    `, [targetJid]);

    // 3. Delete any empty or obsolete message groups
    const deletedRes = await client.query(`
        DELETE FROM wa.message_groups 
        WHERE jid = $1 
          AND (
              group_id NOT IN (SELECT DISTINCT group_id FROM wa.messages WHERE jid = $1 AND group_id IS NOT NULL)
              OR media_count = 0
          )
          AND deeplens_product_id IS NULL;
    `, [targetJid]);
    logger.info({ deletedCount: deletedRes.rowCount }, 'Cleaned up empty / obsolete message groups');

    // 4. Inspect resulting groups in Fashion Zone
    const statsRes = await client.query(`
        SELECT 
            COUNT(*) as total_groups,
            MAX(media_count) as max_media_in_group,
            AVG(media_count)::numeric(10,1) as avg_media_in_group,
            COUNT(*) FILTER (WHERE media_count > 50) as groups_over_50_media
        FROM wa.message_groups
        WHERE jid = $1 AND group_id LIKE 'product_%';
    `, [targetJid]);
    
    logger.info(statsRes.rows[0], 'Fashion Zone group statistics after re-zoning');
}

if (require.main === module) {
    runRepartition().then(() => {
        logger.info('Repartition script completed successfully.');
        process.exit(0);
    }).catch(err => {
        logger.error({ err }, 'Repartition script failed');
        process.exit(1);
    });
}
