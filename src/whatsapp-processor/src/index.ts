import './tracing';
import express, { Express, Router } from 'express';
import { Server as SocketServer } from 'socket.io';
import http from 'http';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { API_PORT, TENANT_NAME, SESSION_PATH, CONFIG_PATH, LOG_LEVEL } from './config';
import { initializeDeepLensDbClient, initializeWhatsAppDbClient, getWhatsAppDbClient } from './clients/db.client';
import { WhatsAppService } from './services/whatsapp.service';
import { createApiRoutes } from './routes/api.routes';
import { createConversationRoutes } from './routes/conversation.routes';
import { createAdminRoutes } from './routes/admin.routes';
import { initializeDatabaseSchema } from './utils/db-init';

const logger = pino({ level: LOG_LEVEL });

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
    // --- Middlewares ---
    const cors = require('cors');
    app.use(cors());
    app.use(express.json());

    // --- Services Initialization ---
    await initializeDeepLensDbClient();
    await initializeWhatsAppDbClient();
    await initializeDatabaseSchema();

    const waService = new WhatsAppService(io);
    await waService.start();

    // --- API Routes ---
    const apiRouter = Router();
    apiRouter.use('/', createApiRoutes(waService));
    apiRouter.use('/conversations', createConversationRoutes(waService));
    apiRouter.use('/admin', createAdminRoutes(waService));
    app.use('/api', apiRouter);

    // Verify DB Sync
    const client = getWhatsAppDbClient();
    if (client) {
        const res = await client.query('SELECT COUNT(*) FROM chats');
        logger.info(`Database Sync: ${res.rows[0].count} chats in 'chats' table.`);
    }

    // --- Static Files & SPA Fallback ---
    const reactBuildPath = path.join(__dirname, '../public/dist');
    if (fs.existsSync(reactBuildPath)) {
        logger.info('Serving React application from public/dist');
        app.use(express.static(reactBuildPath));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
                return next();
            }
            res.sendFile(path.join(reactBuildPath, 'index.html'));
        });
    } else {
        logger.warn('React build not found!');
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
                return next();
            }
            res.status(503).send('UI not built. Please run: cd client && npm run build');
        });
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
