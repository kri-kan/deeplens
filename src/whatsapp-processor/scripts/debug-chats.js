const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function queryChats() {
    const client = new Client({
        connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING
    });
    await client.connect();

    const res = await client.query("SELECT jid, name, is_group, canonical_jid FROM chats LIMIT 20");
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

queryChats().catch(console.error);
