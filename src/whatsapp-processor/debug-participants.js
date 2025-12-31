const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function run() {
    const { state } = await useMultiFileAuthState('./sessions/default_session');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const groups = await sock.groupFetchAllParticipating();
            const groupJid = Object.keys(groups)[0];
            console.log('Testing Group:', groupJid);
            const metadata = await sock.groupMetadata(groupJid);
            console.log('Participant 0:', JSON.stringify(metadata.participants[0], null, 2));
            process.exit(0);
        }
    });
}
run();
