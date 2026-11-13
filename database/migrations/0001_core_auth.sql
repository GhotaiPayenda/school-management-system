-- Foundation: roles, permissions, users, sessions, and login throttling.

CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX users_role_id_index ON users (role_id);
CREATE INDEX users_status_index ON users (status);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX sessions_user_id_index ON sessions (user_id);
CREATE INDEX sessions_expires_at_index ON sessions (expires_at);

CREATE TABLE login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip TEXT NOT NULL,
    successful INTEGER NOT NULL DEFAULT 0 CHECK (successful IN (0, 1)),
    created_at TEXT NOT NULL
);

CREATE INDEX login_attempts_email_index ON login_attempts (email, created_at);
CREATE INDEX login_attempts_ip_index ON login_attempts (ip, created_at);
