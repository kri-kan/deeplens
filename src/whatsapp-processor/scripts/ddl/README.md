# Database Scripts

This folder contains all DDL (Data Definition Language) scripts for the WhatsApp Processor database.

## Database Structure

### Database: `whatsapp_vayyari_data`

This is a standalone database dedicated to storing WhatsApp messages, chats, and media metadata.

### Separate from DeepLens Core

- **DeepLens Core DB** (`deeplens_vayyari_core`): Tenant metadata, feature extraction, etc.
- **WhatsApp Data DB** (`whatsapp_vayyari_data`): WhatsApp messages, chats, media

## DDL Scripts

All table definitions are in separate files for easy maintenance:

| File                          | Table                 | Description                        |
| ----------------------------- | --------------------- | ---------------------------------- |
| `001_chats.sql`               | `chats`               | WhatsApp chats and groups          |
| `002_messages.sql`            | `messages`            | All WhatsApp messages              |
| `003_chat_tracking_state.sql` | `chat_tracking_state` | Exclusion list and tracking state  |
| `004_processing_state.sql`    | `processing_state`    | Global pause/resume state          |
| `005_media_files.sql`         | `media_files`         | Media file metadata and MinIO URLs |

## Setup Instructions

### Option 1: Using Master Script (Recommended)

```bash
# Navigate to DDL folder
cd scripts/ddl

# Create database first
psql -U postgres -c "CREATE DATABASE whatsapp_vayyari_data;"

# Run master setup script
psql -U postgres -d whatsapp_vayyari_data -f setup.sql
```

### Option 2: Manual Execution

Execute each file in order:

```bash
psql -U postgres -d whatsapp_vayyari_data -f 001_chats.sql
psql -U postgres -d whatsapp_vayyari_data -f 002_messages.sql
psql -U postgres -d whatsapp_vayyari_data -f 003_chat_tracking_state.sql
psql -U postgres -d whatsapp_vayyari_data -f 004_processing_state.sql
psql -U postgres -d whatsapp_vayyari_data -f 005_media_files.sql
```

## Development Workflow

### During Development Phase

- **No migrations needed** - we're in active development
- **Update DDL files directly** - replace existing scripts with new schema
- **Keep files up-to-date** - always reflect current schema

### When Adding New Tables

1. Create new file: `00X_table_name.sql`
2. Add DDL with proper comments and indexes
3. Update `setup.sql` to include new file
4. Update this README

### When Modifying Existing Tables

1. Update the corresponding DDL file
2. Document changes in comments
3. For first-time deployment, just run updated DDL
4. No migration scripts needed during development

## Schema Overview

### Tables

#### 1. chats
Stores all WhatsApp chats (individual and group).

**Key Fields:**
- `jid` (PK): WhatsApp JID
- `name`: Chat/group name
- `is_group`: Boolean flag
- `metadata`: JSONB for additional data

#### 2. messages
Stores all WhatsApp messages with full-text search support.

**Key Fields:**
- `id` (PK): Auto-increment
- `message_id` (Unique): WhatsApp message ID
- `jid` (FK): Reference to chats
- `content`: Message text
- `media_url`: MinIO URL for media
- `timestamp`: Unix timestamp

**Features:**
- Full-text search on content
- Foreign key to chats
- Indexes on timestamp, sender, media type

#### 3. chat_tracking_state
Manages exclusion list and tracking state per chat.

**Key Fields:**
- `jid` (PK, FK): Reference to chats
- `is_excluded`: Exclusion flag
- `last_processed_message_id`: Resume point
- `resume_mode`: 'from_last' or 'from_now'

#### 4. processing_state
Singleton table for global pause/resume state.

**Key Fields:**
- `id` (PK): Always 1
- `is_paused`: Global pause flag
- `paused_at`, `resumed_at`: Timestamps

#### 5. media_files
Tracks all media files with MinIO and DeepLens URLs.

**Key Fields:**
- `id` (PK): Auto-increment
- `minio_url`: Current MinIO location
- `deeplens_url`: Future DeepLens location
- `message_id` (FK): Reference to messages
- `media_type`: photo, video, audio, document

**Features:**
- Supports migration to DeepLens bucket
- Tracks upload status
- JSONB metadata

## Indexes

All tables have appropriate indexes for:
- Primary keys
- Foreign keys
- Timestamp queries
- Search operations
- Filtering by status/type

## Foreign Keys

Proper referential integrity with cascade deletes:
- `messages.jid` → `chats.jid` (CASCADE)
- `chat_tracking_state.jid` → `chats.jid` (CASCADE)
- `media_files.jid` → `chats.jid` (CASCADE)
- `media_files.message_id` → `messages.message_id` (SET NULL)

## Future Enhancements

When moving to production:
- Add migration scripts (Flyway, Liquibase, or custom)
- Version control for schema changes
- Rollback procedures
- Data migration scripts

## Connection String

Set in `.env`:
```
VAYYARI_WA_DB_CONNECTION_STRING=postgresql://postgres:password@localhost:5432/whatsapp_vayyari_data
```

## Notes

- All DDL scripts use `IF NOT EXISTS` for idempotency
- Scripts can be run multiple times safely
- Comments included for all tables and columns
- JSONB used for flexible metadata storage
- Full-text search enabled on message content
