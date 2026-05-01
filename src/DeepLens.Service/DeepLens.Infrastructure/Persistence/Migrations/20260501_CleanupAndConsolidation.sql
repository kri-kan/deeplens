-- 1. DROP OBSOLETE INFRASTRUCTURE TABLES
DROP TABLE IF EXISTS k8s_resource_metrics;
DROP TABLE IF EXISTS k8s_pods;
DROP TABLE IF EXISTS k8s_workloads;
DROP TABLE IF EXISTS k8s_services;
DROP TABLE IF EXISTS k8s_nodes;
DROP TABLE IF EXISTS k8s_namespaces;
DROP TABLE IF EXISTS k8s_events;
DROP TABLE IF EXISTS k8s_clusters;

-- 2. DROP HEALTH & SEARCH MONITORING
DROP TABLE IF EXISTS system_health_metrics;
DROP TABLE IF EXISTS service_dependencies;
DROP TABLE IF EXISTS search_queries;
DROP TABLE IF EXISTS search_sessions;

-- 3. DROP UNUSED CONTENT
DROP TABLE IF EXISTS image_collections;

-- 4. CONSOLIDATE SELLERS INTO VENDORS
-- Add necessary columns to vendors if they don't exist
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;

-- Rename seller_listings to vendor_listings
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seller_listings') THEN
        ALTER TABLE seller_listings RENAME TO vendor_listings;
        ALTER TABLE vendor_listings RENAME COLUMN seller_id TO vendor_id;
    END IF;
END $$;

-- Drop sellers table (listings now point to vendors)
DROP TABLE IF EXISTS sellers CASCADE;
