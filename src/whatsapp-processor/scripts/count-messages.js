const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function countMessages() {
    const client = new Client({ connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING });
    await client.connect();

    const jid = '918097097504@s.whatsapp.net';
    const res = await client.query('SELECT COUNT(*) FROM messages WHERE jid = $1', [jid]);
    console.log(`Message count for ${jid}: ${res.rows[0].count}`);

    const groups = await client.query("SELECT jid, COUNT(*) FROM messages GROUP BY jid ORDER BY count DESC LIMIT 5");
    console.log('Top chats by message count:', JSON.stringify(groups.rows, null, 2));

    await client.end();
}

countMessages().catch(console.error);
