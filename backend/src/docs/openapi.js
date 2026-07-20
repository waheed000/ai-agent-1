/**
 * OpenAPI 3.0 specification for the CreatorOS AI backend.
 *
 * Served at GET /api/v1/docs  (Swagger UI)
 * Served at GET /api/v1/docs/json  (raw JSON)
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'CreatorOS AI API',
    version: '1.0.0',
    description: `
## CreatorOS AI — Creator Intelligence Platform

A production-grade REST API that powers the CreatorOS dashboard.

### Authentication
Most endpoints require a **Bearer token** obtained via \`POST /auth/login\`.
Include it as:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`
Access tokens expire in 15 minutes. Use \`POST /auth/refresh-token\` with
your refresh token (stored in an \`httpOnly\` cookie) to obtain a new pair.

### Rate limits
| Scope | Window | Max requests |
|-------|--------|-------------|
| General | 15 min | 100 |
| Auth endpoints | 15 min | 10 |
| AI endpoints | 1 min | 20 |

### Response format
All responses follow a consistent envelope:
\`\`\`json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "code": "ERROR_CODE", "errors": [...] }
\`\`\`

### Request tracing
Every response includes \`X-Request-ID\` and \`X-Correlation-ID\` headers
for end-to-end tracing.
    `.trim(),
    contact: { name: 'CreatorOS Engineering', email: 'engineering@creatorosai.com' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: '/api/v1', description: 'Current environment' },
    { url: 'http://localhost:3000/api/v1', description: 'Local development' },
  ],
  tags: [
    { name: 'Health',        description: 'Service health and readiness probes' },
    { name: 'Auth',          description: 'Authentication — register, login, token refresh, logout' },
    { name: 'Account',       description: 'Session management and account settings' },
    { name: 'Profile',       description: 'User profile updates and password management' },
    { name: 'Integrations',  description: 'Connected social accounts' },
    { name: 'Platforms',     description: 'Platform sync and status' },
    { name: 'Jobs',          description: 'Background job management' },
    { name: 'Analytics',     description: 'Creator performance analytics' },
    { name: 'Competitors',   description: 'Competitor tracking and analysis' },
    { name: 'Trends',        description: 'Platform trend discovery' },
    { name: 'Reports',       description: 'AI-generated performance reports' },
    { name: 'Strategy',      description: 'AI growth strategy generation' },
    { name: 'Notifications', description: 'In-app notifications' },
    { name: 'Planner',       description: 'AI content planner' },
    { name: 'Calendar',      description: 'Content calendar view' },
    { name: 'Drafts',        description: 'Draft content management' },
    { name: 'Workspaces',    description: 'Team workspaces and member management' },
    { name: 'API Keys',      description: 'Programmatic access keys' },
    { name: 'Search',        description: 'Cross-resource full-text search' },
    { name: 'Settings',      description: 'User and application settings' },
    { name: 'Usage',         description: 'AI feature usage tracking' },
    { name: 'Audit',         description: 'Immutable audit log' },
    { name: 'Features',      description: 'Feature flag management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token obtained from POST /auth/login',
      },
    },
    schemas: {
      // ── Shared response envelopes ──────────────────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data:    { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Human-readable error description' },
          code:    { type: 'string', example: 'VALIDATION_ERROR' },
          errors:  {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field:   { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Must be a valid email address' },
              },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total:   { type: 'integer', example: 42 },
          page:    { type: 'integer', example: 1 },
          limit:   { type: 'integer', example: 20 },
          pages:   { type: 'integer', example: 3 },
          hasNext: { type: 'boolean', example: true },
          hasPrev: { type: 'boolean', example: false },
        },
      },
      // ── Domain objects ─────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          _id:              { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          name:             { type: 'string', example: 'Alex Rivera' },
          email:            { type: 'string', format: 'email', example: 'alex@example.com' },
          role:             { type: 'string', enum: ['user', 'admin', 'superadmin'], example: 'user' },
          subscriptionPlan: { type: 'string', enum: ['free', 'pro', 'enterprise'], example: 'pro' },
          avatar:           { type: 'string', format: 'uri', nullable: true },
          timezone:         { type: 'string', example: 'America/New_York' },
          createdAt:        { type: 'string', format: 'date-time' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken:  { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          expiresIn:    { type: 'string', example: '15m' },
          tokenType:    { type: 'string', example: 'Bearer' },
        },
        description: 'Refresh token is returned as an httpOnly cookie.',
      },
      Session: {
        type: 'object',
        properties: {
          _id:        { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          userAgent:  { type: 'string', example: 'Mozilla/5.0 (Macintosh; ...) Chrome/120' },
          ip:         { type: 'string', example: '203.0.113.42' },
          createdAt:  { type: 'string', format: 'date-time' },
          lastUsed:   { type: 'string', format: 'date-time' },
          isCurrent:  { type: 'boolean', example: true },
        },
      },
      ConnectedAccount: {
        type: 'object',
        properties: {
          platform:    { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'], example: 'instagram' },
          username:    { type: 'string', example: '@alexrivera' },
          displayName: { type: 'string', example: 'Alex Rivera' },
          avatarUrl:   { type: 'string', format: 'uri', nullable: true },
          connectedAt: { type: 'string', format: 'date-time' },
          status:      { type: 'string', enum: ['active', 'expired', 'error'], example: 'active' },
        },
      },
      AnalyticsOverview: {
        type: 'object',
        properties: {
          totalFollowers:     { type: 'integer', example: 124500 },
          followerGrowth:     { type: 'number',  example: 3.4, description: 'Percentage change' },
          avgEngagementRate:  { type: 'number',  example: 4.7 },
          totalPosts:         { type: 'integer', example: 312 },
          totalReach:         { type: 'integer', example: 890000 },
          topPlatform:        { type: 'string',  example: 'instagram' },
        },
      },
      Report: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          type:      { type: 'string', enum: ['weekly', 'monthly', 'custom'], example: 'weekly' },
          title:     { type: 'string', example: 'Weekly Performance Report — Jul 14–20 2026' },
          summary:   { type: 'string', example: 'Strong growth week with 12% follower increase...' },
          insights:  { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Strategy: {
        type: 'object',
        properties: {
          _id:         { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          goal:        { type: 'string', example: 'Grow YouTube channel to 100k subscribers in 6 months' },
          plan:        { type: 'string', example: 'Focus on short-form content, post 3x per week...' },
          tactics:     { type: 'array', items: { type: 'string' } },
          platforms:   { type: 'array', items: { type: 'string' } },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      Competitor: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          username:  { type: 'string', example: '@competitorhandle' },
          platform:  { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'], example: 'instagram' },
          status:    { type: 'string', enum: ['active', 'pending', 'error'], example: 'active' },
          lastSynced:{ type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Trend: {
        type: 'object',
        properties: {
          topic:     { type: 'string', example: 'AI content creation' },
          platform:  { type: 'string', example: 'instagram' },
          volume:    { type: 'integer', example: 450000 },
          growth:    { type: 'number',  example: 23.5, description: 'Percentage growth' },
          category:  { type: 'string', example: 'technology' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ContentPlan: {
        type: 'object',
        properties: {
          _id:           { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          title:         { type: 'string', example: 'AI Productivity Tips — Reel' },
          description:   { type: 'string', example: 'Short-form reel covering 5 AI tools...' },
          platform:      { type: 'string', example: 'instagram' },
          suggestedTime: { type: 'string', format: 'date-time' },
          status:        { type: 'string', enum: ['planned', 'drafted', 'published', 'cancelled'], example: 'planned' },
          priority:      { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
        },
      },
      Draft: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          title:     { type: 'string', example: 'Draft: AI Productivity Tips' },
          content:   { type: 'string', example: 'Here are 5 AI tools that changed how I create...' },
          platform:  { type: 'string', example: 'instagram' },
          status:    { type: 'string', enum: ['draft', 'ready', 'scheduled'], example: 'draft' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Workspace: {
        type: 'object',
        properties: {
          _id:  { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          name: { type: 'string', example: 'Acme Media Team' },
          slug: { type: 'string', example: 'acme-media-team' },
          plan: { type: 'string', enum: ['free', 'pro', 'enterprise'], example: 'pro' },
          owner: { $ref: '#/components/schemas/User' },
          memberCount: { type: 'integer', example: 5 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkspaceMember: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          role: { type: 'string', enum: ['owner', 'admin', 'editor', 'viewer'], example: 'editor' },
          joinedAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          name:      { type: 'string', example: 'CI Pipeline Key' },
          prefix:    { type: 'string', example: 'cos_live_abc123' },
          scopes:    { type: 'array', items: { type: 'string' }, example: ['analytics:read', 'reports:read'] },
          lastUsed:  { type: 'string', format: 'date-time', nullable: true },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
        description: 'The full key value is returned ONLY on creation and never again.',
      },
      Notification: {
        type: 'object',
        properties: {
          _id:     { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          type:    { type: 'string', example: 'report_ready' },
          title:   { type: 'string', example: 'Your weekly report is ready' },
          body:    { type: 'string', example: 'View your performance summary for Jul 14–20.' },
          read:    { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '64f9a2b3c1d2e3f4a5b6c7d8' },
          action:    { type: 'string', example: 'workspace.member.invited' },
          actor:     { $ref: '#/components/schemas/User' },
          target:    { type: 'object', description: 'The resource that was affected' },
          metadata:  { type: 'object', description: 'Additional context about the event' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      FeatureFlag: {
        type: 'object',
        properties: {
          key:         { type: 'string', example: 'ai_strategy_v2' },
          enabled:     { type: 'boolean', example: true },
          description: { type: 'string', example: 'Enable the v2 AI strategy generator' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status:      { type: 'string', enum: ['ok', 'degraded', 'down'], example: 'ok' },
          database:    { type: 'string', example: 'connected' },
          environment: { type: 'string', example: 'production' },
          uptime:      { type: 'number', example: 86400.5, description: 'Process uptime in seconds' },
          timestamp:   { type: 'string', format: 'date-time' },
          version:     { type: 'string', example: '1.0.0' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid access token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Access token is required', code: 'AUTHENTICATION_ERROR' },
          },
        },
      },
      Forbidden: {
        description: 'Authenticated but not authorized for this action',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Insufficient permissions', code: 'AUTHORIZATION_ERROR' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Resource not found', code: 'NOT_FOUND' },
          },
        },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              errors: [{ field: 'email', message: 'Must be a valid email address' }],
            },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
          },
        },
      },
      InternalError: {
        description: 'Unexpected server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' },
          },
        },
      },
    },
    parameters: {
      platformParam: {
        name: 'platform',
        in: 'path',
        required: true,
        schema: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'] },
        example: 'instagram',
      },
      pageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number (1-based)',
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Results per page',
      },
      analyticsDateFrom: {
        name: 'dateFrom',
        in: 'query',
        schema: { type: 'string', format: 'date' },
        description: 'Start date (YYYY-MM-DD). Defaults to 30 days ago.',
        example: '2026-06-20',
      },
      analyticsDateTo: {
        name: 'dateTo',
        in: 'query',
        schema: { type: 'string', format: 'date' },
        description: 'End date (YYYY-MM-DD). Defaults to today.',
        example: '2026-07-20',
      },
      analyticsPlatform: {
        name: 'platform',
        in: 'query',
        schema: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x', 'all'] },
        description: 'Filter results to a specific platform. Omit for aggregated data.',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'General health check',
        description: 'Returns database connection status, process uptime, and server version. No authentication required.',
        security: [],
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/HealthStatus' } } },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Kubernetes/container liveness probe. Returns 200 if the process is running. Never checks external dependencies.',
        security: [],
        responses: {
          200: {
            description: 'Process is alive',
            content: {
              'application/json': {
                example: { success: true, data: { status: 'alive', pid: 1, uptimeSec: 3600 } },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Readiness probe. Returns 200 when the server is ready to serve traffic (database connected). Returns 503 if the database is unavailable.',
        security: [],
        responses: {
          200: { description: 'Server is ready for traffic' },
          503: { description: 'Server is not ready (database unavailable)' },
        },
      },
    },
    '/health/dependencies': {
      get: {
        tags: ['Health'],
        summary: 'Dependency health report',
        description: 'Full dependency report with latency measurements for MongoDB, Redis, and all queues.',
        security: [],
        responses: {
          200: {
            description: 'Dependency status report',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    database: { status: 'connected', latencyMs: 2 },
                    redis:    { status: 'connected' },
                    queues:   { analytics: { waiting: 0, active: 1, failed: 0 } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Internal metrics snapshot',
        description: 'Returns an in-process metrics snapshot (HTTP request counts, response times, cache hit rate, AI call stats). For internal monitoring — no auth required but should be restricted at the network layer in production.',
        security: [],
        responses: {
          200: {
            description: 'Metrics snapshot',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    http:  { requests: { total: 1250 }, responseTimes: { avg: 45, p95: 120 } },
                    ai:    { calls: { total: 42 }, errors: { total: 1 } },
                    cache: { hitRate: 0.87, hits: 980, misses: 142 },
                    queue: { enqueued: { total: 18 } },
                    system: { memoryMb: 128, cpuPercent: 4.2 },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name:     { type: 'string', minLength: 2, maxLength: 80, example: 'Alex Rivera' },
                  email:    { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', minLength: 8, example: 'S3cur3P@ss!' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created. Access token returned; refresh token set as httpOnly cookie.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user:   { $ref: '#/components/schemas/User' },
                            tokens: { $ref: '#/components/schemas/AuthTokens' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', example: 'S3cur3P@ss!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user:   { $ref: '#/components/schemas/User' },
                            tokens: { $ref: '#/components/schemas/AuthTokens' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Exchange a valid refresh token (from the `refreshToken` httpOnly cookie or request body) for a new access/refresh token pair.',
        security: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string', description: 'Omit if sending via httpOnly cookie.' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'New token pair issued',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/AuthTokens' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out current session',
        description: 'Revokes the current refresh token. The access token will expire naturally.',
        responses: {
          200: { description: 'Logged out successfully' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Log out all sessions',
        description: 'Revokes all refresh tokens for the current user across all devices.',
        responses: {
          200: { description: 'All sessions revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        responses: {
          200: {
            description: 'Current user data',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/User' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/profile': {
      patch: {
        tags: ['Profile'],
        summary: 'Update user profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:     { type: 'string', minLength: 2, maxLength: 80, example: 'Alex Rivera' },
                  avatar:   { type: 'string', format: 'uri', example: 'https://cdn.example.com/avatars/alex.jpg' },
                  timezone: { type: 'string', example: 'America/New_York' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/User' } } },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/change-password': {
      patch: {
        tags: ['Profile'],
        summary: 'Change password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'OldP@ss123' },
                  newPassword:     { type: 'string', minLength: 8, example: 'NewS3cur3P@ss!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed. All other sessions revoked.' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/account': {
      delete: {
        tags: ['Profile'],
        summary: 'Delete account',
        description: 'Permanently deletes the current user account and all associated data. This action is irreversible.',
        responses: {
          200: { description: 'Account deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Account / Sessions ──────────────────────────────────────────────────
    '/account/sessions': {
      get: {
        tags: ['Account'],
        summary: 'List active sessions',
        responses: {
          200: {
            description: 'Active sessions for the current user',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Session' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Account'],
        summary: 'Revoke all other sessions',
        description: 'Revokes every refresh token except the current session ("logout other devices").',
        responses: {
          200: { description: 'Other sessions revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/account/sessions/{id}': {
      delete: {
        tags: ['Account'],
        summary: 'Revoke a specific session',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Session ID' },
        ],
        responses: {
          200: { description: 'Session revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Integrations ────────────────────────────────────────────────────────
    '/integrations': {
      get: {
        tags: ['Integrations'],
        summary: 'List connected accounts',
        responses: {
          200: {
            description: 'Connected social accounts',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ConnectedAccount' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/integrations/{platform}': {
      delete: {
        tags: ['Integrations'],
        summary: 'Disconnect a platform',
        parameters: [{ $ref: '#/components/parameters/platformParam' }],
        responses: {
          200: { description: 'Platform disconnected' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Platforms ───────────────────────────────────────────────────────────
    '/platforms/{platform}/sync': {
      post: {
        tags: ['Platforms'],
        summary: 'Trigger platform data sync',
        description: 'Enqueues a full data sync job for the specified platform. Returns immediately; monitor progress via GET /jobs/history.',
        parameters: [{ $ref: '#/components/parameters/platformParam' }],
        responses: {
          202: { description: 'Sync job enqueued' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/platforms/{platform}/status': {
      get: {
        tags: ['Platforms'],
        summary: 'Get platform sync status',
        parameters: [{ $ref: '#/components/parameters/platformParam' }],
        responses: {
          200: {
            description: 'Platform sync status',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: { platform: 'instagram', status: 'synced', lastSynced: '2026-07-20T04:00:00Z' },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Jobs ────────────────────────────────────────────────────────────────
    '/jobs/health': {
      get: {
        tags: ['Jobs'],
        summary: 'Queue health check',
        description: 'Returns health status of all BullMQ queues. No authentication required.',
        security: [],
        responses: {
          200: {
            description: 'Queue health summary',
            content: {
              'application/json': {
                example: { success: true, data: { status: 'healthy', queues: 6 } },
              },
            },
          },
        },
      },
    },
    '/jobs/queues': {
      get: {
        tags: ['Jobs'],
        summary: 'Queue statistics',
        description: 'Per-queue waiting/active/completed/failed counts. No authentication required.',
        security: [],
        responses: {
          200: {
            description: 'Queue statistics',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    analytics: { waiting: 0, active: 1, completed: 42, failed: 0 },
                    report:    { waiting: 2, active: 0, completed: 18, failed: 1 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/history': {
      get: {
        tags: ['Jobs'],
        summary: 'Job execution history',
        description: 'Paginated list of completed and failed jobs for the current user.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: { description: 'Job history' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/jobs/platforms/{platform}/sync': {
      post: {
        tags: ['Jobs'],
        summary: 'Trigger a platform sync job',
        parameters: [{ $ref: '#/components/parameters/platformParam' }],
        responses: {
          202: { description: 'Sync job queued' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Analytics ───────────────────────────────────────────────────────────
    '/analytics/overview': {
      get: {
        tags: ['Analytics'],
        summary: 'Analytics overview',
        description: 'Aggregate metrics across all connected platforms: total followers, engagement rate, reach, and growth.',
        parameters: [
          { $ref: '#/components/parameters/analyticsDateFrom' },
          { $ref: '#/components/parameters/analyticsDateTo' },
          { $ref: '#/components/parameters/analyticsPlatform' },
        ],
        responses: {
          200: {
            description: 'Overview metrics',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/AnalyticsOverview' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/analytics/growth': {
      get: {
        tags: ['Analytics'],
        summary: 'Follower growth time series',
        parameters: [
          { $ref: '#/components/parameters/analyticsDateFrom' },
          { $ref: '#/components/parameters/analyticsDateTo' },
          { $ref: '#/components/parameters/analyticsPlatform' },
        ],
        responses: {
          200: { description: 'Follower growth data points' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/analytics/engagement': {
      get: {
        tags: ['Analytics'],
        summary: 'Engagement metrics time series',
        parameters: [
          { $ref: '#/components/parameters/analyticsDateFrom' },
          { $ref: '#/components/parameters/analyticsDateTo' },
          { $ref: '#/components/parameters/analyticsPlatform' },
        ],
        responses: {
          200: { description: 'Engagement data points' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/analytics/content-performance': {
      get: {
        tags: ['Analytics'],
        summary: 'Top-performing content',
        parameters: [
          { $ref: '#/components/parameters/analyticsDateFrom' },
          { $ref: '#/components/parameters/analyticsDateTo' },
          { $ref: '#/components/parameters/analyticsPlatform' },
        ],
        responses: {
          200: { description: 'Content performance breakdown' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/analytics/best-posting-time': {
      get: {
        tags: ['Analytics'],
        summary: 'Best posting time recommendation',
        description: 'Returns heatmap data and recommended posting windows based on historical engagement patterns.',
        parameters: [
          { $ref: '#/components/parameters/analyticsPlatform' },
        ],
        responses: {
          200: { description: 'Posting time recommendations' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/analytics/audience': {
      get: {
        tags: ['Analytics'],
        summary: 'Audience demographics',
        parameters: [
          { $ref: '#/components/parameters/analyticsPlatform' },
        ],
        responses: {
          200: { description: 'Audience demographics breakdown' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Competitors ─────────────────────────────────────────────────────────
    '/competitors': {
      post: {
        tags: ['Competitors'],
        summary: 'Track a new competitor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'platform'],
                properties: {
                  username: { type: 'string', example: '@rivalcreator' },
                  platform: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Competitor added and initial sync queued',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Competitor' } } },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { description: 'Competitor already being tracked' },
        },
      },
      get: {
        tags: ['Competitors'],
        summary: 'List tracked competitors',
        responses: {
          200: {
            description: 'Tracked competitors',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Competitor' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/competitors/{id}': {
      delete: {
        tags: ['Competitors'],
        summary: 'Stop tracking a competitor',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Competitor document ID' },
        ],
        responses: {
          200: { description: 'Competitor removed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/competitors/{id}/overview': {
      get: {
        tags: ['Competitors'],
        summary: 'Competitor analytics overview',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Competitor metrics overview' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/competitors/{id}/sync': {
      post: {
        tags: ['Competitors'],
        summary: 'Force a competitor data sync',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          202: { description: 'Sync job enqueued' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Trends ──────────────────────────────────────────────────────────────
    '/trends': {
      get: {
        tags: ['Trends'],
        summary: 'List current trends',
        description: 'Returns platform trends. Public endpoint — no authentication required.',
        security: [],
        parameters: [
          { $ref: '#/components/parameters/analyticsPlatform' },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Current trends',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Trend' } } } },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/trends/topics': {
      get: {
        tags: ['Trends'],
        summary: 'Trending topics',
        security: [],
        parameters: [{ $ref: '#/components/parameters/analyticsPlatform' }],
        responses: { 200: { description: 'Trending topics' } },
      },
    },
    '/trends/hashtags': {
      get: {
        tags: ['Trends'],
        summary: 'Trending hashtags',
        security: [],
        parameters: [{ $ref: '#/components/parameters/analyticsPlatform' }],
        responses: { 200: { description: 'Trending hashtags' } },
      },
    },
    '/trends/creators': {
      get: {
        tags: ['Trends'],
        summary: 'Trending creators',
        security: [],
        parameters: [{ $ref: '#/components/parameters/analyticsPlatform' }],
        responses: { 200: { description: 'Trending creators' } },
      },
    },
    '/trends/refresh': {
      post: {
        tags: ['Trends'],
        summary: 'Refresh trend data',
        description: 'Triggers a manual refresh of trend data for the specified platform. Requires authentication.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['platform'],
                properties: {
                  platform: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'] },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Refresh job enqueued' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Reports ─────────────────────────────────────────────────────────────
    '/reports/generate': {
      post: {
        tags: ['Reports'],
        summary: 'Generate an AI report',
        description: 'Triggers AI-powered report generation. Returns immediately; the report is available asynchronously.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type'],
                properties: {
                  type:     { type: 'string', enum: ['weekly', 'monthly', 'custom'], example: 'weekly' },
                  dateFrom: { type: 'string', format: 'date', description: 'Required for type=custom' },
                  dateTo:   { type: 'string', format: 'date', description: 'Required for type=custom' },
                  platform: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x', 'all'] },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Report generation started' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'List reports',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Paginated list of reports',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Report' } },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/reports/latest': {
      get: {
        tags: ['Reports'],
        summary: 'Get the latest report',
        responses: {
          200: {
            description: 'Most recent report',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Report' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Get a report by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Report',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Report' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Reports'],
        summary: 'Delete a report',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Report deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Strategy ────────────────────────────────────────────────────────────
    '/strategy/generate': {
      post: {
        tags: ['Strategy'],
        summary: 'Generate an AI growth strategy',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['goal'],
                properties: {
                  goal:      { type: 'string', example: 'Grow to 100k YouTube subscribers in 6 months' },
                  platforms: { type: 'array', items: { type: 'string' }, example: ['youtube', 'instagram'] },
                  niche:     { type: 'string', example: 'AI & productivity' },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Strategy generation started' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/strategy': {
      get: {
        tags: ['Strategy'],
        summary: 'List strategies',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Paginated list of strategies',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Strategy' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/strategy/latest': {
      get: {
        tags: ['Strategy'],
        summary: 'Get the latest strategy',
        responses: {
          200: {
            description: 'Most recent strategy',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Strategy' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Notifications ───────────────────────────────────────────────────────
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'unread',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter to unread notifications only',
          },
        ],
        responses: {
          200: {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        responses: {
          200: { description: 'All notifications marked read' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/preferences': {
      patch: {
        tags: ['Notifications'],
        summary: 'Update notification preferences',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Map of notification type to enabled boolean',
                example: { report_ready: true, competitor_updated: false, weekly_digest: true },
              },
            },
          },
        },
        responses: {
          200: { description: 'Preferences updated' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Notification marked read' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete a notification',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Notification deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Planner ─────────────────────────────────────────────────────────────
    '/planner/generate': {
      post: {
        tags: ['Planner'],
        summary: 'Generate an AI content plan',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['platforms', 'durationDays'],
                properties: {
                  platforms:   { type: 'array', items: { type: 'string' }, example: ['instagram', 'youtube'] },
                  durationDays:{ type: 'integer', minimum: 1, maximum: 90, example: 30 },
                  goal:        { type: 'string', example: 'Increase engagement by 20%' },
                  niche:       { type: 'string', example: 'fitness & wellness' },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Content plan generation started' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/planner': {
      get: {
        tags: ['Planner'],
        summary: 'List content plan items',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['planned', 'drafted', 'published', 'cancelled'] },
          },
        ],
        responses: {
          200: {
            description: 'Content plan items',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ContentPlan' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/planner/{id}': {
      patch: {
        tags: ['Planner'],
        summary: 'Update a content plan item',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:       { type: 'string' },
                  description: { type: 'string' },
                  status:      { type: 'string', enum: ['planned', 'drafted', 'published', 'cancelled'] },
                  priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
                  suggestedTime: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Content plan item updated',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/ContentPlan' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Planner'],
        summary: 'Delete a content plan item',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Content plan item deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Calendar ────────────────────────────────────────────────────────────
    '/calendar': {
      get: {
        tags: ['Calendar'],
        summary: 'Get calendar view',
        description: 'Returns content plan items formatted for a calendar view, grouped by date.',
        parameters: [
          {
            name: 'month',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            example: '2026-07',
            description: 'Year-month to view (YYYY-MM). Defaults to current month.',
          },
        ],
        responses: {
          200: { description: 'Calendar data' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Drafts ──────────────────────────────────────────────────────────────
    '/drafts': {
      post: {
        tags: ['Drafts'],
        summary: 'Create a draft',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'platform'],
                properties: {
                  title:    { type: 'string', example: 'How AI changed my workflow' },
                  content:  { type: 'string', example: 'Here are 5 tools I use every day...' },
                  platform: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'linkedin', 'x'] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Draft created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Draft' } } },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/drafts/{id}': {
      patch: {
        tags: ['Drafts'],
        summary: 'Update a draft',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:   { type: 'string' },
                  content: { type: 'string' },
                  status:  { type: 'string', enum: ['draft', 'ready', 'scheduled'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Draft updated',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Draft' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Drafts'],
        summary: 'Delete a draft',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Draft deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Workspaces ──────────────────────────────────────────────────────────
    '/workspaces': {
      post: {
        tags: ['Workspaces'],
        summary: 'Create a workspace',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80, example: 'Acme Media Team' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Workspace created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Workspace' } } },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Workspaces'],
        summary: 'List workspaces',
        description: 'Returns all workspaces where the current user is a member.',
        responses: {
          200: {
            description: 'Workspace list',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Workspace' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/workspaces/{id}': {
      get: {
        tags: ['Workspaces'],
        summary: 'Get a workspace',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Workspace details',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Workspace' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Workspaces'],
        summary: 'Update a workspace',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Workspace updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Workspaces'],
        summary: 'Delete a workspace',
        description: 'Permanently deletes the workspace. Only the owner can perform this action.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Workspace deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/workspaces/{id}/invite': {
      post: {
        tags: ['Workspaces'],
        summary: 'Invite a member',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  role:  { type: 'string', enum: ['admin', 'editor', 'viewer'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Member invited' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { description: 'User is already a member' },
        },
      },
    },
    '/workspaces/{id}/members': {
      get: {
        tags: ['Workspaces'],
        summary: 'List workspace members',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Member list',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/WorkspaceMember' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/workspaces/{id}/members/{user}': {
      patch: {
        tags: ['Workspaces'],
        summary: "Update a member's role",
        parameters: [
          { name: 'id',   in: 'path', required: true, schema: { type: 'string' } },
          { name: 'user', in: 'path', required: true, schema: { type: 'string' }, description: 'Member user ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Member role updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Workspaces'],
        summary: 'Remove a member',
        parameters: [
          { name: 'id',   in: 'path', required: true, schema: { type: 'string' } },
          { name: 'user', in: 'path', required: true, schema: { type: 'string' }, description: 'Member user ID' },
        ],
        responses: {
          200: { description: 'Member removed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/workspaces/{id}/audit': {
      get: {
        tags: ['Workspaces'],
        summary: 'Workspace audit log',
        description: 'Returns all audit events scoped to this workspace.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Workspace audit log',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── API Keys ────────────────────────────────────────────────────────────
    '/apikeys': {
      post: {
        tags: ['API Keys'],
        summary: 'Create an API key',
        description: 'The full key value is returned **only once** in this response and never again.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name:      { type: 'string', minLength: 2, maxLength: 80, example: 'CI Pipeline Key' },
                  scopes:    { type: 'array', items: { type: 'string' }, example: ['analytics:read'] },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'API key created. Store the returned key value securely — it cannot be retrieved again.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          allOf: [
                            { $ref: '#/components/schemas/ApiKey' },
                            { properties: { key: { type: 'string', example: 'cos_live_abc123def456...' } } },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['API Keys'],
        summary: 'List API keys',
        description: 'Returns metadata only. Key values are never returned after creation.',
        responses: {
          200: {
            description: 'API keys',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/apikeys/{id}': {
      patch: {
        tags: ['API Keys'],
        summary: 'Update an API key',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:   { type: 'string' },
                  scopes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'API key updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['API Keys'],
        summary: 'Delete an API key',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'API key deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/apikeys/{id}/revoke': {
      post: {
        tags: ['API Keys'],
        summary: 'Revoke an API key',
        description: 'Immediately invalidates the key without deleting the metadata record.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'API key revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Search ──────────────────────────────────────────────────────────────
    '/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-text search',
        description: 'Searches across reports, strategies, content plans, drafts, and competitors.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 2 },
            description: 'Search query',
            example: 'productivity',
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['report', 'strategy', 'plan', 'draft', 'competitor', 'all'],
              default: 'all',
            },
            description: 'Resource type to search',
          },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: { description: 'Search results' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Settings ────────────────────────────────────────────────────────────
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get all settings',
        responses: {
          200: { description: 'All user settings by type' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/settings/{type}': {
      get: {
        tags: ['Settings'],
        summary: 'Get settings by type',
        parameters: [
          {
            name: 'type',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['notifications', 'privacy', 'display', 'integrations'] },
          },
        ],
        responses: {
          200: { description: 'Settings for the specified type' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Settings'],
        summary: 'Update settings',
        parameters: [
          {
            name: 'type',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['notifications', 'privacy', 'display', 'integrations'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Settings payload specific to the selected type',
              },
            },
          },
        },
        responses: {
          200: { description: 'Settings updated' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Usage ───────────────────────────────────────────────────────────────
    '/usage/summary': {
      get: {
        tags: ['Usage'],
        summary: 'AI feature usage summary',
        description: 'Returns current period usage totals by AI feature category.',
        responses: {
          200: {
            description: 'Usage summary',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    period: '2026-07',
                    totals: { reports: 4, strategies: 2, planner: 3 },
                    limits: { reports: 10, strategies: 5, planner: 10 },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/usage': {
      get: {
        tags: ['Usage'],
        summary: 'AI usage history',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string', enum: ['report', 'strategy', 'planner', 'competitor', 'trend'] },
          },
        ],
        responses: {
          200: { description: 'Paginated usage history' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Audit ───────────────────────────────────────────────────────────────
    '/audit': {
      get: {
        tags: ['Audit'],
        summary: 'User audit log',
        description: 'Returns the immutable audit trail for the current user. Results are sorted newest-first.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by action type, e.g. workspace.member.invited',
            example: 'apikey.created',
          },
          { $ref: '#/components/parameters/analyticsDateFrom' },
          { $ref: '#/components/parameters/analyticsDateTo' },
        ],
        responses: {
          200: {
            description: 'Audit log entries',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Feature flags ───────────────────────────────────────────────────────
    '/features': {
      get: {
        tags: ['Features'],
        summary: 'List feature flags',
        responses: {
          200: {
            description: 'Feature flags',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/FeatureFlag' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/features/{key}': {
      get: {
        tags: ['Features'],
        summary: 'Get a feature flag by key',
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' }, example: 'ai_strategy_v2' },
        ],
        responses: {
          200: {
            description: 'Feature flag',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/FeatureFlag' } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Features'],
        summary: 'Toggle a feature flag',
        description: 'Restricted to `admin` and `superadmin` roles.',
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' }, example: 'ai_strategy_v2' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enabled'],
                properties: {
                  enabled: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Feature flag updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

export default spec;
