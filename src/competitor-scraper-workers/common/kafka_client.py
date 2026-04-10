import json
import logging
import os
import time
from kafka import KafkaConsumer, KafkaProducer
from typing import Callable, Any

logger = logging.getLogger(__name__)

class ScraperKafkaClient:
    def __init__(self, service_name: str):
        self.bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'deeplens-kafka:9092')
        self.service_name = service_name
        self.producer = None
        self.consumer = None

    def get_producer(self):
        if not self.producer:
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=self.bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8')
                )
                logger.info("Kafka producer initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Kafka producer: {e}")
                raise
        return self.producer

    def consume_loop(
        self, 
        topic: str, 
        group_id: str, 
        handler: Callable[[Any], None]
    ):
        """
        Continuous loop to consume messages from a topic and process them using the handler.
        """
        logger.info(f"Starting consumer loop for topic: {topic}, group: {group_id}")
        
        while True:
            try:
                self.consumer = KafkaConsumer(
                    topic,
                    bootstrap_servers=self.bootstrap_servers,
                    group_id=group_id,
                    auto_offset_reset='earliest',
                    enable_auto_commit=False,
                    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
                )
                
                logger.info(f"Connected to Kafka topic {topic}")
                
                for message in self.consumer:
                    try:
                        logger.info(f"Received message: {message.value}")
                        handler(message.value)
                        self.consumer.commit()
                        logger.info("Message processed and committed")
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        # In a real scenario, we might want to dead-letter this
                        # For now, we log and continue (or retry depending on policy)
                        
            except Exception as e:
                logger.error(f"Kafka connection error: {e}")
                logger.info("Retrying in 5 seconds...")
                time.sleep(5)

    def publish(self, topic: str, data: dict):
        producer = self.get_producer()
        try:
            future = producer.send(topic, data)
            future.get(timeout=10) # Wait for confirm
            logger.info(f"Published to {topic}: {data}")
        except Exception as e:
            logger.error(f"Failed to publish to {topic}: {e}")
            raise
