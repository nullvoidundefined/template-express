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
