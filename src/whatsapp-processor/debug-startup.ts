import { WhatsAppService } from './src/services/whatsapp.service';
import { Server as SocketServer } from 'socket.io';
import http from 'http';
import express from 'express';
import { initializeDeepLensDbClient, initializeWhatsAppDbClient } from './src/clients/db.client';
import { initializeDatabaseSchema } from './src/utils/db-init';

async function testStart() {
    try {
        console.log('--- Initializing DBs ---');
        await initializeDeepLensDbClient();
        await initializeWhatsAppDbClient();
        await initializeDatabaseSchema();

        console.log('--- Creating Service ---');
        const app = express();
        const server = http.createServer(app);
        const io = new SocketServer(server);
        const waService = new WhatsAppService(io);

        console.log('--- Starting WA Service ---');
        await waService.start();
        console.log('--- Started Successfully ---');
    } catch (err) {
        console.error('--- STARTUP ERROR ---');
        console.error(err);
        process.exit(1);
    }
}

testStart();
