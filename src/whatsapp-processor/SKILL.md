---
name: whatsapp-processor
description: >
  Patterns, conventions, and gotchas for the DeepLens WhatsApp Processor.
  Activate when working in src/whatsapp-processor/ — before creating controllers,
  services, repositories, or Socket.IO events.
---

# WhatsApp Processor — Developer Skill

## Overview

The WhatsApp Processor is a **Node.js / TypeScript / Express** service that connects to WhatsApp Web via the Baileys library, stores media in MinIO, persists metadata in PostgreSQL, and processes messages through Kafka.

- **Backend API**: Port `3005`
- **Frontend dev server**: Port `3006` (Vite, proxies to 3005)
- **Database**: Remote PostgreSQL at `192.168.0.170:5432`
- **Object Storage**: Remote MinIO at `192.168.0.170:9000`
- **Message Queue**: Remote Kafka at `192.168.0.170:9092`, topic: `whatsapp-ready-messages`

---

## Architecture Pattern: OOP Controller-Repository

This project uses a strict **OOP layered pattern**. Never use functional Express handlers at the route level.

```
Routes → Controller → Service → Repository → DB
```

### Controller (class with injected service)
```typescript
// src/controllers/example.controller.ts
export class ExampleController {
    constructor(private service: ExampleService) {}

    async getAll(req: Request, res: Response) {
        try {
            const result = await this.service.getAll();
            res.json(result);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get all');
            res.status(500).json({ error: err.message });
        }
    }
}
```

### Service (business logic, calls repository)
```typescript
// src/services/example.service.ts
export class ExampleService {
    constructor(private repository: ExampleRepository) {}

    async getAll() {
        return this.repository.findAll();
    }
}
```

### Repository (raw SQL via pg client)
```typescript
// src/repositories/example.repository.ts
export class ExampleRepository {
    constructor(private db: Pool) {}

    async findAll() {
        const result = await this.db.query('SELECT * FROM examples ORDER BY created_at DESC');
        return result.rows;
    }
}
```

### Route Registration (wire everything in `src/routes/`)
```typescript
// src/routes/example.routes.ts
import { Router } from 'express';
import { ExampleController } from '../controllers/example.controller';
import { ExampleService } from '../services/example.service';
import { ExampleRepository } from '../repositories/example.repository';

export function createExampleRouter(db: Pool): Router {
    const router = Router();
    const repo = new ExampleRepository(db);
    const service = new ExampleService(repo);
    const controller = new ExampleController(service);

    router.get('/', (req, res) => controller.getAll(req, res));
    return router;
}
```

---

## Existing Controllers (don't duplicate)

| Controller | File | Responsibilities |
|---|---|---|
| `AdminController` | `src/controllers/admin.controller.ts` | WhatsApp connection, QR code, group management |
| `ConversationController` | `src/controllers/conversation.controller.ts` | Chats, groups, messages, vendor assignment, deep sync, purge |
| `ManagementController` | `src/controllers/management.controller.ts` | System-level management operations |

### ConversationController methods (already implemented)
- `getAll`, `getChats`, `getGroups`, `getAnnouncements`
- `getOne(jid)`, `getMessages(jid, limit, offset)`
- `toggleDeepSync(jid, enabled)`, `syncHistory(jid, count)`
- `toggleGrouping(jid, enabled, config)`, `purge(jid)`, `getStats(jid)`
- `getChatVendor(jid)`, `assignChatVendor(jid, vendorId)`, `removeChatVendor(jid)`

---

## Baileys Library Patterns

### JID Format
- Personal chat: `{phoneNumber}@s.whatsapp.net`
- Group: `{groupId}@g.us`
- Community (announcement): `{id}@g.us` with `isAnnouncement: true`
- Always URL-decode JIDs from route params: `const jid = decodeURIComponent(req.params.jid)`

### Session Storage
- Session files are stored in `sessions/` directory (gitignored)
- Never delete the `sessions/` directory without disconnecting first
- Session is per-WhatsApp-account; each tenant has their own session

### LID (Linked Device ID)
- Baileys uses LIDs for multi-device support
- LID lookups are in `src/utils/lid-*.ts` utilities
- See `src/whatsapp-processor/docs/Lid_Implementation.md` for full details

### Group Tracking (Whitelist)
- Not all groups are tracked — use the whitelist mechanism
- Groups are toggled via `AdminController.toggleGroupTracking`
- Tracked groups are stored in the database `conversations` table

---

## Kafka Integration

