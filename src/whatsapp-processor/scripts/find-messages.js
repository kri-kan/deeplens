const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function findJidWithMessages() {
    const client = new Client({
        connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING
    });
    await client.connect();

    const res = await client.query("SELECT jid, COUNT(*) FROM messages GROUP BY jid ORDER BY count DESC LIMIT 10");
    console.log('Top JIDs in messages table:');
    console.log(JSON.stringify(res.rows, null, 2));

    const chats = await client.query("SELECT jid, name, canonical_jid FROM chats WHERE jid IN (SELECT jid FROM messages GROUP BY jid ORDER BY COUNT(*) DESC LIMIT 10)");
    console.log('Corresponding chats:');
    console.log(JSON.stringify(chats.rows, null, 2));

    await client.end();
}

findJidWithMessages().catch(console.error);
