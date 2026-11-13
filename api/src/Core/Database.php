<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

use PDO;

final class Database
{
    /**
     * @param array{path: string, busy_timeout_ms: int} $config
     */
    public static function connect(array $config): PDO
    {
        $path = $config['path'];
        $directory = dirname($path);

        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException("Unable to create database directory [{$directory}].");
        }

        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        $busyTimeout = (int) ($config['busy_timeout_ms'] ?? 5000);

        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = ' . $busyTimeout);
        $pdo->exec('PRAGMA synchronous = NORMAL');

        return $pdo;
    }
}
