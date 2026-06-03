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
