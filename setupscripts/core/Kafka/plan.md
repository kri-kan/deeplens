[ Linux Server PC (Intranet IP: 192.168.1.50) ]
│
├── [ Docker Engine ]
│ │
│ ├── [ Service: KAFKA-PROD ] ──────────── (Port 9092) ──>> Intranet Prod Apps
│ │ │ • Connection URL (Intranet): 192.168.1.50:9092
│ │ │ • Connection URL (Local): localhost:29092
│ │ │ • Heap: 4GB
│ │ │ • Data: /data/kafka
│ │ │ • Retention: 7 days
│ │
│ ├── [ Service: KAFKA-TEST ] ──────────── (Port 9094) ──>> Intranet Test Apps
│ │ │ • Connection URL (Intranet): 192.168.1.50:9094
│ │ │ • Connection URL (Local): localhost:29096
│ │ │ • Heap: 1GB
│ │ │ • Data: /home/krikan/data/test/kafka
│ │ │ • Retention: 24 hours
│ │
│ └── [ Service: KAFKA-UI ] ────────────── (Port 8080) ──>> Admin Dashboard
│ • Dashboard URL: http://192.168.1.50:8080 (or http://localhost:8080)

## Connection Details Summary

| Environment    | Access From     | Bootstrap Server URL       |
| :------------- | :-------------- | :------------------------- |
| **Production** | Other PCs (LAN) | `192.168.1.50:9092`        |
| **Production** | This Server     | `localhost:29092`          |
| **Test**       | Other PCs (LAN) | `192.168.1.50:9094`        |
| **Test**       | This Server     | `localhost:29096`          |
| **Kafka UI**   | Any PC (LAN)    | `http://192.168.1.50:8080` |

## Docker Run Equivalent Commands

Because `docker-compose` automatically creates a network that allows containers to discover each other via their container names (like `kafka-prod` and `kafka-test`), you'll need to create a custom Docker network first to mimic that behavior when using `docker run`.

### 1. Create a Network
```bash
docker network create kafka-net
```

### 2. Run `kafka-prod`
```bash
docker run -d \
  --name kafka-prod \
  --network kafka-net \
  --restart always \
  -p 9092:9092 \
  -p 29092:29092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=controller,broker \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS="1@kafka-prod:9093" \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_KRAFT_CLUSTER_ID=prod-cluster-id-12345 \
  -e KAFKA_LISTENERS="LOCAL://:29092,INTRANET://:9092,CONTROLLER://:9093" \
  -e KAFKA_ADVERTISED_LISTENERS="LOCAL://localhost:29092,INTRANET://192.168.1.50:9092" \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP="CONTROLLER:PLAINTEXT,LOCAL:PLAINTEXT,INTRANET:PLAINTEXT" \
  -e KAFKA_INTER_BROKER_LISTENER_NAME=LOCAL \
  -e KAFKA_HEAP_OPTS="-Xmx4G -Xms4G" \
  -e KAFKA_LOG_RETENTION_HOURS=168 \
  -e KAFKA_NUM_PARTITIONS=3 \
  -e KAFKA_AUTO_CREATE_TOPICS_ENABLE=false \
  -v /data/kafka:/var/lib/kafka/data \
  --health-cmd="/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:29092" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --log-driver="json-file" \
  --log-opt max-size="10m" \
  --log-opt max-file="3" \
  apache/kafka:latest
```

### 3. Run `kafka-test`
```bash
docker run -d \
  --name kafka-test \
  --network kafka-net \
  --restart always \
  -p 9094:9094 \
  -p 29096:29096 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=controller,broker \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS="1@kafka-test:9095" \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_KRAFT_CLUSTER_ID=test-cluster-id-67890 \
  -e KAFKA_LISTENERS="LOCAL://:29096,INTRANET://:9094,CONTROLLER://:9095" \
  -e KAFKA_ADVERTISED_LISTENERS="LOCAL://localhost:29096,INTRANET://192.168.1.50:9094" \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP="CONTROLLER:PLAINTEXT,LOCAL:PLAINTEXT,INTRANET:PLAINTEXT" \
  -e KAFKA_INTER_BROKER_LISTENER_NAME=LOCAL \
  -e KAFKA_HEAP_OPTS="-Xmx1G -Xms1G" \
  -e KAFKA_LOG_RETENTION_HOURS=24 \
  -e KAFKA_AUTO_CREATE_TOPICS_ENABLE=true \
  -v /home/krikan/data/test/kafka:/var/lib/kafka/data \
  --health-cmd="/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:29096" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --log-driver="json-file" \
  --log-opt max-size="10m" \
  --log-opt max-file="3" \
  apache/kafka:latest
```

### 4. Run `kafka-ui`
Wait about 10-30 seconds or verify that both broker containers are healthy before running this, because `docker run` does not have a direct equivalent for `docker-compose` `depends_on: condition: service_healthy` flag:
```bash
docker run -d \
  --name kafka-ui \
  --network kafka-net \
  --restart always \
  -p 8080:8080 \
  -e KAFKA_CLUSTERS_0_NAME=Production \
  -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS="kafka-prod:29092" \
  -e KAFKA_CLUSTERS_1_NAME=Test \
  -e KAFKA_CLUSTERS_1_BOOTSTRAPSERVERS="kafka-test:29096" \
  provectuslabs/kafka-ui:latest
```
