import crypto from 'node:crypto';

// One-way hash for session tokens -- fast because tokens are random (no dictionary attacks)
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export { hashToken };
