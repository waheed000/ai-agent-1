# CreatorOS AI — Project Context

## IMPORTANT INSTRUCTION FOR AI CODING AGENTS

This document contains the current architecture, implementation status, completed work, API conventions, and known limitations of CreatorOS AI.

Before making any changes:

1. Read this file completely.
2. Do NOT perform a broad repository audit.
3. Do NOT re-implement completed features.
4. Do NOT replace existing architecture.
5. Inspect only files directly relevant to the current task.
6. Follow existing project patterns and conventions.
7. Use real backend APIs and real database data.
8. NEVER add dummy, mock, fake, hardcoded, or placeholder application data.
9. Preserve all existing functionality.
10. Run appropriate tests and production builds after implementation.
11. Update this file after completing the task.

The current task is:

PHASE 3A — CONTENT & INTELLIGENCE

Implement:
- Content Planner
- Competitor Intelligence

Do not start Phase 3B or Phase 3C.

---

# 1. PROJECT OVERVIEW

CreatorOS AI is an AI-powered social media growth platform for creators, brands, and businesses.

The platform acts as an AI-powered personal social media strategist.

It is designed to help users:

- Understand why their social media growth is increasing or decreasing
- Analyze social media performance
- Monitor competitors
- Discover trends
- Generate content ideas
- Plan content
- Identify high-performing content
- Generate AI-powered growth recommendations
- Create weekly growth strategies
- Track audience growth
- Improve posting strategy

The long-term platform supports:

- Analytics
- Content Planning
- Competitor Intelligence
- Trend Intelligence
- AI Insights
- Reports
- Notifications
- Workspaces
- Team collaboration
- Social platform integrations

---

# 2. CURRENT REPOSITORY STRUCTURE

The project is organized as:

CreatorOS-AI/

├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── ...
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── DEPLOYMENT.md
│   └── SECURITY.md
│
├── lib/
│
├── PROJECT_CONTEXT.md
│
└── package.json

IMPORTANT:

- frontend/ contains the real React frontend.
- backend/ contains the real production backend.
- Do not use artifacts/api-server as the application backend.
- The real backend is backend/.
- The frontend is frontend/.

---

# 3. TECHNOLOGY STACK

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Query / TanStack Query
- Recharts
- React Router
- Custom API client
- Authentication Context
- Workspace Context

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- MongoDB Atlas ready
- mongodb-memory-server for development
- Redis
- BullMQ
- JWT authentication
- Refresh tokens
- AES-256-GCM encryption
- bcrypt
- express-validator
- Helmet
- CORS
- Rate limiting
- Structured logging
- Request tracing
- EventBus
- AI provider abstraction

## AI Providers

The architecture supports:

- Google Gemini
- OpenAI

AI providers must use centralized configuration.

Do not hardcode API keys.

---

# 4. BACKEND STATUS

The backend has been implemented through Phase 15C.

Backend status:

Phase 1 — Foundation
STATUS: COMPLETE

Phase 2 — Database Models
STATUS: COMPLETE

Phase 3 — Authentication
STATUS: COMPLETE

Phase 4 — OAuth & Connected Accounts Infrastructure
STATUS: COMPLETE

Phase 5 — Platform Integration Framework
STATUS: COMPLETE

Phase 6 — Background Jobs & Sync Scheduler
STATUS: COMPLETE

Phase 7 — Analytics Engine
STATUS: COMPLETE

Phase 8 — Competitor Intelligence Backend
STATUS: COMPLETE

Phase 9 — Trend Intelligence Backend
STATUS: COMPLETE

Phase 10 — AI Multi-Agent Infrastructure
STATUS: COMPLETE

Phase 11 — AI Agent Orchestration
STATUS: COMPLETE

Phase 12 — Trend/AI Data Collection
STATUS: COMPLETE

Phase 13 — Content Planner, Reports, Notifications Infrastructure
STATUS: COMPLETE

Phase 14 — Workspace, API Keys, Search, Settings, Audit
STATUS: COMPLETE

Phase 14 QA
STATUS: COMPLETE

QA Results:

- Original Phase 14 tests: 78/78 passing
- Phase 14 QA tests: 124/124 passing
- Total Phase 14 tests: 202/202 passing

