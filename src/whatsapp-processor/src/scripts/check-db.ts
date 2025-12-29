import { getWhatsAppDbClient, initializeWhatsAppDbClient } from './clients/db.client';

async function checkDatabase() {
    try {
        await initializeWhatsAppDbClient();
        const client = getWhatsAppDbClient();

        if (!client) {
            console.log('❌ Database client not available');
            return;
        }

        console.log('\n📊 Database Status Check\n');
        console.log('='.repeat(50));

        // Check chats
        const chatsResult = await client.query('SELECT COUNT(*) as count FROM chats');
        const chatCount = parseInt(chatsResult.rows[0]?.count || '0');
        console.log(`\n📁 Chats table: ${chatCount} rows`);

        if (chatCount > 0) {
            // Show sample data
            const sampleChats = await client.query(`
                SELECT jid, name, is_group, is_announcement, unread_count, last_message_timestamp
                FROM chats
                ORDER BY last_message_timestamp DESC NULLS LAST
                LIMIT 5
            `);

            console.log('\n📋 Sample chats:');
            sampleChats.rows.forEach((chat: any, i: number) => {
                console.log(`  ${i + 1}. ${chat.name} (${chat.jid})`);
                console.log(`     Group: ${chat.is_group}, Announcement: ${chat.is_announcement}`);
                console.log(`     Unread: ${chat.unread_count}, Last msg: ${chat.last_message_timestamp || 'N/A'}`);
            });

            // Count by type
            const typeCount = await client.query(`
                SELECT 
                    CASE 
                        WHEN is_announcement THEN 'Announcements'
                        WHEN is_group THEN 'Groups'
                        ELSE 'Individual Chats'
                    END as type,
                    COUNT(*) as count
                FROM chats
                GROUP BY type
            `);

            console.log('\n📊 Breakdown by type:');
            typeCount.rows.forEach((row: any) => {
                console.log(`  ${row.type}: ${row.count}`);
            });
        }

        // Check messages
        const messagesResult = await client.query('SELECT COUNT(*) as count FROM messages');
        const messageCount = parseInt(messagesResult.rows[0]?.count || '0');
        console.log(`\n💬 Messages table: ${messageCount} rows`);

        if (messageCount > 0) {
            const recentMessages = await client.query(`
                SELECT jid, content, timestamp, is_from_me
                FROM messages
                ORDER BY timestamp DESC
                LIMIT 3
            `);

            console.log('\n📝 Recent messages:');
            recentMessages.rows.forEach((msg: any, i: number) => {
                const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
                console.log(`  ${i + 1}. [${msg.is_from_me ? 'Me' : 'Them'}] ${preview}`);
            });
        }

        // Check conversation sync state
        const syncResult = await client.query('SELECT COUNT(*) as count FROM conversation_sync_state');
        const syncCount = parseInt(syncResult.rows[0]?.count || '0');
        console.log(`\n🔄 Sync state table: ${syncCount} rows`);

        console.log('\n' + '='.repeat(50));
        console.log('\n✅ Database check complete!\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error checking database:', err);
        process.exit(1);
    }
}

checkDatabase();
