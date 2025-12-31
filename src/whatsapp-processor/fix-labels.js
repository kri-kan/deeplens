const { Client } = require('pg');
const pino = require('pino');

const logger = pino({ level: 'info' });

async function fixNumericLabels() {
    const client = new Client({
        connectionString: 'postgresql://postgres:DeepLens123!@localhost:5432/whatsapp_vayyari_data'
    });

    try {
        await client.connect();
        logger.info('Connected to database to fix numeric labels');

        // Find chats with numeric names (likely LIDs)
        const res = await client.query(`
            SELECT jid, name FROM chats 
            WHERE name ~ '^[0-9]+$' OR name LIKE '%@%'
        `);

        logger.info(`Found ${res.rows.length} chats with numeric or JID names`);

        let fixedCount = 0;
        for (const row of res.rows) {
            const jid = row.jid;

            // Try to find a pushName in messages for this JID
            const msgRes = await client.query(`
                SELECT sender_name FROM messages 
                WHERE jid = $1 AND sender_name IS NOT NULL AND sender_name !~ '^[0-9]+$'
                LIMIT 1
            `, [jid]);

            if (msgRes.rows.length > 0) {
                const newName = msgRes.rows[0].sender_name;
                logger.info(`Fixing ${jid}: ${row.name} -> ${newName}`);
                await client.query('UPDATE chats SET name = $1 WHERE jid = $2', [newName, jid]);
                fixedCount++;
            } else {
                // Try searching for this sender in other chats (if it's a person we've seen elsewhere)
                const senderRes = await client.query(`
                    SELECT sender_name FROM messages 
                    WHERE sender = $1 AND sender_name IS NOT NULL AND sender_name !~ '^[0-9]+$'
                    LIMIT 1
                `, [jid]);

                if (senderRes.rows.length > 0) {
                    const newName = senderRes.rows[0].sender_name;
                    logger.info(`Fixing ${jid} (from sender history): ${row.name} -> ${newName}`);
                    await client.query('UPDATE chats SET name = $1 WHERE jid = $2', [newName, jid]);
                    fixedCount++;
                }
            }
        }

        logger.info(`Successfully fixed ${fixedCount} chat labels`);

    } catch (err) {
        logger.error({ err }, 'Failed to fix numeric labels');
    } finally {
        await client.end();
    }
}

fixNumericLabels();
