-- DeepLens PostgreSQL Database Initialization
-- This script creates the required databases and users for the DeepLens system

-- =============================================================================
-- Create Databases
-- =============================================================================

-- NextGen Identity Database (Duende IdentityServer)
CREATE DATABASE nextgen_identity;

-- Platform Management Database (Tenant management, configurations)
CREATE DATABASE deeplens_platform;

-- Template Database for Tenant Metadata (used for creating tenant-specific databases)
CREATE DATABASE tenant_metadata_template;

-- =============================================================================
-- Create Application Users
-- =============================================================================

-- NextGen Identity Service User
CREATE USER nextgen_identity_service WITH PASSWORD 'DeepLens123!';
GRANT ALL PRIVILEGES ON DATABASE nextgen_identity TO nextgen_identity_service;

-- Platform Service User (manages tenants, configurations)
CREATE USER platform_service WITH PASSWORD 'DeepLens123!';
GRANT ALL PRIVILEGES ON DATABASE deeplens_platform TO platform_service;

-- Tenant Service User (creates and manages tenant databases)
CREATE USER tenant_service WITH PASSWORD 'DeepLens123!' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE tenant_metadata_template TO tenant_service;

-- Analytics User (read-only access for reporting and BI tools)
CREATE USER analytics_readonly WITH PASSWORD 'DeepLens123!';
GRANT CONNECT ON DATABASE deeplens_platform TO analytics_readonly;

-- =============================================================================
-- Database-specific Configurations
-- =============================================================================

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

-- =============================================================================
-- Infisical Secret Management Integration
-- =============================================================================

-- Moved to after tenants table

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

-- =============================================================================
-- Moved Tables (Infisical & Monitoring)
-- =============================================================================

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

-- Infisical Secret Registry (for audit and tracking)
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

-- =============================================================================
-- Monitoring and Analytics Tables
-- =============================================================================

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

-- =============================================================================
-- Kubernetes Infrastructure Metadata
-- =============================================================================

-- Kubernetes Clusters Registry
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

-- Kubernetes Nodes
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

-- Kubernetes Namespaces
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

-- Kubernetes Workloads (Deployments, StatefulSets, DaemonSets)
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

-- Kubernetes Pods
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

-- Kubernetes Services
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

-- Kubernetes Resource Usage Metrics
CREATE TABLE IF NOT EXISTS k8s_resource_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'node', 'pod', 'container'
    resource_name VARCHAR(255) NOT NULL,
    namespace_name VARCHAR(255),
    metric_name VARCHAR(100) NOT NULL, -- 'cpu_usage', 'memory_usage', 'disk_usage', 'network_rx', 'network_tx'
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20), -- 'cores', 'bytes', 'bytes/sec'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Kubernetes Events
CREATE TABLE IF NOT EXISTS k8s_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
    namespace_id UUID REFERENCES k8s_namespaces(id) ON DELETE CASCADE,
    event_type VARCHAR(50), -- 'Normal', 'Warning'
    reason VARCHAR(255),
    message TEXT,
    involved_object_kind VARCHAR(100), -- 'Pod', 'Deployment', 'Service', etc.
    involved_object_name VARCHAR(255),
    involved_object_namespace VARCHAR(255),
    source_component VARCHAR(255),
    source_host VARCHAR(255),
    first_timestamp TIMESTAMP WITH TIME ZONE,
    last_timestamp TIMESTAMP WITH TIME ZONE,
    event_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

\c tenant_metadata_template;

-- Enable required extensions for tenant databases
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- =============================================================================
-- Tenant Metadata Database Template (copied for each new tenant)
-- =============================================================================

-- Image Collections (Tenant-Specific)
CREATE TABLE IF NOT EXISTS image_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Always filter by tenant
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE,
    total_images INTEGER DEFAULT 0,
    metadata JSONB,
    
    CONSTRAINT unique_tenant_collection_name UNIQUE(tenant_id, name),
    CONSTRAINT unique_collection_tenant UNIQUE(id, tenant_id)
);

