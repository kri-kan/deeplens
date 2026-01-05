import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { LOG_LEVEL } from '../config';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Robust transport configuration
// We skip the complex multi-target worker in development/debug mode
// to avoid conflicts with the VS Code debugger and ts-node.
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const skipRotation = process.env.NO_LOG_ROTATION === 'true';

// Use transport unless explicitly skipped (prevents conflicts in some debuggers)
const transport = skipRotation
    ? undefined
    : pino.transport({
        targets: [
            {
                target: 'pino-roll',
                options: {
                    file: path.join(logsDir, 'whatsapp-processor'),
                    frequency: 'daily',
                    size: '10m', // Rotate at 10MB as well
                    limit: {
                        count: 7 // Keep 7 days or 7 files
                    },
                    mkdir: true,
                    extension: '.log'
                }
            },
            {
                target: 'pino/file',
                options: { destination: 1 } // Also log to stdout
            }
        ]
    });

export const logger = transport
    ? pino({ level: LOG_LEVEL }, transport)
    : pino({ level: LOG_LEVEL }); // Synchronous console if skipped

export default logger;
