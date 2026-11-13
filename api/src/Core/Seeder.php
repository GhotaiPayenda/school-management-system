<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

use PDO;
use RuntimeException;

final class Seeder
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $directory,
    ) {
    }

    /**
     * @return list<string> Seeder file names applied in this run.
     */
    public function run(): array
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS seeders (
                seeder TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )',
        );

        $applied = $this->pdo->query('SELECT seeder FROM seeders')->fetchAll(PDO::FETCH_COLUMN);
        $applied = array_flip($applied);

        $files = glob(rtrim($this->directory, '/\\') . '/*.php') ?: [];
        sort($files, SORT_STRING);

        $ran = [];

        foreach ($files as $file) {
            $name = basename($file);

            if (isset($applied[$name])) {
                continue;
            }

            $seeder = require $file;

            if (!is_callable($seeder)) {
                throw new RuntimeException("Seeder [{$name}] must return a callable.");
            }

            $this->pdo->beginTransaction();

            try {
                $seeder($this->pdo);
                $statement = $this->pdo->prepare(
                    'INSERT INTO seeders (seeder, applied_at) VALUES (:seeder, :applied_at)',
                );
                $statement->execute([
                    'seeder' => $name,
                    'applied_at' => gmdate('Y-m-d\TH:i:s\Z'),
                ]);
                $this->pdo->commit();
                $ran[] = $name;
            } catch (\Throwable $exception) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }

                throw new RuntimeException("Seeder [{$name}] failed: {$exception->getMessage()}", 0, $exception);
            }
        }

        return $ran;
    }
}
