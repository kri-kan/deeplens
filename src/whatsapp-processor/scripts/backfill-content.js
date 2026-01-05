const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function backfillMessageContent() {
    const client = new Client({
        connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query(`
      SELECT id, message_id, message_type, metadata 
      FROM messages 
      WHERE (content = '' OR content IS NULL) 
    `);

        console.log(`Checking ${res.rows.length} messages for content extraction...`);

        let updatedCount = 0;
        for (const row of res.rows) {
            let content = '';
            const metadata = row.metadata;

            // Try to find the message body in various structures Baileys uses
            const findText = (m) => {
                if (!m) return null;
                if (typeof m === 'string') return m;

                // Template
                if (m.templateMessage) {
                    const t = m.templateMessage.hydratedTemplate || m.templateMessage.hydratedFourRowTemplate;
                    return t?.hydratedContentText;
                }

                // Buttons
                if (m.buttonsMessage) return m.buttonsMessage.contentText;

                // Interactive
                if (m.interactiveMessage) return m.interactiveMessage.body?.text;

                // List
                if (m.listMessage) return m.listMessage.description || m.listMessage.title;

                // Conversation / Text
                if (m.conversation) return m.conversation;
                if (m.extendedTextMessage) return m.extendedTextMessage.text;

                // Media
                if (m.imageMessage) return m.imageMessage.caption;
                if (m.videoMessage) return m.videoMessage.caption;

                return null;
            };

            // Search at top level, then inside .message
            content = findText(metadata) || findText(metadata.message);

            if (content) {
                await client.query('UPDATE messages SET content = $1 WHERE id = $2', [content, row.id]);
                updatedCount++;
            }
        }
        console.log(`Successfully backfilled ${updatedCount} messages`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

backfillMessageContent();
