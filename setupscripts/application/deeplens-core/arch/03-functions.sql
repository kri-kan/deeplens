\c deeplens_platform;

-- =============================================================================
-- DeepLens Multi-Tenant: Tenant Provisioning Functions
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
    v_database_name := 'tenant_' || REPLACE(p_tenant_name, '-', '_') || '_' || p_database_suffix;
    v_sql := 'CREATE DATABASE ' || quote_ident(v_database_name) || 
             ' WITH TEMPLATE tenant_metadata_template OWNER tenant_service';
    EXECUTE v_sql;
    INSERT INTO tenant_databases (tenant_id, database_name, database_type, connection_string_encrypted, is_active)
    VALUES (p_tenant_id, v_database_name, p_database_suffix, 'Host=localhost;Database=' || v_database_name || ';Username=tenant_service;Password=DeepLens123!', true);
    RETURN v_database_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION configure_tenant_storage(
    p_tenant_id UUID,
    p_provider VARCHAR(50),
    p_configuration JSONB
) RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    INSERT INTO tenant_storage_configs (tenant_id, provider, configuration, is_active)
    VALUES (p_tenant_id, p_provider, p_configuration, true)
    RETURNING id INTO v_config_id;
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

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
    INSERT INTO tenants (name, domain, subdomain, plan_type, usage_limits, is_active)
    VALUES (p_name, p_domain, p_subdomain, p_plan_type, '{"storage_gb": 1}', true)
    RETURNING id INTO v_tenant_id;
    v_database_name := create_tenant_database(v_tenant_id, p_name, 'metadata');
    v_storage_config_id := configure_tenant_storage(v_tenant_id, p_storage_provider, p_storage_config);
    RETURN QUERY SELECT v_tenant_id, p_name, v_database_name, v_storage_config_id, 'created'::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to platform_service
GRANT EXECUTE ON FUNCTION create_tenant TO platform_service;
GRANT EXECUTE ON FUNCTION create_tenant_database TO platform_service;
GRANT EXECUTE ON FUNCTION configure_tenant_storage TO platform_service;
