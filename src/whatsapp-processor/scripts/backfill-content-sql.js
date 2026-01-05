const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
    const client = new Client({ connectionString: process.env.VAYYARI_WA_DB_CONNECTION_STRING });
    await client.connect();

    // Update template messages using JSONB operators - VERY efficient
    const res1 = await client.query(`
    UPDATE messages 
    SET content = COALESCE(
        metadata->'templateMessage'->'hydratedTemplate'->>'hydratedContentText',
        metadata->'templateMessage'->'hydratedFourRowTemplate'->>'hydratedContentText'
    )
    WHERE message_type = 'templateMessage' 
    AND (content = '' OR content IS NULL)
  `);
    console.log(`Migrated ${res1.rowCount} template messages`);

    // Update interactive messages
    const res2 = await client.query(`
    UPDATE messages 
    SET content = metadata->'interactiveMessage'->'body'->>'text'
    WHERE message_type = 'interactiveMessage' 
    AND (content = '' OR content IS NULL)
  `);
    console.log(`Migrated ${res2.rowCount} interactive messages`);

    // Update buttons messages
    const res3 = await client.query(`
    UPDATE messages 
    SET content = metadata->'buttonsMessage'->>'contentText'
    WHERE message_type = 'buttonsMessage' 
    AND (content = '' OR content IS NULL)
  `);
    console.log(`Migrated ${res3.rowCount} buttons messages`);

    await client.end();
}

migrate().catch(console.error);
