const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://vayyari_wa_user:DeepLens123!@localhost:5432/whatsapp_vayyari_data' });
async function run() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, metadata FROM messages WHERE (content IS NULL OR content = '') AND metadata IS NOT NULL");
        console.log(`Found ${res.rows.length} messages to update`);
        for (const row of res.rows) {
            const msg = row.metadata;
            let content = '';
            if (msg.conversation) content = msg.conversation;
            else if (msg.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
            else if (msg.imageMessage) content = msg.imageMessage.caption || '[Image]';
            else if (msg.videoMessage) content = msg.videoMessage.caption || '[Video]';
            else if (msg.audioMessage) content = '[Audio]';
            else if (msg.stickerMessage) content = '[Sticker]';
            else if (msg.documentMessage) content = msg.documentMessage.fileName || '[Document]';
            else if (msg.templateMessage) content = '[Template Message]';
            else if (msg.protocolMessage) content = '[Protocol Message]';

            if (content) {
                await client.query('UPDATE messages SET content = $1 WHERE id = $2', [content, row.id]);
            }
        }
        console.log('Update complete');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
