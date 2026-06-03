CREATE TABLE idempotency_keys (
    key TEXT NOT NULL,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    status_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (key, email)
);
