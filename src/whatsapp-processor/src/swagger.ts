// Add Swagger UI and OpenAPI support for Express
// This file is created for Swagger setup in whatsapp-processor

// Add type declarations for missing modules
// @ts-ignore
import swaggerUi from 'swagger-ui-express';
// @ts-ignore
import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'WhatsApp Processor API',
    version: '1.0.0',
    description: 'API documentation for WhatsApp Processor',
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts'], // Adjust path as needed
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
