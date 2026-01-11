-- WhatsApp Vayyari Data Database - Complete Setup
-- Database: whatsapp_vayyari_data
-- Description: Master script to create all tables in correct order

-- Execute this script to set up the complete database schema

\echo 'Creating WhatsApp Vayyari Data Database Schema...'
\echo ''

-- 0. Create auth table
\echo '0. Creating wa_auth_sessions table...'
\i 000_auth_storage.sql
\echo 'Done.'
\echo ''

-- 1. Create chats table
\echo '1. Creating chats table...'
\i 001_chats.sql
\echo 'Done.'
\echo ''

-- 2. Create messages table
\echo '2. Creating messages table...'
\i 002_messages.sql
\echo 'Done.'
\echo ''

-- 3. Create chat_tracking_state table
\echo '3. Creating chat_tracking_state table...'
\i 003_chat_tracking_state.sql
\echo 'Done.'
\echo ''

-- 4. Create processing_state table
\echo '4. Creating processing_state table...'
\i 004_processing_state.sql
\echo 'Done.'
\echo ''

-- 5. Create media_files table
\echo '5. Creating media_files table...'
\i 005_media_files.sql
\echo 'Done.'
\echo ''

-- 6. Create conversation_sync_state table
\echo '6. Creating conversation_sync_state table...'
\i 006_conversation_sync_state.sql
\echo 'Done.'
\echo ''

\echo 'Database schema creation complete!'
\echo ''
\echo 'Tables created:'
\echo '  - wa_auth_sessions'
\echo '  - chats'
\echo '  - messages'
\echo '  - chat_tracking_state'
\echo '  - processing_state'
\echo '  - media_files'
\echo '  - conversation_sync_state'

-- 7. Create contacts table
\echo '7. Creating contacts table...'
\i 007_contacts.sql
\echo 'Done.'
\echo ''
\echo '  - contacts'
