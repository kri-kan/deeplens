const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkTimestamps() {
    const client = new Client({
        connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING
    });
    await client.connect();

    const res = await client.query("SELECT COUNT(*) FROM messages WHERE timestamp IS NULL OR timestamp = 0");
    console.log('Bad timestamps:', res.rows[0].count);

    const samples = await client.query("SELECT timestamp FROM messages LIMIT 10");
    console.log('Sample timestamps:', JSON.stringify(samples.rows, null, 2));

    await client.end();
}

checkTimestamps().catch(console.error);
