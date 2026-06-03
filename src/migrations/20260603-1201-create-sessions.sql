CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
