# Architecture Decisions

Decisions made during development, with reasoning. Newest at the bottom.

## 001 - Layered architecture (routes, handlers, helpers, repositories)

Separate concerns so each layer has a single responsibility. Routes map URLs to handlers. Handlers own HTTP logic (parsing input, setting status codes). Helpers contain reusable cross-cutting logic. Repositories own all SQL queries. Constants centralize magic values.

## 002 - Factory-based dependency injection

Every layer exports a factory function that accepts its dependencies as arguments. Production code wires real dependencies in `server.ts`. Tests pass fakes directly without module mocking. Chosen over `vi.mock()` for reliability and because the app is expected to grow.

## 003 - In-memory rate limiting with test bypass

Using `express-rate-limit` with in-memory storage. Sufficient for a single server. Would need Redis-backed storage for multi-server deployments. Rate limiting is disabled entirely when `NODE_ENV=test` to avoid flaky tests from request count carryover.

## 004 - Strict auth rate limit vs general rate limit

Auth routes (login/register) get 10 requests per 15 minutes. All other routes get 100 per 15 minutes. Auth is stricter because it's the primary brute-force target. Auth routes are hit by both limiters since the general limiter is applied globally.

## 005 - Timestamp-prefixed migrations (YYYYMMDD-HHMM)

Migration files use `YYYYMMDD-HHMM-description.sql` naming. Avoids the 999-file ceiling of sequential numbering. Hour and minute included because multiple migrations per day are expected. Alphabetical sort determines execution order.

## 006 - Separate test database with shared migration runner

Integration tests use `demo_express_test`, created automatically by the test setup. Migrations are re-run using the same logic as `migrate.ts`. Tables are truncated between tests via `TRUNCATE ... CASCADE`. Test files run sequentially to avoid database races.

## 007 - bcrypt password max length of 72

bcrypt silently truncates input beyond 72 bytes. Rather than letting users think their full password is being used, registration rejects passwords longer than 72 characters with an explicit error. This makes the truncation visible instead of surprising.

## 008 - Nested constants (`AUTH.ERRORS.x`, `HTTP.STATUS.x`)

Constants are grouped under a single export per domain rather than flat individual exports. Reads as `HTTP.STATUS.BAD_REQUEST` instead of `HTTP_STATUS.BAD_REQUEST`. Keeps imports clean (one import per domain) and makes the namespace relationship explicit.

## 009 - `insertUser` returns boolean instead of throwing on duplicate

The users repository catches Postgres unique violation errors (code 23505) and returns `false` instead of throwing. This avoids a check-then-insert race condition and keeps error handling in the repository layer where it belongs, rather than forcing handlers to catch database-specific errors.

## 010 - Session TTL enforced at query time, not cleanup time

`findSession` filters by `created_at` in the `WHERE` clause rather than relying on periodic cleanup. This means expired sessions are immediately invalid even if `deleteExpiredSessions` hasn't run yet. The cleanup function exists to prevent table bloat, not to enforce expiry.

## 011 - Global error handler returns JSON, not HTML

Express's default error handler returns an HTML page. Since this is a JSON API, the global error handler catches unhandled errors and returns `{"error": "Internal server error"}`. The stack trace is logged server-side but never sent to the client.

## 012 - CORS with explicit origin allowlist and credentials

CORS is configured via the `CORS_ORIGIN` environment variable (comma-separated for multiple origins). Defaults to `http://localhost:3000` for local frontend development. `credentials: true` is required because we use cookies for authentication -- without it browsers won't send cookies cross-origin. The origin is not set to `*` because wildcard origins are incompatible with `credentials: true` and would allow any website to make authenticated requests.

## 013 - Session tokens hashed with SHA-256 before storage

Raw session tokens (UUIDs) are sent to the client in cookies. Before any database operation (insert, lookup, delete), the token is hashed with SHA-256. The database only ever stores hashes. This means a database breach doesn't expose usable session tokens. SHA-256 is used instead of bcrypt because session tokens are random -- there's no dictionary to attack, so a fast hash is sufficient. The hashing happens in the helper/middleware/handler layers, not the repository, keeping the repository unaware of the hashing strategy.

## 014 - Limit/offset pagination with total count

`GET /posts` accepts `?limit=` and `?offset=` query parameters. Defaults to 20 per page, max 100. The response includes `total` so clients can calculate page count. The count and data queries run in parallel via `Promise.all` to avoid sequential round trips. Chosen over cursor-based pagination for simplicity -- limit/offset is sufficient when posts are scoped to a single user and total counts are small.

## 015 - Session cleanup via pg_cron, not application-level scheduler

