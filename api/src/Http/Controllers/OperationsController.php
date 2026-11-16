<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class OperationsController extends Controller
{
    public function __construct(PDO $db, private readonly array $config)
    {
        parent::__construct($db);
    }

    public function info(Request $request): Response
    {
        $path = (string) $this->config['database']['path'];
        $size = is_file($path) ? filesize($path) : 0;
        $migrations = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM schema_migrations')['total'];
        $lastBackup = $this->fetchOne('SELECT * FROM backup_records ORDER BY created_at DESC LIMIT 1');

        return Response::json([
            'databasePath' => basename($path),
            'databaseSize' => $size,
            'migrations' => $migrations,
            'journalMode' => (string) $this->fetchOne('PRAGMA journal_mode')['journal_mode'],
            'lastBackup' => $lastBackup,
            'phpVersion' => PHP_VERSION,
            'sqliteVersion' => (string) $this->fetchOne('SELECT sqlite_version() AS version')['version'],
        ]);
    }

    public function backups(Request $request): Response
    {
        $rows = $this->fetchAll(
            'SELECT b.*, u.name AS created_by_name FROM backup_records b LEFT JOIN users u ON u.id = b.created_by ORDER BY b.created_at DESC',
        );

        return Response::json(['items' => $rows]);
    }

    public function createBackup(Request $request): Response
    {
        $directory = $this->backupDirectory();
        $filename = 'meridian-' . gmdate('Ymd-His') . '.sqlite';
        $path = $directory . '/' . $filename;
        $suffix = 1;
        while (is_file($path)) {
            $filename = 'meridian-' . gmdate('Ymd-His') . '-' . $suffix . '.sqlite';
            $path = $directory . '/' . $filename;
            $suffix++;
        }
        $this->db->exec('VACUUM INTO ' . $this->db->quote($path));
        $id = $this->insert('backup_records', [
            'filename' => $filename,
            'size' => filesize($path) ?: 0,
            'created_by' => $this->user($request)->id,
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'operations', 'backup.create', 'backup', $id, null, ['filename' => $filename]);

        return Response::json($this->fetchOne('SELECT * FROM backup_records WHERE id = :id', ['id' => $id]), 201);
    }

    public function downloadBackup(Request $request, int $id): Response
    {
        $backup = $this->fetchOne('SELECT * FROM backup_records WHERE id = :id', ['id' => $id]);
        if ($backup === null) {
            throw HttpException::notFound();
        }
        $path = $this->backupDirectory() . '/' . basename((string) $backup['filename']);
        if (!is_file($path)) {
            throw HttpException::notFound();
        }
        $body = file_get_contents($path);

        return new Response(200, [
            'Content-Type' => 'application/vnd.sqlite3',
            'Content-Disposition' => 'attachment; filename="' . addslashes((string) $backup['filename']) . '"',
        ], $body === false ? '' : $body);
    }

    public function deleteBackup(Request $request, int $id): Response
    {
        $backup = $this->fetchOne('SELECT * FROM backup_records WHERE id = :id', ['id' => $id]);
        if ($backup === null) {
            throw HttpException::notFound();
        }
        $path = $this->backupDirectory() . '/' . basename((string) $backup['filename']);
        if (is_file($path)) {
            @unlink($path);
        }
        $this->execute('DELETE FROM backup_records WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'operations', 'backup.delete', 'backup', $id, $backup);

        return Response::noContent();
    }

    public function restore(Request $request): Response
    {
        $source = null;
        $temporary = null;
        $backupId = $this->intInput($request, 'backupId');
        if ($backupId !== null) {
            $backup = $this->fetchOne('SELECT * FROM backup_records WHERE id = :id', ['id' => $backupId]);
            if ($backup === null) {
                throw HttpException::validation(['backupId' => 'validation.invalid']);
            }
            $source = $this->backupDirectory() . '/' . basename((string) $backup['filename']);
            if (!is_file($source)) {
                throw HttpException::notFound();
            }
        } else {
            $data = (string) $request->input('dataUrl', '');
            if (!preg_match('/^data:application\/(?:x-sqlite3|vnd\.sqlite3|octet-stream);base64,([A-Za-z0-9+\/=\s]+)$/', $data, $matches)) {
                throw HttpException::validation(['dataUrl' => 'validation.invalid']);
            }
            $binary = base64_decode(preg_replace('/\s+/', '', $matches[1]) ?? '', true);
            if ($binary === false || strlen($binary) > 200 * 1024 * 1024 || !str_starts_with($binary, "SQLite format 3\0")) {
                throw HttpException::validation(['dataUrl' => 'operations.invalidBackup']);
            }
            $temporary = $this->backupDirectory() . '/restore-' . bin2hex(random_bytes(8)) . '.sqlite';
            file_put_contents($temporary, $binary);
            $source = $temporary;
        }

        try {
            $this->restoreFrom($source);
        } finally {
            if ($temporary !== null && is_file($temporary)) {
                @unlink($temporary);
            }
        }

        $this->auditService->record(
            null,
            'backup.restore',
            'operations',
            'backup',
            $backupId,
            null,
            ['source' => $backupId === null ? 'upload' : 'stored'],
            $request->ip,
            $request->userAgent,
        );

        return Response::json(['restored' => true, 'message' => 'The database was restored. Sign in again if your session was replaced.']);
    }

    private function restoreFrom(string $source): void
    {
        if (!is_file($source)) {
            throw HttpException::notFound();
        }
        $backup = new PDO('sqlite:' . $source, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        try {
            $backup->query('SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'schema_migrations\' LIMIT 1');
            $migrations = $backup->query('SELECT COUNT(*) FROM schema_migrations')->fetchColumn();
            if ($migrations === false || (int) $migrations === 0) {
                throw HttpException::validation(['dataUrl' => 'operations.invalidBackup']);
            }
            $mainTables = $this->db->query('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name')->fetchAll(PDO::FETCH_COLUMN);
            $backupTables = $backup->query('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name')->fetchAll(PDO::FETCH_COLUMN);
            foreach ($mainTables as $table) {
                if (!in_array($table, $backupTables, true)) {
                    throw HttpException::validation(['dataUrl' => 'operations.incompatibleBackup']);
                }
                $mainColumns = array_column($this->db->query('PRAGMA table_info(' . $this->quoteIdentifier($table) . ')')->fetchAll(), 'name');
                $backupColumns = array_column($backup->query('PRAGMA table_info(' . $this->quoteIdentifier($table) . ')')->fetchAll(), 'name');
                if ($mainColumns !== $backupColumns) {
                    throw HttpException::validation(['dataUrl' => 'operations.incompatibleBackup']);
                }
            }
        } finally {
            $backup = null;
        }

        $this->db->exec('PRAGMA foreign_keys = OFF');
        $this->db->beginTransaction();
        try {
            $this->db->exec('ATTACH DATABASE ' . $this->db->quote($source) . ' AS restore_db');
            $tables = $this->db->query('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name')->fetchAll(PDO::FETCH_COLUMN);
            foreach ($tables as $table) {
                if ($table === 'schema_migrations' || $table === 'seeders') {
                    continue;
                }
                $quoted = $this->quoteIdentifier($table);
                $this->db->exec('DELETE FROM main.' . $quoted);
                $this->db->exec('INSERT INTO main.' . $quoted . ' SELECT * FROM restore_db.' . $quoted);
            }
            $this->db->exec('DETACH DATABASE restore_db');
            $this->db->commit();
        } catch (\Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            try {
                $this->db->exec('DETACH DATABASE restore_db');
            } catch (\Throwable) {
                // Already detached.
            }
            throw $exception;
        } finally {
            $this->db->exec('PRAGMA foreign_keys = ON');
        }
    }

    private function backupDirectory(): string
    {
        $directory = $this->config['storage']['path'] . '/backups';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException('Unable to create backup directory.');
        }

        return $directory;
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }
}