const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function syncLastMessages() {
    const client = new Client({
        connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Update chats.last_message_text using the most recent message's content
        const res = await client.query(`
      WITH latest_messages AS (
        SELECT DISTINCT ON (jid)
          jid,
          content,
          timestamp,
          is_from_me
        FROM messages
        ORDER BY jid, timestamp DESC, id DESC
      )
      UPDATE chats
      SET 
        last_message_text = latest_messages.content,
        last_message_timestamp = latest_messages.timestamp,
        last_message_from_me = latest_messages.is_from_me
      FROM latest_messages
      WHERE chats.jid = latest_messages.jid
      AND (chats.last_message_text = '' OR chats.last_message_text IS NULL OR chats.last_message_timestamp < latest_messages.timestamp)
    `);

        console.log(`Updated ${res.rowCount} chats with latest message info`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

syncLastMessages();