**Topic**: `whatsapp-ready-messages`  
**Config variable**: `KAFKA_TOPIC` in `.env`

```typescript
// Producer pattern (in service)
await kafkaProducer.send({
    topic: config.kafka.topic,
    messages: [{
        key: message.chatJid,   // Use JID as key for sequential ordering per chat
        value: JSON.stringify(payload),
    }],
});
```

> ⚠️ **Critical**: Always use the chat JID as the Kafka message key. This ensures sequential ordering per conversation, even with multiple partitions.

---

## Database Patterns

### Connection
- Use the `pg.Pool` injected via dependency injection — never create new connections
- Password in `DB_CONNECTION_STRING` must be URL-encoded (e.g., `!` → `%21`)

### Query Style
Raw SQL with pg client (no ORM):
```typescript
const result = await this.db.query(
    'SELECT * FROM messages WHERE chat_jid = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
    [jid, limit, offset]
);
return result.rows;
```

### Key Tables (all `lowercase_with_underscores`)
- `conversations` — tracked chats/groups with metadata
- `messages` — individual WhatsApp messages
- `media_files` — MinIO references for media
- `vendors` — vendor/seller registry for chat assignment

---

## Socket.IO Events

Real-time events are emitted from services to the frontend via Socket.IO.

### Existing events (don't re-emit differently)
| Event | Direction | Payload |
|---|---|---|
| `status` | Server → Client | `{ status: 'connected' \| 'scanning' \| 'disconnected', qr?: string }` |
| `new_message` | Server → Client | Message object |
| `connection_update` | Server → Client | Baileys connection update |

### Adding a new event
```typescript
// In service, inject io socket server
this.io.emit('my_event', { data: payload });

// In React frontend (client/src/services/socket.service.ts)
socket.on('my_event', (data) => { /* handle */ });
```

---

## OpenTelemetry (Tracing)

All HTTP routes are auto-instrumented. For custom spans in business logic:
```typescript
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('whatsapp-processor');

const span = tracer.startSpan('operation-name');
try {
    // ... your logic
    span.end();
} catch (err) {
    span.recordException(err);
    span.end();
    throw err;
}
```

---

## Environment Variables

Key `.env` variables:
```bash
PORT=3005
DB_CONNECTION_STRING=postgresql://postgres:Krikank1%24@192.168.0.170:5432/whatsapp_vayyari
MINIO_ENDPOINT=192.168.0.170
MINIO_PORT=9000
MINIO_BUCKET=tenant-<uuid>
KAFKA_BROKERS=192.168.0.170:9092
KAFKA_TOPIC=whatsapp-ready-messages
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://192.168.0.170:4318/v1/traces
TENANT_NAME=Vayyari
```

---

## Development Workflow

```bash
# Install all dependencies
npm run setup

# Start backend dev server (hot reload on port 3005)
npm run dev

# Start frontend dev server (Vite on port 3006, proxies to 3005)
npm run dev:client

# Build both for production
npm run build:all

# Deploy via DeepLens pipeline
../../setupscripts/application/services/build-and-deploy.sh whatsapp-processor
```

---

## Common Gotchas

1. **URL-encode JIDs in routes**: `const jid = decodeURIComponent(req.params.jid)` — group JIDs contain `@g.us`
2. **Password URL-encoding**: Special chars in `DB_CONNECTION_STRING` must be encoded (`!` = `%21`, `$` = `%24`)
3. **Sequential Kafka ordering**: Always use JID as Kafka message key — without it, messages for a chat may be processed out of order
4. **Session directory**: `sessions/` must persist between restarts — it's gitignored but must not be deleted during redeployment
5. **Frontend build**: Production serves React from `dist/` via Express. Run `npm run build:client` before deploying or you'll get "React build not found" errors
6. **Socket.IO CORS**: The backend has CORS configured for intranet — don't add explicit origins for `192.168.x.x` addresses, they're handled automatically

---

## Related Documentation
- `src/whatsapp-processor/ARCHITECTURE.md` — Full system architecture diagram
- `src/whatsapp-processor/DATABASE_SETUP.md` — Schema setup details  
- `src/whatsapp-processor/DEEPLENS_INTEGRATION.md` — How it connects to the broader DeepLens platform
- `src/whatsapp-processor/MESSAGE_GROUPING_SYSTEM.md` — Message grouping feature
- `src/whatsapp-processor/VENDOR_ASSIGNMENT.md` — Vendor/chat assignment system
- `docs/technical/KAFKA_TOPICS.md` — Kafka topic reference