Phase 15A — Infrastructure & Professional Project Structure
STATUS: COMPLETE

Phase 15B — Production Hardening & Observability
STATUS: COMPLETE

Phase 15C — Final Backend Hardening
STATUS: COMPLETE

IMPORTANT:

The backend should now be treated as a stable production-oriented backend.

Do NOT rewrite backend architecture during frontend integration.

Only make backend changes if a genuine frontend integration bug or missing API contract is discovered.

If a backend change is absolutely necessary:

1. Keep it minimal.
2. Preserve backward compatibility.
3. Do not break existing APIs.
4. Run the full relevant backend test suite.
5. Document the change.

---

# 5. BACKEND INFRASTRUCTURE

Database:

- Mongoose
- MongoDB Atlas ready
- In-memory MongoDB for development

Cache:

- Redis
- Graceful degradation when Redis is unavailable

Background jobs:

- BullMQ
- Multiple workers
- Scheduled jobs

Events:

- In-process EventBus
- Event listeners

Security:

- Helmet
- CORS
- Rate limiting
- JWT
- Refresh tokens
- AES-256-GCM token encryption
- bcrypt
- NoSQL injection protection
- Prototype pollution protection
- HPP protection

Logging:

- Structured logging
- Request IDs
- Correlation IDs
- User IDs
- Workspace IDs
- Request timing

Monitoring:

- MetricsService
- API metrics
- AI call metrics
- Queue metrics
- Cache metrics

Health:

- /api/v1/health
- /api/v1/health/live
- /api/v1/health/ready
- /api/v1/health/dependencies
- /api/v1/health/metrics

---

# 6. FRONTEND STATUS

Frontend structure and core integration have been implemented.

Completed:

Authentication
STATUS: COMPLETE

Login
STATUS: COMPLETE

Registration
STATUS: COMPLETE

Session restoration
STATUS: COMPLETE

Protected routes
STATUS: COMPLETE

Dashboard
STATUS: INTEGRATED

Analytics
STATUS: INTEGRATED

Workspaces
STATUS: INTEGRATED

Team Management
STATUS: INTEGRATED

Settings
STATUS: INTEGRATED

Connected Accounts UI
STATUS: PARTIAL

OAuth
STATUS: NOT IMPLEMENTED

Important:

The frontend must NOT display OAuth providers as functional if the backend provider implementation does not exist.

Currently unsupported OAuth providers should show:

"Coming Soon"

Do not create fake OAuth flows.

---

# 7. FRONTEND API ARCHITECTURE

The frontend uses:

frontend/src/lib/api-client.ts

This API client:

- Stores access token in memory
- Handles 401 responses
- Attempts refresh
- Retries failed requests
- Handles API errors
- Supports field-level validation errors

Do NOT bypass apiClient unless there is a strong reason.

All backend API requests must use the existing API client architecture.

The backend API base path is:

/api/v1

Do not create incorrect paths such as:

/api/dashboard

unless the backend actually exposes them.

---

# 8. IMPORTANT API RESPONSE CONVENTIONS

Backend responses use the project's standard response envelope.

Always inspect existing service files and backend controllers before assuming response shapes.

IMPORTANT:

Mongoose IDs are normalized to:

id

NOT:

_id

Frontend should use:

object.id

not:

object._id

---

# 9. ANALYTICS IMPLEMENTATION

Analytics backend is already implemented.

Available endpoints include:

GET /api/v1/analytics/overview

GET /api/v1/analytics/growth

GET /api/v1/analytics/engagement

GET /api/v1/analytics/content-performance

GET /api/v1/analytics/best-posting-time

GET /api/v1/analytics/audience

Growth response uses:

timeSeries

Example conceptual structure:

timeSeries: [
  {
    date,
    followers,
    delta
  }
]

Do NOT assume the response uses:

history

or:

byPlatform

unless confirmed from the actual backend API.

---

# 10. WORKSPACE ARCHITECTURE

The frontend has:

WorkspaceContext

The active workspace is persisted using sessionStorage.

Workspace functionality includes:

- Create workspace
- List workspaces
- Rename workspace
- Delete workspace
- Switch workspace
- List members
- Invite members
- Update roles
- Remove members

Workspace IDs use:

id

not:

_id

