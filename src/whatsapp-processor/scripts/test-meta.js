const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function test() {
    const client = new Client({ connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING });
    await client.connect();
    const res = await client.query("SELECT metadata FROM messages WHERE message_type = 'templateMessage' LIMIT 1");
    const m = res.rows[0].metadata;
    console.log('Keys:', Object.keys(m));
    if (m.templateMessage) {
        console.log('templateMessage keys:', Object.keys(m.templateMessage));
        const t = m.templateMessage.hydratedTemplate || m.templateMessage.hydratedFourRowTemplate;
        console.log('t exists:', !!t);
        if (t) {
            console.log('t keys:', Object.keys(t));
            console.log('Content:', t.hydratedContentText);
        }
    }
    await client.end();
}
test();
