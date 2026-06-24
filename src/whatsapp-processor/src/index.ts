import './tracing';
import express, { Express, Router } from 'express';
import { Server as SocketServer } from 'socket.io';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';
import { setupSwagger } from './swagger';
import { API_PORT, TENANT_NAME, SESSION_PATH, CONFIG_PATH } from './config';
import { initializeDeepLensDbClient, initializeWhatsAppDbClient, getWhatsAppDbClient } from './clients/db.client';
import { WhatsAppService } from './services/whatsapp.service';
import { createApiRoutes } from './routes/api.routes';
import { createConversationRoutes } from './routes/conversation.routes';
import { createAdminRoutes } from './routes/admin.routes';
// import { initializeDatabaseSchema } from './utils/db-init';
import { initializeMessageQueue, shutdownMessageQueue } from './init-message-queue';

// --- Ensure Required Directories ---
if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
}
if (!fs.existsSync(CONFIG_PATH)) {
    fs.mkdirSync(CONFIG_PATH, { recursive: true });
}

// --- Initialize Express App ---
const app: Express = express();
// app.use(express.json()); // Moved to initializeServices

// --- Initialize HTTP Server and Socket.IO ---
const server = http.createServer(app);
const io = new SocketServer(server);

// --- Initialize Services ---
async function initializeServices() {

    // --- CORS ---
    const cors = require('cors');
    const corsOptions = {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    };
    app.use(cors(corsOptions));
    app.use(express.json());

    // --- Health Check ---
    app.get('/health', (req, res) => res.json({ status: 'ok', tenant: TENANT_NAME }));

    // --- Swagger Docs ---
    setupSwagger(app);

    // --- Services Initialization ---
    await initializeDeepLensDbClient();
    await initializeWhatsAppDbClient();

    // Initialize message processing queue
    await initializeMessageQueue();

    // Set Socket.IO on group readiness service
    const { groupReadinessService } = await import('./services/group-readiness.service');
    groupReadinessService.setSocketIo(io);

    // Initialize DeepLens integration service
    const { deepLensIntegration } = await import('./services/deeplens-integration.service');
    await deepLensIntegration.start();
    logger.info('DeepLens integration service started');

    const waService = new WhatsAppService(io);
    await waService.start();

    // Initialize product created write-back consumer
    const { productCreatedConsumer } = await import('./services/product-created-consumer.service');
    await productCreatedConsumer.start(io);

    // --- API Routes ---
    const apiRouter = Router();
    apiRouter.use('/', createApiRoutes(waService));
    apiRouter.use('/conversations', createConversationRoutes(waService));
    apiRouter.use('/admin', createAdminRoutes(waService));
    
    const { createGroupReviewRoutes } = await import('./routes/group-review.routes');
    apiRouter.use('/', createGroupReviewRoutes());

    app.use('/api', apiRouter);

    // Verify DB Sync
    const client = getWhatsAppDbClient();
    if (client) {
        const res = await client.query('SELECT COUNT(*) FROM wa.chats');
        logger.info(`Database Sync: ${res.rows[0].count} chats in 'chats' table.`);
    }

    // --- Start Server ---
    server.listen(API_PORT, () => {
        logger.info(`Dashboard running on port ${API_PORT} for Tenant: ${TENANT_NAME}`);
    });
}

// --- Start Application ---
initializeServices().catch(err => {
    logger.error({ err }, 'Failed to initialize services');
    process.exit(1);
});

async function shutdown(signal: string) {
    logger.info(`${signal} received, shutting down gracefully...`);

    try {
        // Shutdown services
        const { deepLensIntegration } = await import('./services/deeplens-integration.service');
        await deepLensIntegration.stop();
        
        const { productCreatedConsumer } = await import('./services/product-created-consumer.service');
        await productCreatedConsumer.shutdown();

        await shutdownMessageQueue();

        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
    }
}

// --- Graceful Shutdown ---
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
