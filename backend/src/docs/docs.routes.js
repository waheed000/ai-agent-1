/**
 * API documentation routes — served at /api/v1/docs
 *
 * GET /api/v1/docs        — Swagger UI
 * GET /api/v1/docs/json   — Raw OpenAPI 3.0 JSON spec
 */

import { Router }    from 'express';
import swaggerUi     from 'swagger-ui-express';
import spec          from './openapi.js';

const router = Router();

// Raw JSON spec — useful for code-generation tools (openapi-generator, etc.)
router.get('/json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

// Swagger UI — interactive browser UI
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'CreatorOS AI API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: false,
    },
  }),
);

export default router;
