# Search and Filtering Architecture

## Overview

The WhatsApp Processor application now includes a robust search and filtering mechanism across all conversation lists (Chats, Groups, Announcements). This system is designed to be responsive, efficient, and user-friendly.

## Key Features

1.  **Dual-Field Search**:
    *   **Name Search**: Matches chats by their display name (e.g., "DeepLens Team").
    *   **JID/Phone Search**: Matches chats by their raw JID or phone number (e.g., "1234567890"). This allows users to find contacts even if they don't have a saved name or specific keyword in the name.

2.  **Debounced Input**:
    *   To prevent excessive API calls and UI flickering, all search inputs are **debounced**.
    *   **Delay**: 300ms (Client-Side) / 500ms (Server-Side requests).
    *   **Hook**: A custom `useDebounce` hook is used to manage this logic cleanly.

3.  **Race Condition Handling**:
    *   When searching against the backend API, the system tracks `requestIds`.
    *   If a newer search request completes before an older one (a "race condition"), the older result is discarded to prevent the UI from showing stale data.

4.  **Client & Server Consistency**:
    *   **Client-Side (ConversationList)**: Optimized for speed when filtering the currently loaded list of chats in the sidebar.
    *   **Server-Side (Admin Pages)**: Optimized for performance when searching through the potentially large database of historical records.

## Technical Implementation

### Frontend (`client/src`)

*   **`hooks/useDebounce.ts`**:
    ```typescript
    export function useDebounce<T>(value: T, delay: number): T {
        // Returns a value that only updates after 'delay' ms of inactivity
    }
    ```

*   **`components/ConversationList.tsx`**:
    *   Uses `useDebounce` for the search text.
    *   Filters the `chats` array using `useMemo` to ensure high performance even with large lists.
    *   Filter logic: `name.toLowerCase().includes(query) || jid.includes(query)`

### Backend (`src/routes/api.routes.ts`)

*   **SQL Logic**:
    *   Queries have been updated to check both columns:
    *   `WHERE ... AND (c.name ILIKE $1 OR c.jid ILIKE $1)`
    *   This ensures consistency between the frontend filter and backend search results.

## Usage

*   **Finding a Chat**: Simply type a name or a phone number into the search bar.
*   **Duplicate Detection**: This search capability is crtiical for identifying "duplicate" entities, such as distinguishing between a Community Parent and its Announcement Group, as they often share names but have different JIDs.
