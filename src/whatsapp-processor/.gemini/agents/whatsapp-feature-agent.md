---
name: whatsapp-feature-agent
description: >
  Adds new features to the WhatsApp Processor following its OOP layered pattern.
  Covers: repository → service → controller → route → Socket.IO event → React component.
  Trigger on: "add feature to whatsapp", "new whatsapp endpoint", "new chat feature".
  Note: This replaces the legacy .agent/ ops docs (incorporated below).
---

# WhatsApp Feature Agent

## When to Activate

Activate when adding new functionality to `src/whatsapp-processor/`. This agent enforces the OOP Controller-Repository pattern and ensures no step is missed.

**Scope**: Backend features (Node.js/TypeScript) with optional frontend (React + TailwindCSS).

---

## Step 0: Gather Requirements

Ask the user:
```
1. What does this feature do? (one sentence)
2. Does it require new DB columns or tables?
3. Will it expose a new HTTP endpoint? What method and route?
4. Does it need real-time updates to the UI via Socket.IO?
5. Does it involve WhatsApp/Baileys interactions?
```

> **🛑 STOP — Confirm before generating any code.**

---

## Step 1: TypeScript Types

**Location**: `src/whatsapp-processor/src/types/`

Define request and response types:

```typescript
// types/message-label.types.ts
export interface AddLabelRequest {
    label: string;
    color?: string;
}

export interface MessageLabelDto {
    id: number;
    messageId: string;
    label: string;
    color: string;
    createdAt: string;
}
```

> **🛑 STOP — Confirm types with user before Step 2.**

---

## Step 2: Repository Method

**Location**: `src/whatsapp-processor/src/repositories/`

Use raw SQL via `pg.Pool`. Follow this exact pattern:

```typescript
// repositories/message-label.repository.ts
import { Pool } from 'pg';
import { AddLabelRequest, MessageLabelDto } from '../types/message-label.types';

export class MessageLabelRepository {
    constructor(private db: Pool) {}

    async addLabel(messageId: string, data: AddLabelRequest): Promise<MessageLabelDto> {
        const result = await this.db.query(
            `INSERT INTO message_labels (message_id, label, color, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [messageId, data.label, data.color ?? '#808080']
        );
        return result.rows[0];
    }

    async getLabelsForMessage(messageId: string): Promise<MessageLabelDto[]> {
        const result = await this.db.query(
            'SELECT * FROM message_labels WHERE message_id = $1 ORDER BY created_at DESC',
            [messageId]
        );
        return result.rows;
    }

    async removeLabel(id: number): Promise<boolean> {
        const result = await this.db.query(
            'DELETE FROM message_labels WHERE id = $1',
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }
}
```

> **🛑 STOP — Confirm repository before Step 3.**

---

## Step 3: Service Method

**Location**: `src/whatsapp-processor/src/services/`

Services contain business logic. They call repositories and other services:

```typescript
// services/message-label.service.ts
import { MessageLabelRepository } from '../repositories/message-label.repository';
import { AddLabelRequest, MessageLabelDto } from '../types/message-label.types';
import { logger } from '../utils/logger';

export class MessageLabelService {
    constructor(private repository: MessageLabelRepository) {}

    async addLabel(messageId: string, data: AddLabelRequest): Promise<MessageLabelDto> {
        logger.info({ messageId, label: data.label }, 'Adding label to message');
        return this.repository.addLabel(messageId, data);
    }

    async getLabels(messageId: string): Promise<MessageLabelDto[]> {
        return this.repository.getLabelsForMessage(messageId);
    }

    async removeLabel(id: number): Promise<boolean> {
        return this.repository.removeLabel(id);
    }
}
```

> **🛑 STOP — Confirm service before Step 4.**

---

## Step 4: Controller

**Location**: `src/whatsapp-processor/src/controllers/`

Add to an existing controller class or create a new one. Always a class with injected service:

```typescript
// controllers/message-label.controller.ts
import { Request, Response } from 'express';
import { MessageLabelService } from '../services/message-label.service';
import { logger } from '../utils/logger';

export class MessageLabelController {
    constructor(private service: MessageLabelService) {}

    async addLabel(req: Request, res: Response) {
        const { messageId } = req.params;
        const { label, color } = req.body;

        if (!label) {
            return res.status(400).json({ error: 'label is required' });
        }

        try {
            const result = await this.service.addLabel(messageId, { label, color });
            res.status(201).json(result);
        } catch (err: any) {
            logger.error({ err, messageId }, 'Failed to add label');
            res.status(500).json({ error: err.message });
        }
    }

    async getLabels(req: Request, res: Response) {
        const { messageId } = req.params;
        try {
            const labels = await this.service.getLabels(messageId);
            res.json(labels);
        } catch (err: any) {
            logger.error({ err, messageId }, 'Failed to get labels');
            res.status(500).json({ error: err.message });
        }
    }