-- Media table moved to 03

-- Search Sessions (Tenant-Specific Analytics)
CREATE TABLE IF NOT EXISTS search_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Always filter by tenant
    user_id UUID,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_searches INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    
    UNIQUE(id, tenant_id)
);

-- Search Queries (Tenant-Specific Analytics and Improvements)
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Always filter by tenant
    session_id UUID REFERENCES search_sessions(id),
    query_type VARCHAR(50) NOT NULL, -- 'image', 'text', 'hybrid'
    query_vector_id VARCHAR(255), -- Reference to uploaded image vector
    query_text TEXT,
    collection_id UUID REFERENCES image_collections(id),
    results_count INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    similarity_threshold FLOAT DEFAULT 0.8,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    
    -- Ensure tenant consistency via Composite Foreign Keys
    CONSTRAINT fk_session_tenant_consistency FOREIGN KEY (session_id, tenant_id)
        REFERENCES search_sessions(id, tenant_id),
    CONSTRAINT fk_collection_tenant_consistency FOREIGN KEY (collection_id, tenant_id)
        REFERENCES image_collections(id, tenant_id)
);

-- User Preferences (Tenant-Specific)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Always filter by tenant
    user_id UUID NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id, preference_key)
);

-- Tenant Usage Statistics
CREATE TABLE IF NOT EXISTS usage_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Always filter by tenant
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    
    UNIQUE(tenant_id, metric_name, recorded_at)
);

-- =============================================================================
-- Indexes for Performance (Tenant Template)
-- =============================================================================

-- Image Collections Indexes
CREATE INDEX IF NOT EXISTS idx_image_collections_tenant_id ON image_collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_image_collections_created_by ON image_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_image_collections_created_at ON image_collections(created_at);

-- Media indexes moved to 03


-- Search Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_search_sessions_tenant_id ON search_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_user_id ON search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_start_time ON search_sessions(session_start);

-- Search Queries Indexes
CREATE INDEX IF NOT EXISTS idx_search_queries_tenant_id ON search_queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_session_id ON search_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_collection_id ON search_queries(collection_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON search_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_queries_type ON search_queries(query_type);

-- User Preferences Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_user ON user_preferences(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

-- Usage Statistics Indexes
CREATE INDEX IF NOT EXISTS idx_usage_statistics_tenant_id ON usage_statistics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_statistics_metric ON usage_statistics(metric_name);
CREATE INDEX IF NOT EXISTS idx_usage_statistics_recorded_at ON usage_statistics(recorded_at);

-- Composite Indexes for Common Queries

CREATE INDEX IF NOT EXISTS idx_search_queries_tenant_type_time ON search_queries(tenant_id, query_type, timestamp);

-- =============================================================================
-- Row Level Security (RLS) Setup
-- =============================================================================

-- Enable RLS on all tenant tables
ALTER TABLE image_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_statistics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (to be customized per tenant)
-- Note: These are template policies that will be adjusted during tenant provisioning

-- Default deny-all policy (will be overridden by tenant-specific policies)
CREATE POLICY tenant_isolation_policy ON image_collections 
    FOR ALL TO tenant_service 
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);



CREATE POLICY tenant_isolation_policy ON search_sessions 
    FOR ALL TO tenant_service 
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON search_queries 
    FOR ALL TO tenant_service 
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON user_preferences 
    FOR ALL TO tenant_service 
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON usage_statistics 
    FOR ALL TO tenant_service 
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

\c deeplens_platform;

-- =============================================================================
-- Platform Database Indexes
-- =============================================================================

-- Tenants Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_type ON tenants(plan_type);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);

-- Tenant Storage Configs Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_storage_configs_tenant_id ON tenant_storage_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_storage_configs_provider ON tenant_storage_configs(provider);
CREATE INDEX IF NOT EXISTS idx_tenant_storage_configs_active ON tenant_storage_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_storage_configs_test_status ON tenant_storage_configs(test_status);

