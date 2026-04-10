-- NextGen Identity Database Schema
-- PostgreSQL Migration Script
-- Version: 1.0.0

-- =====================================================
-- TENANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    
    -- Database configuration
    database_name VARCHAR(100) NOT NULL,
    connection_string TEXT,
    
    -- Infrastructure
    qdrant_container_name VARCHAR(100) NOT NULL,
    qdrant_http_port INTEGER NOT NULL,
    qdrant_grpc_port INTEGER NOT NULL,
    minio_endpoint VARCHAR(255) NOT NULL,
    minio_bucket_name VARCHAR(100) NOT NULL,
    
    -- Status and limits
    status SMALLINT NOT NULL DEFAULT 1, -- 1=Active, 2=Suspended, 3=PendingSetup, 4=Deleted
    tier SMALLINT NOT NULL DEFAULT 1,   -- 1=Free, 2=Professional, 3=Enterprise
    max_storage_bytes BIGINT NOT NULL DEFAULT 10737418240,
    max_users INTEGER NOT NULL DEFAULT 10,
    max_api_calls_per_day INTEGER NOT NULL DEFAULT 10000,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_by UUID,
    
    CONSTRAINT chk_status CHECK (status BETWEEN 1 AND 4),
    CONSTRAINT chk_tier CHECK (tier BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Authentication
    email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    email_confirmation_token VARCHAR(255),
    email_confirmation_token_expiry TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_token_expiry TIMESTAMP,
    
    -- Authorization
    role SMALLINT NOT NULL DEFAULT 1, -- 1=User, 2=Admin, 3=TenantOwner
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT chk_role CHECK (role BETWEEN 1 AND 3),
    CONSTRAINT uq_tenant_email UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;

-- =====================================================
-- REFRESH_TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token) WHERE is_revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE is_revoked = FALSE;

-- =====================================================
-- TENANT_API_KEYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL,
    scopes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON tenant_api_keys(key_prefix) WHERE is_active = TRUE;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE tenants IS 'Multi-tenant organizations';
COMMENT ON TABLE users IS 'User accounts within tenants';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for session management';
COMMENT ON TABLE tenant_api_keys IS 'API keys for programmatic tenant access';
