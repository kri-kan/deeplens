# Changelog

## React Migration (December 2025)

### Summary
Migrated from plain HTML/JavaScript UI to modern React application with TypeScript.

### What Changed

**Removed:**
- Legacy `public/index.html` with inline JavaScript
- CDN-loaded libraries (TailwindCSS, Socket.IO, QRCode)
- Manual DOM manipulation

**Added:**
- Modern React 18 application with TypeScript
- Component-based architecture (`Header`, `QRSection`, `GroupsSection`, `GroupItem`)
- Vite for fast development and optimized builds
- Proper state management with React hooks
- Type-safe Socket.IO integration
- `.env` file for configuration management

### Benefits

✅ **Developer Experience** - Hot reload, TypeScript autocomplete, component isolation  
✅ **Maintainability** - Easier to add features, refactor, and test  
✅ **Performance** - Optimized production builds with code splitting  
✅ **Type Safety** - Catch errors at compile time  
✅ **Modern Stack** - Industry-standard tools and practices  

### Migration Notes

The backend automatically serves the React build from `public/dist/`. If the build doesn't exist, it shows a helpful setup page.

For development, run the React dev server separately on port 3006 with `npm run dev:client`.

---

See `README.md` for current setup and usage instructions.
