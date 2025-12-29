# WhatsApp Processor - React Client

Modern React-based UI for the DeepLens WhatsApp Processor.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Socket.IO Client** for real-time updates
- **qrcode.react** for QR code rendering

## Development

```bash
# Install dependencies
npm install

# Start development server (runs on port 3006)
npm run dev

# Build for production
npm run build
```

## Features

- Real-time connection status updates via WebSocket
- QR code display for WhatsApp authentication
- Groups/Communities list with toggle tracking
- Responsive design with Tailwind CSS
- TypeScript for type safety

## Architecture

The client proxies API requests to the backend server running on port 3005:
- `/api/*` - REST API endpoints
- `/socket.io/*` - WebSocket connection

Production builds are output to `../public/dist` for serving by the Express backend.
