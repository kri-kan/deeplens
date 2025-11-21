-- =============================================================================
-- DeepLens Multi-Tenant: Tenant Provisioning Script
-- =============================================================================
-- This script provides functions and procedures for dynamic tenant provisioning
-- Usage: SELECT create_tenant('tenant-name', 'example.com', 'tenant1', 'premium');
-- =============================================================================

-- =============================================================================
-- Tenant Database Creation Function
-- =============================================================================

CREATE OR REPLACE FUNCTION create_tenant_database(
    p_tenant_id UUID,
    p_tenant_name VARCHAR(255),
    p_database_suffix VARCHAR(100) DEFAULT 'metadata'
) RETURNS VARCHAR(255) AS $$
DECLARE
    v_database_name VARCHAR(255);
    v_sql TEXT;
BEGIN
    -- Generate unique database name
    v_database_name := 'tenant_' || REPLACE(p_tenant_name, '-', '_') || '_' || p_database_suffix;
    
    -- Create the database
    v_sql := 'CREATE DATABASE ' || quote_ident(v_database_name) || 
             ' WITH TEMPLATE tenant_metadata_template OWNER tenant_service';
    
    EXECUTE v_sql;
    
    -- Log the database creation in platform registry
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (
        p_tenant_id,
        v_database_name,
        p_database_suffix,
        pgp_sym_encrypt(
            'Host=localhost;Database=' || v_database_name || ';Username=tenant_service;Password=DeepLens123!',
            current_setting('encryption.key', true)
        ),
        true
    );
    
    RETURN v_database_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tenant Storage Configuration Function
-- =============================================================================

CREATE OR REPLACE FUNCTION configure_tenant_storage(
    p_tenant_id UUID,
    p_provider VARCHAR(50),
    p_configuration JSONB
) RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Validate provider
    IF p_provider NOT IN ('azure_blob', 'aws_s3', 'gcs', 'minio', 'nfs') THEN
        RAISE EXCEPTION 'Unsupported storage provider: %', p_provider;
    END IF;
    
    -- Insert storage configuration
    INSERT INTO tenant_storage_configs (tenant_id, provider, configuration, is_active)
    VALUES (
        p_tenant_id,
        p_provider,
        pgp_sym_encrypt(
            p_configuration::TEXT,
            current_setting('encryption.key', true)
        )::JSONB,
        true
    )
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Complete Tenant Provisioning Function
-- =============================================================================

CREATE OR REPLACE FUNCTION create_tenant(
    p_name VARCHAR(255),
    p_domain VARCHAR(255) DEFAULT NULL,
    p_subdomain VARCHAR(100) DEFAULT NULL,
    p_plan_type VARCHAR(50) DEFAULT 'free',
    p_storage_provider VARCHAR(50) DEFAULT 'minio',
    p_storage_config JSONB DEFAULT '{}'
) RETURNS TABLE (
    tenant_id UUID,
    tenant_name VARCHAR(255),
    database_name VARCHAR(255),
    storage_config_id UUID,
    status VARCHAR(20)
) AS $$
DECLARE
    v_tenant_id UUID;
    v_database_name VARCHAR(255);
    v_storage_config_id UUID;
    v_usage_limits JSONB;