Expired sessions are cleaned up hourly by a pg_cron job inside Postgres (`0 * * * *`). This replaces an earlier `setInterval` approach which had problems: it didn't run when the app was down, ran redundantly on every instance, and drifted from wall-clock time. pg_cron runs exactly once regardless of app instance count, survives app restarts, and keeps the cleanup lifecycle where the data lives. The migration uses a `DO` block with `EXCEPTION` handling so it silently skips on databases without pg_cron (e.g., local development).

**TODO:** Verify pg_cron is available on Neon before deploying. Neon supports pg_cron but it may need to be enabled per-project in the Neon dashboard. If not available, fall back to a Railway cron service calling a cleanup endpoint or script.

## 016 - Pino for structured request logging

Using pino + pino-http over Winston or Morgan. Pino outputs structured JSON (one line per entry, parseable by log aggregators) and is significantly faster due to async serialization. pino-http automatically logs method, URL, status code, and response time for every request. In development, pino-pretty formats output for readability. In test, the logger is silenced entirely (`level: 'silent'`). The error handler uses the same pino logger instance instead of `console.error` for consistent log format.

## 017 - Graceful shutdown on SIGTERM/SIGINT

On termination signals, the server stops accepting new connections, waits for in-flight requests to complete, closes the database pool, then exits with code 0. A 10-second timeout forces exit if draining takes too long, preventing stuck requests from blocking deploys. Both SIGTERM (process managers) and SIGINT (Ctrl+C) are handled. The shutdown sequence is logged at each step for observability.

## 018 - Custom pino serializers for concise logs

Default pino-http serializers dump full request headers, response headers, query params, and remote address -- ~30 lines per request. Custom serializers reduce this to method, URL, status code, and response time. This keeps development output scannable and production log volume manageable without losing the information needed for debugging.

## 019 - 404 catch-all middleware returns JSON

A three-argument middleware after all routes catches unmatched URLs and returns `{"error": "Not found"}`. Without this, Express returns its default HTML error page, which is useless for API clients. Placed after routes but before the error handler so it doesn't interfere with the four-argument error middleware signature.

## 020 - hashToken utility in helpers, not repositories

The `hashToken` function lives in `helpers/hash.ts` and is called by the auth helper, middleware, and handler -- the layers that bridge the raw cookie token and the database. Repositories are unaware of hashing and store/query whatever string they receive. This means the hashing strategy can be changed in one place without touching the data access layer.

## 021 - Migration transactions use dedicated client, not pool.query

`pool.query()` acquires a different connection for each call. BEGIN/COMMIT/ROLLBACK on separate connections do not form a transaction. The migration runner uses `pool.connect()` to acquire a single client and runs all statements through it, ensuring atomicity. A failed migration rolls back completely instead of leaving a partially-applied schema.

## 022 - Health endpoint checks database connectivity

The `/health` endpoint runs `SELECT 1` against the pool. If the database is unreachable, it returns 500 with `{"status": "error"}` instead of a false-positive 200. Load balancers and Railway health checks use this endpoint to detect unhealthy instances and route traffic away.

## 023 - Helmet for security response headers

Helmet adds baseline security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, etc.) with a single middleware call. Mounted before all routes so every response includes the headers, including error responses.

## 024 - Session cleanup fallback on startup

`deleteExpiredSessions` runs once on server startup as a fallback for environments without pg_cron (local dev, managed Postgres tiers without the extension). This ensures stale sessions are cleaned even if the pg_cron job never runs. The startup cleanup is fire-and-forget; failure is logged but does not prevent the server from starting.

## 025 - Explicit column lists instead of SELECT *

Posts queries use a shared `POST_COLUMNS` constant instead of `SELECT *`. This prevents future columns (internal flags, soft-delete markers) from leaking to API consumers automatically, and makes the returned shape explicit and grep-able.

## 026 - SSL and connection limits for managed Postgres

The pool uses `ssl: { rejectUnauthorized: false }` in production because Neon and Railway require SSL connections. Connection max is set to 5 in production to stay within free-tier limits. Local dev uses no SSL and the default pool size of 10.

## 027 - Startup env validation in production

The server exits immediately with a clear error message if `DATABASE_URL` or `CORS_ORIGIN` are missing in production. This catches misconfigured deploys at boot time instead of at first request, when the error surfaces as a confusing connection refused or CORS block.

## 028 - Zod schemas as single source of truth for validation and types

Input validation moved from hand-written if-checks in handlers to Zod schemas in `src/schemas/`. Schemas encode constraints (required, min/max length, format, coercion) declaratively. TypeScript types are derived from schemas via `z.infer`, eliminating drift between validation and types. A reusable `validate` middleware in the routes layer runs the schema before the handler, so handlers contain only business logic. Validation-specific error messages and limits that were previously in constants files now live in the schemas. Constants files retain only non-validation values (cookie name, bcrypt rounds, session TTL, HTTP status codes, business-logic error messages like "Post not found").
