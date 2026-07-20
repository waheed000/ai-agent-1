# Contributing — CreatorOS AI Backend

## Getting Started

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and configure your local values:
   ```bash
   cp .env.example .env
   ```
   You do not need `MONGODB_URI` for local development — the test and dev server use an automatic in-memory MongoDB instance when the variable is absent.

4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Code Style

- **ES modules** — all files use `import`/`export`. No `require()`.
- **No TypeScript** — plain modern JavaScript (Node.js 18+).
- **Async/await** — never callbacks. Promise chains only when composing streams.
- **Named exports preferred** over default exports, except for Express routers and Express apps.
- **Consistent naming:**
  - Files: `PascalCase` for classes (`UserService.js`), `camelCase` for utilities (`asyncHandler.js`), `kebab-case` for route files (`auth.routes.js`).
  - Variables: `camelCase`.
  - Constants: `UPPER_SNAKE_CASE`.
  - MongoDB fields: `camelCase`.
- **Error handling:** Always use `AppError` from `src/utils/errors.js` for operational errors. Never `throw new Error(...)` from a service — it produces untyped 500s.
- **No magic strings or numbers:** Extract string literals used in more than one place to a shared constant. Extract numeric limits to config or a named constant with a comment.

---

## Module Conventions

Every new business domain follows this structure:

```
src/modules/<domain>/
├── <Domain>Controller.js
├── <Domain>Service.js
├── <Domain>Repository.js
├── <domain>.routes.js
└── <domain>Validators.js
```

- The **controller** is responsible for HTTP concerns only: reading from `req`, calling the service, and formatting the response with `sendSuccess` / `sendError`.
- The **service** contains business logic. It may call repositories and emit events, but must not directly touch `req` or `res`.
- The **repository** contains all Mongoose queries. It must not contain business logic or emit events.
- The **route file** maps HTTP methods and paths to controller actions and applies middleware.
- **Validators** are `express-validator` chains exported from the validator file and applied in the route file.

---

## Adding a New Endpoint

1. Create or extend the validator in `<domain>Validators.js`.
2. Add the controller action in `<Domain>Controller.js` — call the service, return `sendSuccess` or delegate errors.
3. Add the service method in `<Domain>Service.js`.
4. Add the repository method in `<Domain>Repository.js` if a new query is needed.
5. Register the route in `<domain>.routes.js`.
6. Add the path to `src/docs/openapi.js` with complete request/response schemas.
7. Write or extend the integration test in `src/tests/`.

---

## Adding a New Module

1. Create the directory `src/modules/<domain>/`.
2. Follow the module structure above.
3. Import and mount the router in `src/routes/index.js`.
4. Add the Mongoose model to `src/models/` and export it from `src/models/index.js`.
5. Document all endpoints in `src/docs/openapi.js`.
6. Add a `tags` entry for the new domain in the `tags` array of the OpenAPI spec.

---

## Writing Tests

The test suite uses Node.js native `--test` with `supertest` and `mongodb-memory-server`.

**Test file location:** `src/tests/<feature>.test.js`

**Structure:**
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { startTestServer, stopTestServer } from './helpers.js'; // adapt as needed

let request;

before(async () => { request = await startTestServer(); });
after(async ()  => { await stopTestServer(); });

describe('My feature', () => {
  it('does the thing', async () => {
    const res = await request.get('/api/v1/my-endpoint');
    assert.equal(res.status, 200);
  });
});
```

**Guidelines:**
- Each test file bootstraps its own in-memory MongoDB and Express app.
- Tests are isolated — no shared state between test suites.
- Use `before`/`after` (not `beforeEach`/`afterEach`) to start/stop the server once per suite.
- Test both the happy path and error paths (401, 403, 404, 422).
- Do not mock the database in integration tests — use the in-memory MongoDB.

**Running tests:**
```bash
npm test                                  # all tests
node --test src/tests/phase15b.test.js    # single file
```

---

## Events

Cross-domain side effects go through the event bus, not inline service calls.

```javascript
// In a service
import eventBus from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventTypes.js';

eventBus.emit(EVENTS.REPORT_GENERATED, { userId, reportId });
```

```javascript
// In src/events/listeners/<MyEvent>.js
import eventBus from '../eventBus.js';
import { EVENTS } from '../eventTypes.js';

eventBus.on(EVENTS.REPORT_GENERATED, async ({ userId, reportId }) => {
  // side effect — e.g. create a notification
});
```

Register the listener in `src/events/listeners/index.js`.

---

## Background Jobs

AI-intensive operations run in BullMQ workers. To add a new background job:

1. Define the job name as a constant in `src/infrastructure/queue/index.js`.
2. Create a worker file in `src/queues/workers/<name>Worker.js`.
3. Register the worker in `src/server.js`.
4. Optionally add a repeating job in `src/queues/scheduler.js`.

---

## Pull Request Checklist

- [ ] All existing tests pass (`npm test`).
- [ ] New endpoints have integration tests.
- [ ] New endpoints are documented in `src/docs/openapi.js`.
- [ ] No `console.log` — use `logger.info()` / `logger.warn()` / `logger.error()`.
- [ ] No hardcoded secrets, URLs, or magic numbers.
- [ ] No `TODO`, `FIXME`, or commented-out code.
- [ ] Operational errors use `AppError` from `src/utils/errors.js`.
- [ ] New environment variables are added to `.env.example` and `README.md`.
