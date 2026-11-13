Runtime data lives here: the SQLite database, WAL files, uploads, and backups.

This directory is ignored by Git apart from this note and `.gitkeep`. The API
creates the database on `npm run db:setup`.