Workspace-scoped API requests must use the active workspace context where required.

---

# 11. PHASE 3A TASK

CURRENT PHASE:

PHASE 3A — CONTENT & INTELLIGENCE

Implement only:

1. Content Planner
2. Competitor Intelligence

Do NOT implement:

- Trend Intelligence
- AI Insights
- Reports
- Notifications
- Final Dashboard Audit

Those belong to later phases.

---

# 12. CONTENT PLANNER — EXPECTED FRONTEND FUNCTIONALITY

The Content Planner frontend should integrate with the existing backend.

The page should support real functionality such as:

- View content plan
- View planned content
- Create content plan items
- Edit content plan items
- Delete content plan items
- Change content status
- View scheduled/planned content
- Filter by platform
- Filter by status
- Filter by date
- View content ideas where supported
- Generate AI-assisted content ideas if backend API already supports it
- Show loading states
- Show empty states
- Show error states
- Show retry actions

Use real API data.

Do NOT add fake content cards.

If there is no content:

Show a professional empty state.

Example:

"No content planned yet"

with an appropriate CTA.

---

# 13. COMPETITOR INTELLIGENCE — EXPECTED FRONTEND FUNCTIONALITY

The Competitor Intelligence page should integrate with the existing backend APIs.

Expected functionality:

- View tracked competitors
- Add competitor
- Remove competitor
- View competitor overview
- View competitor metrics
- View competitor posts where supported
- View competitor trends/topics where supported
- Trigger competitor sync where supported
- Show platform information
- Show loading states
- Show empty states
- Show API errors
- Show retry actions

Use real backend data.

Do NOT create fake competitors.

If no competitors exist:

Show a professional empty state with an Add Competitor CTA.

---

# 14. UI/UX REQUIREMENTS

Follow the existing CreatorOS AI design system.

Do NOT redesign the entire application.

Use existing:

- shadcn/ui components
- Cards
- Tables
- Dialogs
- Dropdowns
- Tabs
- Badges
- Skeleton loaders
- Toasts
- Error states

Pages must be:

- Responsive
- Professional
- Consistent
- Accessible

Handle:

Loading
Empty
Error
Success

states properly.

---

# 15. NO DUMMY DATA RULE

This is extremely important.

Do NOT use:

- Dummy data
- Mock data
- Fake competitors
- Fake posts
- Fake analytics
- Hardcoded content plans
- Static fake metrics
- Placeholder API responses

All displayed application data must come from:

- Backend API
- Real authenticated user
- Real database

If backend returns empty data:

Render an appropriate empty state.

---

# 16. TESTING REQUIREMENTS

After implementation:

1. Run TypeScript check.
2. Run frontend production build.
3. Verify all affected API calls.
4. Verify authenticated flows.
5. Verify workspace-scoped data.
6. Verify loading states.
7. Verify empty states.
8. Verify error handling.
9. Verify no dummy data exists.
10. Verify existing pages were not broken.

Do not claim success unless the implementation is actually tested.

---

# 17. CURRENT FRONTEND INTEGRATION ROADMAP

Phase 3A
- Content Planner
- Competitor Intelligence

Phase 3B
- Trend Intelligence
- AI Insights

Phase 3C
- Reports
- Notifications
- Final Dashboard Audit
- Full Frontend Integration Audit

After frontend integration:

- Frontend Polish
- Manual End-to-End Testing
- Bug Fix Sprint
- Performance Optimization
- Security Review
- Production Deployment Preparation
- Backend Deployment
- Frontend Deployment
- Production Testing
- Portfolio Polish

---

# 18. CURRENT TASK FOR THIS REPLIT SESSION

Implement:

PHASE 3A — CONTENT & INTELLIGENCE

Features:

1. Content Planner
2. Competitor Intelligence

Follow existing backend APIs.

Do not implement later phases.

At completion:

- Run TypeScript check
- Run production build
- Test affected API calls
- Verify no mock/dummy data
- Verify existing functionality
- Provide a detailed implementation report
- Update this PROJECT_CONTEXT.md with:
  - Files changed
  - APIs integrated
  - Features completed
  - Any backend limitations
  - Any remaining issues
  - Phase 3A completion status

Do not modify unrelated application areas.