BEGIN
    -- Set usage limits based on plan
    CASE p_plan_type
        WHEN 'free' THEN
            v_usage_limits := '{"storage_gb": 1, "api_calls_per_month": 1000, "max_collections": 5}';
        WHEN 'premium' THEN
            v_usage_limits := '{"storage_gb": 100, "api_calls_per_month": 100000, "max_collections": 50}';
        WHEN 'enterprise' THEN
            v_usage_limits := '{"storage_gb": 1000, "api_calls_per_month": 1000000, "max_collections": 500}';
        ELSE
            v_usage_limits := '{"storage_gb": 1, "api_calls_per_month": 1000, "max_collections": 5}';
    END CASE;
    
    -- Create tenant record
    INSERT INTO tenants (name, domain, subdomain, plan_type, usage_limits, is_active)
    VALUES (p_name, p_domain, p_subdomain, p_plan_type, v_usage_limits, true)
    RETURNING id INTO v_tenant_id;
    
    -- Create tenant database
    BEGIN
        v_database_name := create_tenant_database(v_tenant_id, p_name, 'metadata');
    EXCEPTION WHEN OTHERS THEN
        -- Rollback tenant creation if database creation fails
        DELETE FROM tenants WHERE id = v_tenant_id;
        RAISE EXCEPTION 'Failed to create tenant database: %', SQLERRM;
    END;
    
    -- Configure tenant storage
    BEGIN
        v_storage_config_id := configure_tenant_storage(v_tenant_id, p_storage_provider, p_storage_config);
    EXCEPTION WHEN OTHERS THEN
        -- Rollback tenant and database creation if storage configuration fails
        EXECUTE 'DROP DATABASE IF EXISTS ' || quote_ident(v_database_name);
        DELETE FROM tenant_databases WHERE tenant_id = v_tenant_id;
        DELETE FROM tenants WHERE id = v_tenant_id;
        RAISE EXCEPTION 'Failed to configure tenant storage: %', SQLERRM;
    END;
    
    -- Initialize Redis database for tenant
    BEGIN
        PERFORM initialize_tenant_redis_database(v_tenant_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Warning: Failed to initialize Redis database: %', SQLERRM;
    END;
    
    -- Create Qdrant collection for tenant
    BEGIN
        PERFORM create_tenant_qdrant_collection(v_tenant_id, p_name);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Warning: Failed to create Qdrant collection: %', SQLERRM;
    END;
    
    -- Return tenant information
    RETURN QUERY SELECT 
        v_tenant_id,
        p_name,
        v_database_name,
        v_storage_config_id,
        'created'::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tenant Cleanup Function
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_tenant(
    p_tenant_id UUID,
    p_confirm_deletion BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    tenant_id UUID,
    databases_dropped INTEGER,
    status VARCHAR(20)
) AS $$
DECLARE
    v_database_record RECORD;
    v_databases_dropped INTEGER := 0;
BEGIN
    -- Safety check
    IF NOT p_confirm_deletion THEN
        RAISE EXCEPTION 'Tenant deletion requires confirmation. Set p_confirm_deletion to TRUE.';
    END IF;
    
    -- Check if tenant exists
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
    END IF;
    
    -- Drop all tenant databases
    FOR v_database_record IN 
        SELECT database_name FROM tenant_databases WHERE tenant_id = p_tenant_id AND is_active = true
    LOOP
        EXECUTE 'DROP DATABASE IF EXISTS ' || quote_ident(v_database_record.database_name);
        v_databases_dropped := v_databases_dropped + 1;
    END LOOP;
    
    -- Clean up tenant records (cascading deletes will handle related tables)
    DELETE FROM tenants WHERE id = p_tenant_id;
    
    -- Return cleanup summary
    RETURN QUERY SELECT 
        p_tenant_id,
        v_databases_dropped,
        'deleted'::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Redis and Qdrant Integration Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION initialize_tenant_redis_database(
    p_tenant_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_redis_db_number INTEGER;
BEGIN
    -- Calculate Redis database number (0-15) based on tenant ID hash
    v_redis_db_number := (hashtext(p_tenant_id::TEXT) % 16);
    
    -- Log Redis database assignment
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (
        p_tenant_id,
        'redis_db_' || v_redis_db_number,
        'cache',
        pgp_sym_encrypt(
            'Host=localhost;Port=6379;Database=' || v_redis_db_number,
            current_setting('encryption.key', true)
        ),
        true
    )
    ON CONFLICT (tenant_id, database_type) DO UPDATE SET
        database_name = EXCLUDED.database_name,
        connection_string_encrypted = EXCLUDED.connection_string_encrypted;
    
    RETURN v_redis_db_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_tenant_qdrant_collection(
    p_tenant_id UUID,
    p_tenant_name VARCHAR(255)
) RETURNS VARCHAR(255) AS $$
DECLARE
    v_collection_name VARCHAR(255);
BEGIN
    -- Generate unique collection name
    v_collection_name := 'tenant_' || REPLACE(p_tenant_name, '-', '_') || '_vectors';
    
    -- Log Qdrant collection assignment
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (
        p_tenant_id,
        v_collection_name,
        'vectors',
        pgp_sym_encrypt(
            'Host=localhost;Port=6333;Collection=' || v_collection_name,
            current_setting('encryption.key', true)
        ),
        true
    )
    ON CONFLICT (tenant_id, database_type) DO UPDATE SET
        database_name = EXCLUDED.database_name,
        connection_string_encrypted = EXCLUDED.connection_string_encrypted;
    
    RETURN v_collection_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tenant Status and Management Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION get_tenant_info(p_tenant_id UUID)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name VARCHAR(255),
    domain VARCHAR(255),
    subdomain VARCHAR(100),
    plan_type VARCHAR(50),
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    usage_limits JSONB,
    database_count INTEGER,
    storage_provider VARCHAR(50),
    storage_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.domain,
        t.subdomain,
        t.plan_type,
        t.is_active,
        t.created_at,
        t.usage_limits,
        (SELECT COUNT(*)::INTEGER FROM tenant_databases td WHERE td.tenant_id = t.id AND td.is_active = true),
        (SELECT tsc.provider FROM tenant_storage_configs tsc WHERE tsc.tenant_id = t.id AND tsc.is_active = true LIMIT 1),
        (SELECT tsc.test_status FROM tenant_storage_configs tsc WHERE tsc.tenant_id = t.id AND tsc.is_active = true LIMIT 1)
    FROM tenants t
    WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION list_tenants(
    p_active_only BOOLEAN DEFAULT TRUE,
    p_plan_type VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name VARCHAR(255),
    domain VARCHAR(255),
    plan_type VARCHAR(50),
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    database_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.domain,
        t.plan_type,
        t.is_active,
        t.created_at,
        (SELECT COUNT(*)::INTEGER FROM tenant_databases td WHERE td.tenant_id = t.id AND td.is_active = true)
    FROM tenants t
    WHERE 
        (p_active_only = FALSE OR t.is_active = true) AND
        (p_plan_type IS NULL OR t.plan_type = p_plan_type)
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tenant Database Context Setup
-- =============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Set the current tenant ID for Row Level Security
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Grant Permissions
-- =============================================================================

-- Grant execute permissions to platform_service
GRANT EXECUTE ON FUNCTION create_tenant TO platform_service;
GRANT EXECUTE ON FUNCTION create_tenant_database TO platform_service;
GRANT EXECUTE ON FUNCTION configure_tenant_storage TO platform_service;
GRANT EXECUTE ON FUNCTION delete_tenant TO platform_service;
GRANT EXECUTE ON FUNCTION get_tenant_info TO platform_service;
GRANT EXECUTE ON FUNCTION list_tenants TO platform_service;
GRANT EXECUTE ON FUNCTION set_tenant_context TO platform_service;
GRANT EXECUTE ON FUNCTION set_tenant_context TO tenant_service;
GRANT EXECUTE ON FUNCTION initialize_tenant_redis_database TO platform_service;
GRANT EXECUTE ON FUNCTION create_tenant_qdrant_collection TO platform_service;

-- Grant permissions for Infisical and monitoring tables
GRANT ALL ON TABLE infisical_projects TO platform_service;
GRANT ALL ON TABLE infisical_secrets TO platform_service;
GRANT ALL ON TABLE system_health_metrics TO platform_service;
GRANT ALL ON TABLE service_dependencies TO platform_service;
GRANT ALL ON TABLE tenant_performance_metrics TO platform_service;

-- Grant read permissions for analytics
GRANT SELECT ON TABLE infisical_projects TO analytics_readonly;
GRANT SELECT ON TABLE system_health_metrics TO analytics_readonly;
GRANT SELECT ON TABLE service_dependencies TO analytics_readonly;
GRANT SELECT ON TABLE tenant_performance_metrics TO analytics_readonly;

-- =============================================================================
-- Example Usage and Testing
-- =============================================================================

-- Example 1: Create a free tier tenant with MinIO storage
-- SELECT * FROM create_tenant(
--     'acme-corp',
--     'acme-corp.com',
--     'acme',
--     'free',
--     'minio',
--     '{"endpoint": "http://minio:9000", "bucket": "acme-corp-images", "access_key": "minioadmin", "secret_key": "minioadmin"}'
-- );

-- Example 2: Create a premium tenant with Azure Blob Storage
-- SELECT * FROM create_tenant(
--     'enterprise-client',
--     'enterprise.example.com',
--     'enterprise',
--     'premium',
--     'azure_blob',
--     '{"connection_string": "DefaultEndpointsProtocol=https;AccountName=storage;AccountKey=key;EndpointSuffix=core.windows.net", "container": "images"}'
-- );

-- Example 3: List all active tenants
-- SELECT * FROM list_tenants(true);

-- Example 4: Get detailed tenant information
-- SELECT * FROM get_tenant_info('tenant-uuid-here');

-- Example 5: Delete a tenant (requires confirmation)
-- SELECT * FROM delete_tenant('tenant-uuid-here', true);