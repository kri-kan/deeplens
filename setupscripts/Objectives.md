# Server Setup Checklist

- [ ] Kafka service & UI
- [x] Postgres server (`krikanpg`)
- [x] Ollama service (`ollama-gpu`)
- [ ] Redis (Caching/SignalR)
- [ ] MinIO (Object Storage)
- [ ] Qdrant (Vector DB)
- [ ] InfluxDB (TSDB)
- [ ] Observability: Grafana
- [ ] Observability: Prometheus
- [ ] Observability: Loki
- [ ] Observability: Jaeger
- [ ] Observability: OTel Collector

## Notes

- Use the `kafka/` folder for Kafka-related configuration and deployment.
- Use `server/basicSetup.md` for general server setup steps.
- Use `postgres/` for PostgreSQL and `ollama/` for Ollama services.
- Adhere to the standards defined in `DESIGN.md` for all future service creation.
