# DeepLens Web UI

**Modern React-based web interface for DeepLens tenant and data management**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![Material--UI](https://img.shields.io/badge/MUI-5.15.0-007FFF.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)

Last Updated: December 18, 2025

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [User Roles & Permissions](#user-roles--permissions)
- [API Integration](#api-integration)
- [Planned Features](#planned-features)
- [Contributing](#contributing)

---

## 🎯 Overview

DeepLens Web UI is a comprehensive React-based web application for managing DeepLens tenants, users, and image data. Built with Material-UI (MUI) components, it provides a modern, responsive interface for both system administrators and tenant users.

**Key Capabilities:**
- 🔐 **Authentication** - JWT-based login with automatic token refresh
- 🏢 **Tenant Management** - Create, view, edit, and manage tenant organizations
- 👥 **User Management** - Manage users across all tenants (admin) or within tenant (tenant users)
- 🖼️ **Image Management** - Upload, search, and manage image data
- 📊 **Analytics Dashboard** - Monitor system metrics and tenant usage
- ⚙️ **Settings** - User profile and application configuration

---

## ✨ Features

### Implemented Features ✅

**Authentication System**
- Login page with JWT authentication
- Automatic token refresh on expiration
- Protected routes with authentication guards
- User session management
- Logout functionality

**Layout & Navigation**
- Responsive sidebar navigation
- Top app bar with user menu
- Material-UI theming (light mode)
- Role-based menu visibility

**Dashboard**
- Welcome screen with user greeting
- System statistics cards (Tenants, Users, Images, API Calls)
- Quick action buttons
- Real-time data display

**Tenant Management (Admin Only)**
- List all tenants with key information
- Create new tenants with admin user
- View tenant details (infrastructure, limits, etc.)
- Tenant tier management (Free/Professional/Enterprise)
- Status indicators (Active/Suspended/PendingSetup)

**Placeholder Pages**
- Users management page
- Images management page
- Settings page with profile information

### Planned Features 🚧

See [Planned Features](#planned-features) section below.

---

## 🛠️ Technology Stack

### Core Framework
- **React 18.2.0** - UI framework with hooks
- **TypeScript 5.3.3** - Type-safe JavaScript
- **Vite 5.0.8** - Build tool and dev server

### UI Framework
- **Material-UI (MUI) 5.15.0** - Component library
- **@mui/icons-material** - Icon set
- **@emotion/react & @emotion/styled** - CSS-in-JS styling

### Routing & State
- **React Router 6.21.0** - Client-side routing
- **React Query 3.39.3** - Server state management & caching

### HTTP & API
- **Axios 1.6.2** - HTTP client with interceptors
- **jwt-decode 4.0.0** - JWT token parsing

### Utilities
- **date-fns 3.0.6** - Date formatting and manipulation

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Type checking

---

## 📁 Project Structure

```
DeepLens.WebUI/
├── public/                          # Static assets
│   └── deeplens-icon.svg            # Application icon
│
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── Auth/
│   │   │   └── ProtectedRoute.tsx   # Authentication guard for routes
│   │   └── Layout/
│   │       ├── Layout.tsx           # Main layout wrapper
│   │       ├── Header.tsx           # Top app bar with user menu
│   │       └── Sidebar.tsx          # Navigation sidebar
│   │
│   ├── contexts/                    # React contexts
│   │   └── AuthContext.tsx          # Authentication state & actions
│   │
│   ├── pages/                       # Page components
│   │   ├── Auth/
│   │   │   └── LoginPage.tsx        # Login form
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.tsx    # Main dashboard
│   │   ├── Tenants/
│   │   │   ├── TenantsPage.tsx      # Tenant list & create
│   │   │   └── TenantDetailPage.tsx # Tenant details view
│   │   ├── Users/
│   │   │   └── UsersPage.tsx        # User management (placeholder)
│   │   ├── Images/
│   │   │   └── ImagesPage.tsx       # Image management (placeholder)
│   │   └── Settings/
│   │       └── SettingsPage.tsx     # Settings & profile
│   │
│   ├── services/                    # API service layer
│   │   ├── apiClient.ts             # Axios instance with interceptors
│   │   ├── authService.ts           # Authentication API calls
│   │   └── tenantService.ts         # Tenant API calls
│   │
│   ├── utils/                       # Utility functions (future)
│   │
│   ├── App.tsx                      # Root component with routing
│   ├── main.tsx                     # Application entry point
│   └── theme.ts                     # Material-UI theme configuration
│
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies & scripts
├── .env.example                     # Environment variables template
└── README.md                        # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 9+** or **yarn 1.22+**
- **DeepLens Backend APIs** - Must be running (NextGen.Identity API on port 5000)

### Installation

1. **Navigate to project directory:**
   ```powershell
   cd c:\productivity\deeplens\src\DeepLens.WebUI
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure environment:**
   ```powershell
   # Copy example env file
   Copy-Item .env.example .env
   
   # Edit .env with your API URLs (defaults should work for local development)
   ```

4. **Start development server:**
   ```powershell
   npm run dev
   ```

5. **Open browser:**
   ```
   http://localhost:3000
   ```

### Building for Production

```powershell
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# API Endpoints
VITE_API_BASE_URL=http://localhost:5000
VITE_SEARCH_API_URL=http://localhost:5001
VITE_ADMIN_API_URL=http://localhost:5002
VITE_FEATURE_API_URL=http://localhost:8001

# Application Settings
VITE_APP_NAME=DeepLens Admin
VITE_APP_VERSION=0.1.0

# Features
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

**Note:** All environment variables must be prefixed with `VITE_` to be exposed to the client.

### API Proxy Configuration

Development server proxies API requests to avoid CORS issues:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 💻 Development

### Available Scripts

```powershell
# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Style

- **TypeScript** - All new code must use TypeScript
- **Functional Components** - Use functional components with hooks
- **Material-UI** - Follow MUI component patterns
- **ESLint** - Run linter before commits

### Adding a New Page

1. **Create page component:**
   ```typescript
   // src/pages/NewFeature/NewFeaturePage.tsx
   import { Box, Typography } from '@mui/material';

   const NewFeaturePage = () => {
     return (
       <Box>
         <Typography variant="h4">New Feature</Typography>
         {/* Page content */}
       </Box>
     );
   };

   export default NewFeaturePage;
   ```

2. **Add route in App.tsx:**
   ```typescript
   <Route path="/new-feature" element={<NewFeaturePage />} />
   ```

3. **Add to sidebar navigation:**
   ```typescript
   // src/components/Layout/Sidebar.tsx
   const menuItems = [
     // ...
     { text: 'New Feature', icon: <Icon />, path: '/new-feature' },
   ];
   ```

### API Service Pattern

All API calls go through service modules:

```typescript
// src/services/exampleService.ts
import apiClient from './apiClient';

export interface ExampleEntity {
  id: string;
  name: string;
}

export const exampleService = {
  getAll: async (): Promise<ExampleEntity[]> => {
    const response = await apiClient.get('/api/examples');
    return response.data;
  },

  getById: async (id: string): Promise<ExampleEntity> => {
    const response = await apiClient.get(`/api/examples/${id}`);
    return response.data;
  },

  create: async (data: Partial<ExampleEntity>): Promise<ExampleEntity> => {
    const response = await apiClient.post('/api/examples', data);
    return response.data;
  },
};
```

### React Query Usage

Use React Query for data fetching:

```typescript
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { exampleService } from '../services/exampleService';

const ExampleComponent = () => {
  const queryClient = useQueryClient();

  // Fetch data
  const { data, isLoading, error } = useQuery(
    'examples',
    () => exampleService.getAll()
  );

  // Mutation
  const createMutation = useMutation(
    (data) => exampleService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('examples');
      },
    }
  );

  return (/* JSX */);
};
```

---

## 👥 User Roles & Permissions

### Role Hierarchy

1. **Admin** (System Administrator)
   - Access: ALL features
   - Can manage ALL tenants
   - Can create new tenants
   - Can view/edit all users across tenants
   - Full system analytics

2. **TenantOwner** (Tenant Administrator)
   - Access: Own tenant features
   - Can manage users within tenant
   - Can view tenant analytics
   - Can manage tenant images
   - Cannot create new tenants

3. **User** (Standard User)
   - Access: Limited tenant features
   - Can upload/search images
   - Can manage own profile
   - Cannot access admin features

### Route Protection

Routes are protected based on authentication and role:

```typescript
// Protected route - requires authentication
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>

// Role-specific visibility
const menuItems = [
  { text: 'Tenants', path: '/tenants', adminOnly: true }, // Only for Admin
  { text: 'Users', path: '/users' }, // All authenticated users
];
```

---

## 🔌 API Integration

### Backend APIs

The Admin UI integrates with these DeepLens APIs:

| API                          | Port | Purpose                     | Endpoints Used                    |
| ---------------------------- | ---- | --------------------------- | --------------------------------- |
| **NextGen.Identity API**     | 5000 | Authentication & tenants    | `/api/auth/*`, `/api/tenants/*`   |
| **DeepLens.SearchApi**       | 5001 | Image upload & search       | `/api/images/*`                   |
| **DeepLens.AdminApi**        | 5002 | Admin operations            | `/api/collections/*`, `/api/analytics/*` |
| **Feature Extraction**       | 8001 | CNN feature extraction      | `/extract`, `/health`             |

### Authentication Flow

1. **Login:**
   ```typescript
   POST /api/auth/login
   Body: { email, password }
   Response: { accessToken, refreshToken, user }
   ```

2. **Token Storage:**
   - Access token → `localStorage.accessToken`
   - Refresh token → `localStorage.refreshToken`

3. **Authenticated Requests:**
   ```typescript
   Headers: { Authorization: `Bearer ${accessToken}` }
   ```

4. **Token Refresh (Automatic):**
   - When 401 response received
   - POST `/api/auth/refresh` with refresh token
   - Update stored tokens
   - Retry original request

5. **Logout:**
   ```typescript
   POST /api/auth/logout
   Body: { refreshToken }
   Clear localStorage tokens
   ```

### Error Handling

API errors are handled in interceptors:

```typescript
// src/services/apiClient.ts
this.client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try token refresh
    } else if (error.response?.status === 403) {
      // Forbidden - show error
    }
    return Promise.reject(error);
  }
);
```

---

## 🎯 Planned Features

### Phase 1: User Management (Next)
- [ ] User list page with pagination
- [ ] Create/edit/delete users
- [ ] User role assignment
- [ ] Email confirmation management
- [ ] Password reset functionality
- [ ] User activity logs

### Phase 2: Image Management
- [ ] Image upload with drag-and-drop
- [ ] Image gallery with thumbnails
- [ ] Image search by similarity
- [ ] Image metadata viewing/editing
- [ ] Bulk operations (delete, tag)
- [ ] Image analytics (upload trends, popular images)

### Phase 3: Advanced Analytics
- [ ] Tenant usage dashboard
  - Storage consumption charts
  - API call statistics
  - User activity metrics
- [ ] System-wide analytics (Admin)
  - Tenant growth over time
  - Resource utilization
  - Performance metrics
- [ ] Custom date range filtering
- [ ] Export analytics to CSV/PDF

### Phase 4: Enhanced Tenant Management
- [ ] Tenant tier upgrades/downgrades
- [ ] Resource usage visualization
- [ ] Tenant suspension/activation workflows
- [ ] Infrastructure status monitoring
- [ ] Tenant billing information

### Phase 5: Settings & Customization
- [ ] User profile editing
- [ ] Password change
- [ ] Email preferences
- [ ] Dark mode toggle
- [ ] Notification settings
- [ ] API key management

### Phase 6: Advanced Features
- [ ] Real-time notifications (SignalR)
- [ ] Activity audit logs
- [ ] Advanced search filters
- [ ] Batch operations
- [ ] Export/import functionality
- [ ] Multi-language support (i18n)

### Phase 7: Mobile Responsiveness
- [ ] Mobile-optimized layouts
- [ ] Touch gesture support
- [ ] Progressive Web App (PWA)
- [ ] Mobile-specific navigation

---

## 🧪 Testing (Planned)

### Testing Strategy

```powershell
# Unit tests (Vitest + React Testing Library)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Structure (To be implemented)

```
src/
├── components/
│   └── __tests__/
│       ├── Layout.test.tsx
│       └── Sidebar.test.tsx
├── pages/
│   └── __tests__/
│       └── LoginPage.test.tsx
└── services/
    └── __tests__/
        └── authService.test.ts
```

---

## 🔧 Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure backend APIs are running
- Check Vite proxy configuration
- Verify API URLs in `.env`

**2. Authentication Fails**
- Check if NextGen.Identity API is accessible
- Verify JWT token format
- Check browser localStorage for tokens

**3. 404 on Refresh**
- Vite dev server handles this automatically
- For production, configure server for SPA routing

**4. Module Not Found**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript path aliases in `tsconfig.json`

---

## 🤝 Contributing

### Development Workflow

1. **Create feature branch:**
   ```powershell
   git checkout -b feature/new-feature
   ```

2. **Make changes and test:**
   ```powershell
   npm run dev
   npm run lint
   ```

3. **Commit with descriptive message:**
   ```powershell
   git commit -m "feat: Add user management page"
   ```

4. **Push and create pull request:**
   ```powershell
   git push origin feature/new-feature
   ```

### Commit Message Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📚 Additional Resources

### Documentation Links
- **Main Project:** [../PROJECT_PLAN.md](../../PROJECT_PLAN.md)
- **Backend API:** [../NextGen.Identity.Api/README.md](../NextGen.Identity.Api/README.md)
- **Infrastructure:** [../../infrastructure/README.md](../../infrastructure/README.md)

### External Resources
- [React Documentation](https://react.dev/)
- [Material-UI Documentation](https://mui.com/)
- [React Router Documentation](https://reactrouter.com/)
- [React Query Documentation](https://tanstack.com/query/v3/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)

---

## 📊 Project Status

**Current Version:** 0.1.0-alpha  
**Status:** 🟡 In Active Development

### Feature Completion

| Feature Category      | Status | Completion |
| --------------------- | ------ | ---------- |
| Authentication        | ✅      | 100%       |
| Layout & Navigation   | ✅      | 100%       |
| Dashboard             | ✅      | 80%        |
| Tenant Management     | ✅      | 70%        |
| User Management       | 🚧      | 10%        |
| Image Management      | 🚧      | 5%         |
| Analytics             | 🚧      | 20%        |
| Settings              | 🚧      | 30%        |

**Legend:**
- ✅ Complete
- 🚧 In Progress
- ⏳ Planned

---

## 📝 License

Copyright © 2025 DeepLens Development Team

---

## 👤 Maintainers

**DeepLens Development Team**

For questions or support, please refer to the main project documentation.

---

**Last Updated:** December 18, 2025  
**Next Review:** January 2026
