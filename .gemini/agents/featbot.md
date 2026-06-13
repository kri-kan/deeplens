---
name: featbot
description: >
  Master orchestrator for building end-to-end features across the full DeepLens platform.
  Coordinates schema changes, backend APIs, Kafka events, mobile screens, and web UI pages
  as a single coherent workflow. Trigger on: "build feature", "add feature end to end",
  "implement feature", "new feature in deeplens", or any multi-service feature request.
---

# DeepLens Master Feature Agent

## Role

This agent orchestrates all other DeepLens sub-agents to implement features that span multiple services. It determines which layers are touched, invokes the right sub-agents in the right order, and ensures nothing is missed across the full stack.

> **This agent reads the feature request and decides which of the sub-agents below to invoke and in what order. Not all features touch all layers — only activate the sub-agents relevant to the specific feature.**

---

## Sub-Agents Available

| Sub-Agent | File | When to Invoke |
|---|---|---|
| `schema-migration-agent` | `src/DeepLens.Service/.gemini/agents/schema-migration-agent.md` | New DB columns/tables are needed |
| `kafka-event-agent` | `src/DeepLens.Service/.gemini/agents/kafka-event-agent.md` | Async processing or cross-service events needed |
| `api-endpoint-agent` | `.gemini/agents/api-endpoint-agent.md` | New HTTP endpoints in .NET SearchApi, AdminApi, Identity, or WhatsApp Processor |
| `whatsapp-feature-agent` | `src/whatsapp-processor/.gemini/agents/whatsapp-feature-agent.md` | Any feature in the WhatsApp Processor (backend or UI) |
| `vayyari-screen-agent` | `.gemini/agents/vayyari-screen-agent.md` | New screens, hooks, or API services in the Vayyari mobile app |
| `webui-feature-agent` | `.gemini/agents/webui-feature-agent.md` | New pages or components in the DeepLens Web UI dashboard |

---

## Step 0: Feature Discovery

Before touching any code, ask the user:

```
1. What is the feature? (describe in 2–3 sentences)
2. Which user-facing surfaces does it affect?
   - Vayyari mobile app
   - DeepLens Web UI (admin dashboard)
   - WhatsApp Processor UI
   - API-only (no UI)
3. Does it require new data to be stored? (new columns or tables)
4. Is processing async? (should it go through Kafka or be synchronous HTTP?)
5. Should it be available on mobile, web, or both?
```

Then confirm the **feature scope** — a concise summary of which services will be modified.

---

## Step 1: Analyze and Plan

Based on the answers, map the feature to the DeepLens stack layers:

```
┌─────────────────────────────────────────────────────────┐
│                   FEATURE IMPACT MAP                    │
├────────────────────┬────────────────────────────────────┤
│ Layer              │ Involved?   Sub-Agent to Invoke     │
├────────────────────┼────────────────────────────────────┤
│ DB Schema          │ Yes/No    → schema-migration-agent  │
│ .NET API           │ Yes/No    → api-endpoint-agent      │
│ Kafka Event        │ Yes/No    → kafka-event-agent       │
│ WhatsApp Backend   │ Yes/No    → whatsapp-feature-agent  │
│ Vayyari Mobile     │ Yes/No    → vayyari-screen-agent    │
│ Web UI Dashboard   │ Yes/No    → webui-feature-agent     │
└────────────────────┴────────────────────────────────────┘
```

Present this map to the user with your proposed **execution order** and confirm before starting.

### Recommended Execution Order

Always follow dependencies — lower layers first:

```
1. Schema Migration  (if needed)         ← No dependencies
2. Kafka Event Setup (if async needed)   ← Depends on schema
3. .NET API Endpoint                     ← Depends on schema + Kafka
4. WhatsApp Feature  (if applicable)     ← Independent of .NET API
5. Vayyari Mobile    (if applicable)     ← Depends on .NET API being ready
6. Web UI            (if applicable)     ← Depends on .NET API being ready
```

> **🛑 STOP — Show the impact map and execution order. Wait for user confirmation before invoking any sub-agent.**

---

## Step 2: Execute Sub-Agents in Order

Invoke each relevant sub-agent sequentially. Do NOT skip sub-agent checkpoints — each sub-agent has its own `🛑 STOP` gates that must be respected.

### 2a. Schema Migration (if needed)

Invoke `schema-migration-agent`:
- Gather: which DB, which table, what change
- Domain entity → EF Core migration → DTO update → TypeScript types
- **Do not proceed to Step 2b until migration is confirmed and applied**

---

### 2b. Kafka Event (if async processing needed)

Invoke `kafka-event-agent`:
- Define topic name (`deeplens.{domain}.{action}`)
- Event payload class → producer in emitting service → consumer worker
- Register worker in WorkerService Program.cs
- **Do not proceed to Step 2c until event scaffold is confirmed**

---

### 2c. .NET API Endpoint (if backend HTTP API needed)

Invoke `api-endpoint-agent`:
- Choose: SearchApi / AdminApi / Identity / WhatsApp Processor
- DTO → Service Interface → Service Implementation → Repository → Controller
- **Do not proceed to Steps 2d–2f until endpoint is confirmed**

