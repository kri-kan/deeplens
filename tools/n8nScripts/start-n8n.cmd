@echo off

rem Listen on all IPv4/IPv6
set N8N_HOST=2406:b400:d5:102e:7f6b:7b0c:231b:e0ed
set N8N_LISTEN_ADDRESS=::
set N8N_PORT=5678
set N8N_PROTOCOL = "http"
rem Keep base URLs simple; do NOT hardcode IPv6 yet

set N8N_EDITOR_BASE_URL=http://192.168.0.185:5678
set WEBHOOK_URL=2406:b400:d5:102e:7f6b:7b0c:231b:e0ed

set N8N_USER_FOLDER=C:\productivity\deeplens\tools\n8n-data
@REM set N8N_ENCRYPTION_KEY=3f1e9a2b7c4d5e6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f
set N8N_SECURE_COOKIE=false
npx n8n
