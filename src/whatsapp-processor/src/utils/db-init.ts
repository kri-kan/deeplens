import fs from 'fs';
import path from 'path';
import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from './logger';

/**
 * Initializes the database schema by running all SQL scripts in scripts/ddl
 */
export async function initializeDatabaseSchema(): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) {
        logger.warn('WhatsApp DB client not available, skipping schema initialization');
        return;
    }

    const ddlDir = path.join(process.cwd(), 'scripts', 'ddl');
    if (!fs.existsSync(ddlDir)) {
        logger.warn('DDL directory not found, skipping schema initialization');
        return;
    }

    // List of scripts in order
    const scripts = [
        '001_chats.sql',
        '002_messages.sql',
        '003_chat_tracking_state.sql',
        '004_processing_state.sql',
        '005_media_files.sql',
        '006_conversation_sync_state.sql'
    ];

    logger.info('Starting database schema initialization...');

    for (const script of scripts) {
        const scriptPath = path.join(ddlDir, script);
        if (!fs.existsSync(scriptPath)) {
            logger.warn(`Script not found: ${script}`);
            continue;
        }

        try {
            const sql = fs.readFileSync(scriptPath, 'utf-8');
            await client.query(sql);
            logger.info(`Successfully executed ${script}`);
        } catch (err) {
            logger.error({ err, script }, 'Failed to execute DDL script');
            // Continue with other scripts if one fails (might be already existing)
        }
    }

    logger.info('Database schema initialization completed.');
}
