import './tracing';
import express, { Express } from 'express';
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
app.use(express.json());

// --- Serve React Build ---
const reactBuildPath = path.join(__dirname, '../public/dist');

if (fs.existsSync(reactBuildPath)) {
    logger.info('Serving React application from public/dist');
    app.use(express.static(reactBuildPath));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(reactBuildPath, 'index.html'));
    });
} else {
    logger.warn('React build not found! Please run: cd client && npm install && npm run build');

    // Serve a helpful setup page
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return res.status(503).json({
                error: 'UI not built',
                message: 'Please build the React client first: cd client && npm run build'
            });
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Setup Required - DeepLens WhatsApp Processor</title>
                <style>
                    body { 
                        font-family: system-ui, -apple-system, sans-serif; 
                        max-width: 600px; 
                        margin: 100px auto; 
                        padding: 20px;
                        background: #0f172a;
                        color: #e2e8f0;
                    }
                    h1 { color: #60a5fa; }
                    code { 
                        background: #1e293b; 
                        padding: 2px 6px; 
                        border-radius: 4px;
                        color: #fbbf24;
                    }
                    pre {
                        background: #1e293b;
                        padding: 16px;
                        border-radius: 8px;
                        overflow-x: auto;
                    }
                </style>
            </head>
            <body>
                <h1>⚙️ Setup Required</h1>
                <p>The React UI hasn't been built yet. Please run the following commands:</p>
                <pre><code>cd client
npm install
npm run build</code></pre>
                <p>Then restart the server.</p>
                <p><strong>For development:</strong> Run <code>npm run dev</code> in the client folder (port 3006)</p>
            </body>
            </html>
        `);
    });
}

// --- Initialize HTTP Server and Socket.IO ---
const server = http.createServer(app);
const io = new SocketServer(server);

// --- Initialize Services ---
async function initializeServices() {
    // Initialize database clients
    await initializeDeepLensDbClient();
    await initializeWhatsAppDbClient();
    await initializeDatabaseSchema();

    // Initialize WhatsApp service
    const waService = new WhatsAppService(io);
    await waService.start();

    // Register API routes
    const apiRoutes = createApiRoutes(waService);
    app.use('/api', apiRoutes);

    // Register conversation routes
    const conversationRoutes = createConversationRoutes(waService);
    app.use('/api/conversations', conversationRoutes);

    // Register admin routes
    const adminRoutes = createAdminRoutes(waService);
    app.use('/api/admin', adminRoutes);

    // Verify DB Sync
    const client = getWhatsAppDbClient();
    if (client) {
        const res = await client.query('SELECT COUNT(*) FROM chats');
        logger.info(`Database Sync: ${res.rows[0].count} chats in 'chats' table.`);
    }

    // Start server
    server.listen(API_PORT, () => {
        logger.info(`Dashboard running on port ${API_PORT} for Tenant: ${TENANT_NAME}`);
    });
}

// --- Start Application ---
initializeServices().catch(err => {
    logger.error({ err }, 'Failed to initialize services');
    process.exit(1);
});
