-- CreateTable: user_backups for encrypted backup storage
CREATE TABLE IF NOT EXISTS user_backups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    encrypted_data TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_backups_created_at ON user_backups(created_at DESC);
