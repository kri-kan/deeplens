\c deeplens_platform;

-- DeepLens Platform Management Database Schema

-- =============================================================================
-- Platform Management Tables
-- =============================================================================

-- Tenants Registry
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    usage_limits JSONB DEFAULT '{"storage_gb": 1, "api_calls_per_month": 1000}',
    metadata JSONB DEFAULT '{}'
);

-- Tenant Storage Configurations
CREATE TABLE IF NOT EXISTS tenant_storage_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'azure_blob', 'aws_s3', 'gcs', 'nfs', 'minio'
    is_active BOOLEAN DEFAULT TRUE,
    configuration JSONB NOT NULL, -- Encrypted storage settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) DEFAULT 'pending', -- 'success', 'failed', 'pending'
    test_error TEXT,
    
    UNIQUE(tenant_id, provider)
);

-- Tenant Database Registry
CREATE TABLE IF NOT EXISTS tenant_databases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    database_name VARCHAR(255) NOT NULL UNIQUE,
    database_type VARCHAR(50) NOT NULL, -- 'metadata', 'vectors', 'cache'
    connection_string_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, database_type)
);

-- Platform Configuration
CREATE TABLE IF NOT EXISTS platform_configs (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID -- Reference to admin user
);

-- API Usage Tracking
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Infisical Projects Registry
CREATE TABLE IF NOT EXISTS infisical_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL UNIQUE,
    project_name VARCHAR(255) NOT NULL,
    environment VARCHAR(50) DEFAULT 'development',
    client_id VARCHAR(255) NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE
);

-- Infisical Secret Registry
CREATE TABLE IF NOT EXISTS infisical_secrets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES infisical_projects(id) ON DELETE CASCADE,
    secret_key VARCHAR(255) NOT NULL,
    secret_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    UNIQUE(project_id, secret_key)
);

-- System Health Metrics
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'healthy', -- 'healthy', 'warning', 'critical'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Service Dependencies Tracking
CREATE TABLE IF NOT EXISTS service_dependencies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    dependency_name VARCHAR(100) NOT NULL,
    dependency_type VARCHAR(50) NOT NULL, -- 'database', 'cache', 'api', 'storage'
    is_critical BOOLEAN DEFAULT TRUE,
    health_check_url VARCHAR(500),
    last_check TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'
    response_time_ms INTEGER,
    
    UNIQUE(service_name, dependency_name)
);

-- Tenant Performance Metrics
CREATE TABLE IF NOT EXISTS tenant_performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'api_latency', 'search_performance', 'storage_usage'
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    aggregation_period VARCHAR(20) DEFAULT '1h', -- '1m', '5m', '1h', '1d'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Kubernetes Infrastructure Metadata
CREATE TABLE IF NOT EXISTS k8s_clusters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cluster_endpoint VARCHAR(500) NOT NULL,
    cluster_version VARCHAR(50),
    provider VARCHAR(50), -- 'aws', 'azure', 'gcp', 'on-premises', 'local'
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    kubeconfig_encrypted TEXT -- Encrypted kubeconfig for cluster access
);

CREATE TABLE IF NOT EXISTS k8s_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    node_name VARCHAR(255) NOT NULL,
    node_role VARCHAR(50), -- 'master', 'worker', 'control-plane'
    node_status VARCHAR(50) DEFAULT 'Unknown', -- 'Ready', 'NotReady', 'Unknown'
    cpu_capacity VARCHAR(20),
    memory_capacity VARCHAR(20),
    storage_capacity VARCHAR(20),
    os_image VARCHAR(255),
    kernel_version VARCHAR(100),
    container_runtime VARCHAR(100),
    kubelet_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    
    UNIQUE(cluster_id, node_name)
);

CREATE TABLE IF NOT EXISTS k8s_namespaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    namespace_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Terminating'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    
    UNIQUE(cluster_id, namespace_name)
);

CREATE TABLE IF NOT EXISTS k8s_workloads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    namespace_id UUID NOT NULL REFERENCES k8s_namespaces(id) ON DELETE CASCADE,
    workload_name VARCHAR(255) NOT NULL,
    workload_type VARCHAR(50) NOT NULL, -- 'Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'
    replicas_desired INTEGER DEFAULT 0,
    replicas_ready INTEGER DEFAULT 0,
    replicas_available INTEGER DEFAULT 0,
    image_names TEXT[], -- Array of container images
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    spec JSONB DEFAULT '{}', -- Full workload specification
    status JSONB DEFAULT '{}', -- Current status
    
    UNIQUE(cluster_id, namespace_id, workload_name, workload_type)
);

CREATE TABLE IF NOT EXISTS k8s_pods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    namespace_id UUID NOT NULL REFERENCES k8s_namespaces(id) ON DELETE CASCADE,
    workload_id UUID REFERENCES k8s_workloads(id) ON DELETE CASCADE,
    pod_name VARCHAR(255) NOT NULL,
    pod_ip INET,
    node_name VARCHAR(255),
    phase VARCHAR(50), -- 'Pending', 'Running', 'Succeeded', 'Failed', 'Unknown'
    restart_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    containers JSONB DEFAULT '[]', -- Container statuses
    
    UNIQUE(cluster_id, namespace_id, pod_name)
);

CREATE TABLE IF NOT EXISTS k8s_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    namespace_id UUID NOT NULL REFERENCES k8s_namespaces(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(50), -- 'ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'
    cluster_ip INET,
    external_ips INET[],
    ports JSONB DEFAULT '[]', -- Service ports
    selector JSONB DEFAULT '{}', -- Pod selector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    
    UNIQUE(cluster_id, namespace_id, service_name)
);

CREATE TABLE IF NOT EXISTS k8s_resource_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'node', 'pod', 'container'
    resource_name VARCHAR(255) NOT NULL,
    namespace_name VARCHAR(255),
    metric_name VARCHAR(100) NOT NULL, -- 'cpu_usage', 'memory_usage', 'disk_usage'
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS k8s_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    namespace_id UUID REFERENCES k8s_namespaces(id) ON DELETE CASCADE,
    event_type VARCHAR(50), -- 'Normal', 'Warning'
    reason VARCHAR(255),
    message TEXT,
    involved_object_kind VARCHAR(100),
    involved_object_name VARCHAR(255),
    involved_object_namespace VARCHAR(255),
    source_component VARCHAR(255),
    source_host VARCHAR(255),
    first_timestamp TIMESTAMP WITH TIME ZONE,
    last_timestamp TIMESTAMP WITH TIME ZONE,
    event_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Platform Database Config & Seeds
-- =============================================================================

INSERT INTO platform_configs (key, value, description) VALUES
('max_tenants', '1000', 'Maximum number of tenants allowed'),
('default_storage_limit_gb', '1', 'Default storage limit for new tenants (GB)'),
('default_api_calls_per_month', '1000', 'Default API calls limit for new tenants'),
('supported_storage_providers', '["azure_blob", "aws_s3", "gcs", "minio", "nfs"]', 'List of supported storage providers'),
('supported_image_formats', '["jpg", "jpeg", "png", "gif", "bmp", "webp"]', 'Supported image formats'),
('tenant_provisioning_enabled', 'true', 'Whether new tenant provisioning is enabled'),
('backup_retention_days', '30', 'Number of days to retain database backups')
ON CONFLICT (key) DO NOTHING;
