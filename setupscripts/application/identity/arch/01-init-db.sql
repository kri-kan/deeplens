-- NextGen Identity Database (Duende IdentityServer)
CREATE DATABASE nextgen_identity;

-- NextGen Identity Service User
CREATE USER nextgen_identity_service WITH PASSWORD 'DeepLens123!';
GRANT ALL PRIVILEGES ON DATABASE nextgen_identity TO nextgen_identity_service;

\c nextgen_identity;

-- Enable required extensions for NextGen Identity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema permissions for NextGen identity service
GRANT ALL ON SCHEMA public TO nextgen_identity_service;
GRANT ALL ON ALL TABLES IN SCHEMA public TO nextgen_identity_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO nextgen_identity_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nextgen_identity_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nextgen_identity_service;
