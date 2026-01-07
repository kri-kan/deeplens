# Manual Message Grouping Corrections

Added features to correct message grouping mistakes directly from the UI.

## Features

### 1. Split Group
- **What it does**: Starts a new group from the selected message.
- **Use Case**: Two distinct products were grouped together by mistake.
- **Action**: Hover over the message where the new group should start, click **Split Group**.
- **Result**: The selected message and all subsequent messages in the same group get a new Group ID.

### 2. Boundary Correction (Move Group)
- **What it does**: Moves a message to the Previous or Next group.
- **Use Case**: A photo belonging to Product A was captured in interval of Product B (or vice versa).
- **Action**: Hover over the message, click **< Prev** or **Next >**.
- **Result**: The message joins the adjacent group.

## Implementation Details

### API
- `POST /api/conversations/:jid/messages/:messageId/split-group`
- `POST /api/conversations/:jid/messages/:messageId/move-group`
  - Body: `{ direction: 'prev' | 'next' }`

### UI
- **Visual Dividers**: Horizontal lines appearing when the Group ID changes.
- **Hover Controls**: Action buttons appear on individual messages on hover.

## Status
- [x] Database Schema (Group ID support)
- [x] Backend API
- [x] Frontend Integration
- [x] UI Controls
