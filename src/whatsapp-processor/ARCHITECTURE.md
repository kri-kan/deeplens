# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Application                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │ Dashboard  │  │  QR Code   │  │ Navigation │         │  │
│  │  │    Page    │  │    Page    │  │    Bar     │         │  │
│  │  └─────┬──────┘  └─────┬──────┘  └────────────┘         │  │
│  │        │                │                                 │  │
│  │        └────────┬───────┘                                 │  │
│  │                 │                                         │  │
│  │        ┌────────▼────────┐                                │  │
│  │        │  Custom Hooks   │                                │  │
│  │        │ (useWhatsApp)   │                                │  │
│  │        └────────┬────────┘                                │  │
│  │                 │                                         │  │
│  │        ┌────────┴────────┐                                │  │
│  │        │                 │                                │  │
│  │   ┌────▼─────┐    ┌─────▼──────┐                         │  │
│  │   │   API    │    │  Socket.IO │                         │  │
│  │   │ Service  │    │  Service   │                         │  │
│  │   └────┬─────┘    └─────┬──────┘                         │  │
│  └────────┼────────────────┼─────────────────────────────────┘  │
└───────────┼────────────────┼─────────────────────────────────────┘
            │                │
            │ HTTP/REST      │ WebSocket
            │                │
┌───────────▼────────────────▼─────────────────────────────────────┐
│                      Express Server (Backend)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Main Entry Point                     │  │
│  │                       (index.ts)                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Config   │  │   Routes   │  │  Socket.IO │         │  │
│  │  │   Module   │  │   Module   │  │   Server   │         │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘         │  │
│  │        │                │                │                │  │
│  │        └────────┬───────┴────────────────┘                │  │
│  │                 │                                         │  │
│  │        ┌────────▼────────┐                                │  │
│  │        │   WhatsApp      │                                │  │
│  │        │    Service      │                                │  │
│  │        └────────┬────────┘                                │  │
│  │                 │                                         │  │
│  │        ┌────────┴────────┐                                │  │
│  │        │                 │                                │  │
│  │   ┌────▼─────┐    ┌─────▼──────┐                         │  │
│  │   │  MinIO   │    │ PostgreSQL │                         │  │
│  │   │  Client  │    │   Client   │                         │  │
│  │   └────┬─────┘    └─────┬──────┘                         │  │
│  └────────┼────────────────┼─────────────────────────────────┘  │
└───────────┼────────────────┼─────────────────────────────────────┘
            │                │
┌───────────▼────────────────▼─────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   WhatsApp   │  │    MinIO     │  │  PostgreSQL  │          │
│  │   (Baileys)  │  │   Storage    │  │   Database   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. QR Code Authentication Flow
```
User navigates to /qr
    ↓
QRCodePage component loads
    ↓
useWhatsAppConnection hook subscribes to Socket.IO
    ↓
Backend WhatsAppService generates QR code
    ↓
QR code emitted via Socket.IO
    ↓
QRSection component displays QR code
    ↓
User scans with WhatsApp
    ↓
Connection established
    ↓
Status updated to 'connected'
```

### 2. Group Management Flow
```
User navigates to /
    ↓
DashboardPage component loads
    ↓
useGroups hook fetches groups via API service
    ↓
Backend queries WhatsApp for groups
    ↓
Groups returned with tracking status
    ↓
GroupsSection displays groups
    ↓
User toggles tracking
    ↓
API service sends POST to /api/groups/toggle
    ↓
Backend updates whitelist
    ↓
Local state updated
```

## Module Responsibilities

### Backend

| Module      | Responsibility                           |
| ----------- | ---------------------------------------- |
| `config/`   | Environment variables and configuration  |
| `clients/`  | External service connections (MinIO, DB) |
| `services/` | Business logic (WhatsApp integration)    |
| `routes/`   | HTTP API endpoints                       |
| `utils/`    | Helper functions (whitelist management)  |
| `index.ts`  | Application orchestration and startup    |

### Frontend

| Module        | Responsibility                          |
| ------------- | --------------------------------------- |
| `pages/`      | Top-level route components              |
| `components/` | Reusable UI components                  |
| `services/`   | External communication (API, Socket.IO) |
| `hooks/`      | Shared state management logic           |
| `App.tsx`     | Routing configuration                   |
| `main.tsx`    | Application bootstrap                   |

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **WhatsApp**: Baileys (@whiskeysockets/baileys)
- **Real-time**: Socket.IO
- **Storage**: MinIO
- **Database**: PostgreSQL

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Real-time**: Socket.IO Client
- **QR Code**: qrcode.react
