<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

use PDO;
use RuntimeException;

final class Migrator
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $directory,
    ) {
    }

    /**
     * @return list<string> Migration file names applied in this run.
     */
    public function run(): array
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                migration TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )',
        );

        $applied = $this->pdo->query('SELECT migration FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
        $applied = array_flip($applied);

        $files = glob(rtrim($this->directory, '/\\') . '/*.sql') ?: [];
        sort($files, SORT_STRING);

        $ran = [];

        foreach ($files as $file) {
            $name = basename($file);

            if (isset($applied[$name])) {
                continue;
            }

            $sql = file_get_contents($file);
            if ($sql === false) {
                throw new RuntimeException("Unable to read migration [{$name}].");
            }

            $this->pdo->beginTransaction();

            try {
                $this->pdo->exec($sql);
                $statement = $this->pdo->prepare(
                    'INSERT INTO schema_migrations (migration, applied_at) VALUES (:migration, :applied_at)',
                );
                $statement->execute([
                    'migration' => $name,
                    'applied_at' => gmdate('Y-m-d\TH:i:s\Z'),
                ]);
                $this->pdo->commit();
                $ran[] = $name;
            } catch (\Throwable $exception) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }

                throw new RuntimeException("Migration [{$name}] failed: {$exception->getMessage()}", 0, $exception);
            }
        }

        return $ran;
    }
}
