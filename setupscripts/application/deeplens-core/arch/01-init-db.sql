-- Platform Management Database (Tenant management, configurations)
CREATE DATABASE deeplens_platform;

-- Platform Service User (manages tenants, configurations)
CREATE USER platform_service WITH PASSWORD 'DeepLens123!';
GRANT ALL PRIVILEGES ON DATABASE deeplens_platform TO platform_service;

-- Analytics User (read-only access for reporting and BI tools)
CREATE USER analytics_readonly WITH PASSWORD 'DeepLens123!';
GRANT CONNECT ON DATABASE deeplens_platform TO analytics_readonly;

\c deeplens_platform;

-- Enable required extensions for Platform Management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- Grant schema permissions for platform service
GRANT ALL ON SCHEMA public TO platform_service;
GRANT ALL ON ALL TABLES IN SCHEMA public TO platform_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO platform_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO platform_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO platform_service;

-- Grant read-only permissions for analytics (reporting/BI tools)
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_readonly;
