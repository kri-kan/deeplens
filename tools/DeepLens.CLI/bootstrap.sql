\c nextgen_identity

-- 1. Create Demo Tenant (Vayyari)
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('2abbd721-873e-4bf0-9cb2-c93c6894c584', 'Vayyari', 'vayyari', 'tenant_vayyari_metadata', 'deeplens-qdrant', 6333, 6334, 'http://localhost:9000', 'vayyari', 1, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Create Platform Admin Tenant
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('cf123992-628d-4eb4-9721-aef8c59275a5', 'DeepLens Administration', 'admin', 'nextgen_identity', 'deeplens-qdrant', 6333, 6334, 'http://localhost:9000', 'platform-admin', 1, 3, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create Admin Users
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, created_at)
VALUES 
('9d1645f7-c93d-4c31-97f2-aed8c56275a5', 'cf123992-628d-4eb4-9721-aef8c59275a5', 'admin@deeplens.local', '$2a$11$PUxn0wRtROrboSbM3p2i.eGLYjSIy9bamoUD6gnhFfh/rSiwpu82.', 'System', 'Admin', 2, true, NOW()),
('798f62b3-2828-45f0-8ba4-6dd94c1787ff', '2abbd721-873e-4bf0-9cb2-c93c6894c584', 'admin@vayyari.local', '$2a$11$PUxn0wRtROrboSbM3p2i.eGLYjSIy9bamoUD6gnhFfh/rSiwpu82.', 'Vayyari', 'Admin', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;