    async removeLabel(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        try {
            const removed = await this.service.removeLabel(id);
            removed ? res.json({ success: true }) : res.status(404).json({ error: 'Label not found' });
        } catch (err: any) {
            logger.error({ err, id }, 'Failed to remove label');
            res.status(500).json({ error: err.message });
        }
    }
}
```

> **🛑 STOP — Confirm controller before Step 5.**

---

## Step 5: Route Registration

**Location**: `src/whatsapp-processor/src/routes/`

Create a new route file (or add to an existing one):

```typescript
// routes/message-label.routes.ts
import { Router } from 'express';
import { Pool } from 'pg';
import { MessageLabelRepository } from '../repositories/message-label.repository';
import { MessageLabelService } from '../services/message-label.service';
import { MessageLabelController } from '../controllers/message-label.controller';

export function createMessageLabelRouter(db: Pool): Router {
    const router = Router({ mergeParams: true });  // mergeParams for nested routes

    const repo = new MessageLabelRepository(db);
    const service = new MessageLabelService(repo);
    const controller = new MessageLabelController(service);

    router.post('/', (req, res) => controller.addLabel(req, res));
    router.get('/', (req, res) => controller.getLabels(req, res));
    router.delete('/:id', (req, res) => controller.removeLabel(req, res));

    return router;
}
```

**Register in `src/index.ts`**:
```typescript
// Mount under messages/:messageId/labels
app.use('/api/messages/:messageId/labels', createMessageLabelRouter(db));
```

> **🛑 STOP — Confirm routing before Step 6 (if real-time needed) or go to Step 7.**

---

## Step 6: Socket.IO Real-Time Event (if needed)

Only add if the feature needs to push updates to the frontend in real-time (not all features need this).

```typescript
// In the service, emit after a successful operation
// The io socket server must be injected into the service

async addLabel(messageId: string, data: AddLabelRequest): Promise<MessageLabelDto> {
    const result = await this.repository.addLabel(messageId, data);

    // Emit real-time update
    this.io.emit('label_added', {
        messageId,
        label: result,
    });

    return result;
}
```

**In the React client** (`client/src/`):
```typescript
// In the relevant component or hook
socket.on('label_added', (data: { messageId: string; label: MessageLabelDto }) => {
    // Update local state
});
```

Existing Socket.IO events (don't re-emit differently):
- `status` — WhatsApp connection status
- `new_message` — new WhatsApp message received  
- `chat_update` — chat metadata changed
- `connection_update` — Baileys connection update

---

## Step 7: React UI Component (if needed)

**Location**: `client/src/components/` or `client/src/pages/`

The frontend uses **React 18 + TypeScript + TailwindCSS**:

```tsx
// client/src/components/MessageLabels.tsx
import React, { useState } from 'react';

interface Props {
    messageId: string;
    labels: MessageLabelDto[];
    onLabelAdded: (label: MessageLabelDto) => void;
}

export function MessageLabels({ messageId, labels, onLabelAdded }: Props) {
    const [newLabel, setNewLabel] = useState('');

    const handleAdd = async () => {
        if (!newLabel.trim()) return;
        const response = await fetch(`/api/messages/${messageId}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: newLabel }),
        });
        const label: MessageLabelDto = await response.json();
        onLabelAdded(label);
        setNewLabel('');
    };

    return (
        <div className="flex flex-wrap gap-2 p-2">
            {labels.map(label => (
                <span key={label.id} className="px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {label.label}
                </span>
            ))}
            <input
                className="border rounded px-2 py-1 text-sm"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Add label..."
            />
            <button onClick={handleAdd} className="text-sm text-blue-600 hover:underline">
                Add
            </button>
        </div>
    );
}
```

---

## Final Checklist

```markdown
## ✅ WhatsApp Feature Complete

- [ ] TypeScript types defined in src/types/ ← VERIFY
- [ ] Repository: raw SQL, parameterized queries, returns typed rows ← VERIFY
- [ ] Service: business logic separated from HTTP/DB concerns ← VERIFY
- [ ] Controller: class-based, constructor injection, try/catch on every method ← VERIFY
- [ ] Route: factory function, DI wiring, registered in src/index.ts ← VERIFY
- [ ] JID params decoded: decodeURIComponent(req.params.jid) ← VERIFY if JIDs used
- [ ] Socket.IO event added if real-time needed ← VERIFY
- [ ] React component uses TailwindCSS classes ← VERIFY if UI added
- [ ] Run: npm run build:all
```

---

## WhatsApp Processor Ops Reference
*(Previously in .agent/ — incorporated here)*

### Clean Restart Procedure
```bash
# Stop the process
kill $(lsof -t -i:3005)

# Restart
npm run dev
```

After restart, the service **automatically**:
1. Loads WhatsApp session from `sessions/` directory
2. Runs `performManualInitialSync()` — syncs all groups and contact names
3. Runs Deep Name Reconciliation — resolves numeric JIDs to real names from message history
4. Emits Socket.IO events to refresh the frontend

Expected startup log:
```
✅ Manual initial sync complete
🧠 Running Deep Name Reconciliation from message history...
✨ Deep Reconciliation: Updated X chat names from message history
```

### Force Re-sync (without restart)
```bash
curl -X POST http://localhost:3005/api/sync/manual
```

### Session Recovery
If WhatsApp disconnects and shows QR code:
1. Navigate to `http://localhost:3005` → QR Code tab
2. Scan with WhatsApp → Multi-Device setup
3. Wait for `status: connected` in Socket.IO stream

### Database Re-init
```bash
bash setupscripts/core/orchestrate-linux.sh init-whatsapp-db
```