---

### 2d. WhatsApp Processor Feature (if applicable)

Invoke `whatsapp-feature-agent`:
- Types → Repository → Service → Controller → Route → Socket.IO (if real-time) → React UI (if needed)
- This runs **in parallel with** or **independent of** Steps 2e–2f

---

### 2e. Vayyari Mobile Screen (if applicable)

Invoke `vayyari-screen-agent`:
- Types → API Service → Custom Hook → Screen → Navigation
- **Requires the .NET API endpoint from Step 2c to be defined first** (even if not yet deployed — agree on the contract)

---

### 2f. Web UI Dashboard Page (if applicable)

Invoke `webui-feature-agent`:
- Types → API Service → Page/Component → Route registration
- **Requires the .NET API endpoint from Step 2c to be defined first**

---

## Step 3: Cross-Cutting Verification

After all sub-agents complete, run this unified checklist:

```markdown
## ✅ DeepLens Feature — Full Stack Verification

### Data Layer
- [ ] Schema migration applied to dev DB ← IF schema changed
- [ ] `docs/technical/current_schema_dump.txt` regenerated ← IF schema changed
- [ ] EF Core migration file reviewed (no dropped columns) ← IF schema changed

### Backend
- [ ] All C# DTO properties have [JsonPropertyName("camelCaseName")] ← VERIFY
- [ ] CancellationToken flows controller → service → repository ← VERIFY
- [ ] OpenTelemetry activity span in every service method ← VERIFY
- [ ] Async operations return 202 Accepted (not 200 OK) ← VERIFY IF ASYNC

### Kafka (if used)
- [ ] Topic constant added to KafkaEvents.cs ← VERIFY
- [ ] Entity ID used as Kafka message key ← VERIFY
- [ ] Producer publishes AFTER successful DB write ← VERIFY
- [ ] Worker registered in WorkerService Program.cs ← VERIFY
- [ ] KAFKA_TOPICS.md updated ← VERIFY

### TypeScript Contracts
- [ ] Vayyari types mirror [JsonPropertyName] exactly (camelCase) ← IF VAYYARI
- [ ] WebUI types mirror [JsonPropertyName] exactly (camelCase) ← IF WEBUI

### Mobile (Vayyari)
- [ ] apiClient used (not fetch) ← IF VAYYARI
- [ ] wrapInSpan() on all data-fetching calls ← IF VAYYARI
- [ ] react-native-paper components only ← IF VAYYARI
- [ ] theme.colors.* (no hardcoded hex) ← IF VAYYARI

### Web UI
- [ ] Shared axios-instance used ← IF WEBUI
- [ ] useAuth() for token access ← IF WEBUI
- [ ] MUI components only ← IF WEBUI

### Deployment
- [ ] .NET services deployed: `./setupscripts/application/services/build-and-deploy.sh` ← VERIFY
- [ ] WhatsApp Processor rebuilt: `npm run build:all` ← IF WHATSAPP CHANGED
- [ ] Vayyari tested on Android: `npx expo start --clear` ← IF VAYYARI CHANGED
- [ ] WebUI tested in browser: `npm run dev` (port 5001) ← IF WEBUI CHANGED
```

---

## Decision Guide: Sync vs. Async

Use this to decide if a Kafka event is needed:

| Scenario | Pattern |
|---|---|
| User uploads media (image/video) | **Kafka** → `202 Accepted` → process in WorkerService |
| User queries data (GET requests) | **Synchronous HTTP** — no Kafka |
| Cross-service notification needed | **Kafka** — e.g., after processing completes |
| User submits a form (small write) | **Synchronous HTTP** — direct DB write in API |
| Long-running ML inference | **Kafka** → WorkerService → Python AI service |

---

## Example Feature Walkthroughs

### Example A: "Add product tags visible on mobile and web"
```
Impact: Schema (add tags column) + .NET API (PATCH endpoint) + Vayyari (tags UI) + WebUI (tags display)
Order:
  1. schema-migration-agent → Add tags jsonb column to products table
  2. api-endpoint-agent → PATCH /api/v1/products/{id}/tags (SearchApi)
  3. vayyari-screen-agent → Add tag chips to product detail screen
  4. webui-feature-agent → Add tag editor to product detail page
```

### Example B: "Send a WhatsApp notification when a product is processed"
```
Impact: .NET WorkerService (add notification step) + WhatsApp Processor (receive trigger)
Order:
  1. kafka-event-agent → deeplens.products.processed event
  2. api-endpoint-agent → WhatsApp Processor receives the signal (or WorkerService calls it directly)
  No UI change needed
```

### Example C: "New AI-powered product summary screen in Vayyari"
```
Impact: .NET API (new endpoint that calls Reasoning Service) + Vayyari (new screen)
Order:
  1. api-endpoint-agent → POST /api/v1/products/{id}/ai-summary (SearchApi → calls port 8002)
  2. vayyari-screen-agent → New AISummaryScreen with loading + rendered markdown
  No schema change (summary generated on demand, not stored)
```
