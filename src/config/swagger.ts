import swaggerJSDoc from 'swagger-jsdoc';
import env from './env.js';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CrisisDesk API',
      version: '1.0.0',
      description: 'Intelligent emergency and service request triage API with Gemini fallback support',
    },
    servers: [
      {
        url: 'https://crisisdesk-ai-emqh.onrender.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js', './dist/src/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