-- Tenant Databases Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_databases_tenant_id ON tenant_databases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_type ON tenant_databases(database_type);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_active ON tenant_databases(is_active);

-- Platform Configs Indexes
CREATE INDEX IF NOT EXISTS idx_platform_configs_updated_at ON platform_configs(updated_at);

-- API Usage Logs Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_tenant_id ON api_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);

-- Composite Indexes for Common Platform Queries
CREATE INDEX IF NOT EXISTS idx_api_usage_tenant_timestamp ON api_usage_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_tenant_storage_tenant_active ON tenant_storage_configs(tenant_id, is_active);

-- =============================================================================
-- Kubernetes Infrastructure Indexes
-- =============================================================================

-- Cluster Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_clusters_name ON k8s_clusters(name);
CREATE INDEX IF NOT EXISTS idx_k8s_clusters_provider ON k8s_clusters(provider);
CREATE INDEX IF NOT EXISTS idx_k8s_clusters_active ON k8s_clusters(is_active);
CREATE INDEX IF NOT EXISTS idx_k8s_clusters_last_sync ON k8s_clusters(last_sync);

-- Node Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_cluster_id ON k8s_nodes(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_name ON k8s_nodes(node_name);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_status ON k8s_nodes(node_status);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_role ON k8s_nodes(node_role);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_heartbeat ON k8s_nodes(last_heartbeat);

-- Namespace Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_namespaces_cluster_id ON k8s_namespaces(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_namespaces_name ON k8s_namespaces(namespace_name);
CREATE INDEX IF NOT EXISTS idx_k8s_namespaces_status ON k8s_namespaces(status);

-- Workload Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_workloads_cluster_id ON k8s_workloads(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_workloads_namespace_id ON k8s_workloads(namespace_id);
CREATE INDEX IF NOT EXISTS idx_k8s_workloads_type ON k8s_workloads(workload_type);
CREATE INDEX IF NOT EXISTS idx_k8s_workloads_name ON k8s_workloads(workload_name);
CREATE INDEX IF NOT EXISTS idx_k8s_workloads_last_sync ON k8s_workloads(last_sync);

-- Pod Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_pods_cluster_id ON k8s_pods(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_pods_namespace_id ON k8s_pods(namespace_id);
CREATE INDEX IF NOT EXISTS idx_k8s_pods_workload_id ON k8s_pods(workload_id);
CREATE INDEX IF NOT EXISTS idx_k8s_pods_node_name ON k8s_pods(node_name);
CREATE INDEX IF NOT EXISTS idx_k8s_pods_phase ON k8s_pods(phase);
CREATE INDEX IF NOT EXISTS idx_k8s_pods_name ON k8s_pods(pod_name);

-- Service Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_services_cluster_id ON k8s_services(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_services_namespace_id ON k8s_services(namespace_id);
CREATE INDEX IF NOT EXISTS idx_k8s_services_name ON k8s_services(service_name);
CREATE INDEX IF NOT EXISTS idx_k8s_services_type ON k8s_services(service_type);

-- Resource Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_metrics_cluster_id ON k8s_resource_metrics(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_metrics_resource_type ON k8s_resource_metrics(resource_type);
CREATE INDEX IF NOT EXISTS idx_k8s_metrics_resource_name ON k8s_resource_metrics(resource_name);
CREATE INDEX IF NOT EXISTS idx_k8s_metrics_metric_name ON k8s_resource_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_k8s_metrics_recorded_at ON k8s_resource_metrics(recorded_at);

-- Event Indexes
CREATE INDEX IF NOT EXISTS idx_k8s_events_cluster_id ON k8s_events(cluster_id);
CREATE INDEX IF NOT EXISTS idx_k8s_events_namespace_id ON k8s_events(namespace_id);
CREATE INDEX IF NOT EXISTS idx_k8s_events_type ON k8s_events(event_type);
CREATE INDEX IF NOT EXISTS idx_k8s_events_reason ON k8s_events(reason);
CREATE INDEX IF NOT EXISTS idx_k8s_events_object_kind ON k8s_events(involved_object_kind);
CREATE INDEX IF NOT EXISTS idx_k8s_events_timestamps ON k8s_events(first_timestamp, last_timestamp);

-- Composite Indexes for Common Kubernetes Queries
CREATE INDEX IF NOT EXISTS idx_k8s_pods_cluster_namespace ON k8s_pods(cluster_id, namespace_id);
CREATE INDEX IF NOT EXISTS idx_k8s_workloads_cluster_namespace ON k8s_workloads(cluster_id, namespace_id);
CREATE INDEX IF NOT EXISTS idx_k8s_metrics_cluster_resource_time ON k8s_resource_metrics(cluster_id, resource_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_k8s_events_cluster_time ON k8s_events(cluster_id, first_timestamp);

-- =============================================================================
-- Infisical and Monitoring Indexes
-- =============================================================================

-- Infisical Projects Indexes
CREATE INDEX IF NOT EXISTS idx_infisical_projects_tenant_id ON infisical_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_infisical_projects_project_id ON infisical_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_infisical_projects_active ON infisical_projects(is_active);

-- Infisical Secrets Indexes
CREATE INDEX IF NOT EXISTS idx_infisical_secrets_project_id ON infisical_secrets(project_id);
CREATE INDEX IF NOT EXISTS idx_infisical_secrets_key ON infisical_secrets(secret_key);
CREATE INDEX IF NOT EXISTS idx_infisical_secrets_last_accessed ON infisical_secrets(last_accessed);

-- System Health Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_metric ON system_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded_at ON system_health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health_metrics(status);

-- Service Dependencies Indexes
CREATE INDEX IF NOT EXISTS idx_service_dependencies_service ON service_dependencies(service_name);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_dependency ON service_dependencies(dependency_name);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_status ON service_dependencies(status);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_critical ON service_dependencies(is_critical);

-- Tenant Performance Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_performance_tenant_id ON tenant_performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_performance_metric_type ON tenant_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_tenant_performance_recorded_at ON tenant_performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_tenant_performance_tenant_type_time ON tenant_performance_metrics(tenant_id, metric_type, recorded_at);

-- Moved to after tenants table

-- =============================================================================
-- Initial Platform Data
-- =============================================================================

-- Insert default platform configurations
INSERT INTO platform_configs (key, value, description) VALUES
('max_tenants', '1000', 'Maximum number of tenants allowed'),
('default_storage_limit_gb', '1', 'Default storage limit for new tenants (GB)'),
('default_api_calls_per_month', '1000', 'Default API calls limit for new tenants'),
('supported_storage_providers', '["azure_blob", "aws_s3", "gcs", "minio", "nfs"]', 'List of supported storage providers'),
('image_processing_enabled', 'true', 'Whether image processing is enabled globally'),
('vector_similarity_threshold', '0.8', 'Default similarity threshold for vector searches'),
('tenant_database_template', '"tenant_metadata_template"', 'Template database name for new tenants'),
('max_file_size_mb', '50', 'Maximum file size for image uploads (MB)'),
('supported_image_formats', '["jpg", "jpeg", "png", "gif", "bmp", "webp"]', 'Supported image formats'),
('tenant_provisioning_enabled', 'true', 'Whether new tenant provisioning is enabled'),
('redis_databases_per_tenant', '16', 'Number of Redis databases available for tenant allocation'),
('qdrant_default_vector_size', '2048', 'Default vector dimension for Qdrant collections (ResNet50)'),
('infisical_enabled', 'true', 'Whether Infisical secret management is enabled'),
('monitoring_enabled', 'true', 'Whether monitoring and observability stack is enabled'),
('kafka_enabled', 'true', 'Whether Kafka message queue is enabled'),
('kubernetes_integration_enabled', 'true', 'Whether Kubernetes metadata tracking is enabled'),
('backup_retention_days', '30', 'Number of days to retain database backups'),
('metrics_retention_days', '90', 'Number of days to retain performance metrics')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Database Statistics and Maintenance
-- =============================================================================

-- Enable automatic statistics collection
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;