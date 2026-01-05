Project Specification: DeepLens-Connect (WhatsApp Archiver & Manager)
Document Type: Master Technical Specification (for AI Agent Generation) Target Stack: Node.js (Backend), React (Frontend), PostgreSQL (DB), MinIO (Storage), Redis (Cache). Core Library: @whiskeysockets/baileys (v7.x Stable)

1. System Overview (High Level Design)
This system acts as a "Headless WhatsApp Client" that mirrors a real WhatsApp account (via QR scan), archives selected data to a local cloud stack, and provides a web interface for management and viewing.

Architecture Diagram
Baileys Worker (Node.js): Runs the WhatsApp socket connection. It handles authentication, event listeners (message-upsert), and media decryption.

API Server (Express/FastAPI): Serves the React frontend and handles admin configurations (what to track/ignore).

PostgreSQL: Stores two distinct datasets:

auth_store: Session credentials (keys, pre-keys).

app_data: Chat history, contacts, and logs.

MinIO: Stores decrypted media files (images, videos, documents).

Redis:

Auth Cache: Caches session keys for the Baileys socket (critical for speed).

Media Read-Through: Caches pre-signed URLs or small thumbnails to reduce MinIO hits.

2. Database Schema (PostgreSQL)
Instruct your AI assistant to execute this SQL to initialize the database.

A. Auth Storage (Critical)
Replaces the auth_info_baileys folder.

SQL

CREATE TABLE wa_auth_sessions (
    session_id VARCHAR(128) NOT NULL,
    key_id VARCHAR(128) NOT NULL,
    data TEXT NOT NULL, -- JSON payload of the key
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    PRIMARY KEY (session_id, key_id)
);
B. Application Data
SQL

-- Tracked entities configuration
CREATE TABLE tracking_config (
    jid VARCHAR(128) PRIMARY KEY, -- Group or User ID
    name VARCHAR(255),
    type VARCHAR(20), -- 'group', 'private', 'community'
    is_tracked BOOLEAN DEFAULT TRUE,
    auto_download_media BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chats (
    jid VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255),
    unread_count INT DEFAULT 0,
    last_msg_timestamp BIGINT,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE messages (
    id VARCHAR(128) PRIMARY KEY,
    chat_jid VARCHAR(128) REFERENCES chats(jid),
    sender_jid VARCHAR(128),
    remote_jid VARCHAR(128), -- The other party
    push_name VARCHAR(255),
    content JSONB, -- Full raw message object
    message_type VARCHAR(50), -- 'text', 'image', 'video'
    text_body TEXT, -- Extracted text for search
    media_url TEXT, -- MinIO path or reference
    timestamp BIGINT,
    status INT -- 0:Sent, 1:Delivered, 2:Read
);

-- Full text search index
CREATE INDEX idx_messages_text ON messages USING GIN(to_tsvector('english', text_body));
CREATE INDEX idx_messages_chat ON messages(chat_jid);
3. Backend Implementation Guide (Node.js)
Dependencies: @whiskeysockets/baileys, pg, minio, redis, qrcode-terminal (dev), express, socket.io (for frontend updates).

Module 1: The Auth Adapter
Instruction: Do not use the file system. Implement a custom usePostgresAuthState function.

Logic:

readData: SELECT data FROM wa_auth_sessions WHERE session_id = ? AND key_id = ?

writeData: INSERT INTO wa_auth_sessions ... ON CONFLICT UPDATE

Optimization: Wrap this in makeCacheableSignalKeyStore (provided by Baileys) using Redis to prevent database throttling during connection handshakes.

Module 2: The Baileys Worker (The Engine)
Socket Config:

JavaScript

const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    printQRInTerminal: false, // We will emit QR to frontend via Socket.io
    browser: ["DeepLens Agent", "Chrome", "10.0"],
    syncFullHistory: true
});
Event: connection.update:

If qr: Emit event qr_code to Frontend via Socket.io.

If connection === 'open': Update system status to "Connected".

Event: messages.upsert:

Loop through incoming messages.

Filter: Check tracking_config table. If jid is marked is_tracked = false, ignore.

Media Handling:

If msg.message.imageMessage (or video/document):

Call downloadContentFromMessage.

Stream buffer to MinIO bucket whatsapp-media.

Construct internal path /{chat_jid}/{date}/{file_id}.ext.

Store this path in Postgres messages.media_url.

Module 3: Media Read-Through (Redis + MinIO)
Endpoint: GET /api/media/:fileId

Check Redis: GET media_presigned_${fileId}.

Hit: Redirect user to the cached Presigned URL.

Miss:

Request Presigned URL (GET) from MinIO (valid for 1 hour).

Save to Redis with 55-minute TTL.

Redirect user.

4. Frontend Architecture (React)
Structure:

Layout: Sidebar (Chat List) | Main (Chat Window) | Right Panel (Info/Search).

State Management: Zustand (lighter than Redux, easier for AI to code).

Components:

QRScanner: Renders the QR code string from the backend using react-qr-code.

ChatList: Virtualized list (use react-window) to handle thousands of chats.

MessageBubble: Adaptive component.

Text: Renders text.

Image: <img src="/api/media/..." /> (triggers the read-through).

AdminPanel: Table view of all detected Groups/Communities with Toggles for "Track" and "Ignore".

5. Configuration & Deployment
Environment Variables (.env)
Code snippet

# Application
PORT=3000
SESSION_ID=primary_agent

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/whatsapp_db

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=whatsapp-media

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
Admin / Config Rules
The system should have a "Default Policy" in .env:

DEFAULT_TRACK_GROUPS=false (Safety: don't archive random groups you are added to).

DEFAULT_TRACK_PRIVATE=true.

6. Prompt for your AI Coding Assistant
Copy and paste the block below to your AI coding tool (Cursor, GitHub Copilot, etc.) to start generation:

"Act as a Senior Backend Architect. I need a Node.js microservice using @whiskeysockets/baileys (v6+) to mirror a WhatsApp account.

Requirements:

Auth: Implement a custom Auth Adapter for PostgreSQL using the schema provided above. Do not use file-based auth.

Media: When a media message arrives, decrypt it and upload it to MinIO. Store the reference in Postgres.

API: Create an Express server with endpoints to fetch Chat History and Generate QR codes.

Caching: Use Redis to wrap the Baileys KeyStore for performance.

