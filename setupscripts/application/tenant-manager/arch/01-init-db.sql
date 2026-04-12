-- Template Database for Tenant Metadata (used for creating tenant-specific databases)
CREATE DATABASE tenant_metadata_template;

-- Tenant Service User (creates and manages tenant databases)
-- This user is already created in the platform init, but we ensure it has template access.
-- If running standalone, uncomment the user creation below.
-- CREATE USER tenant_service WITH PASSWORD 'DeepLens123!' CREATEDB;

GRANT ALL PRIVILEGES ON DATABASE tenant_metadata_template TO tenant_service;

\c tenant_metadata_template;

-- Enable required extensions for tenant databases
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";
