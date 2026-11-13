<?php

declare(strict_types=1);

/**
 * CLI: database migrations and seeders.
 *
 * Usage:
 *   php scripts/db.php setup
 *   php scripts/db.php migrate
 *   php scripts/db.php seed
 *   php scripts/db.php fresh
 *   php scripts/db.php status
 *
 * Options:
 *   --database=<path>  Override the SQLite file.
 *   --storage=<path>   Override the runtime storage directory.
 */

use Meridian\Api\Core\Migrator;
use Meridian\Api\Core\Seeder;
use Meridian\Api\Support\DefaultCredentials;

$options = [];
$command = null;

foreach (array_slice($argv, 1) as $argument) {
    if (str_starts_with($argument, '--')) {
        [$key, $value] = array_pad(explode('=', substr($argument, 2), 2), 2, 'true');
        $options[$key] = $value;
        continue;
    }

    $command ??= $argument;
}

$command ??= 'help';

if (isset($options['database'])) {
    putenv('MERIDIAN_DB_PATH=' . $options['database']);
    $_ENV['MERIDIAN_DB_PATH'] = $options['database'];
    $_SERVER['MERIDIAN_DB_PATH'] = $options['database'];
}

if (isset($options['storage'])) {
    putenv('MERIDIAN_STORAGE_PATH=' . $options['storage']);
    $_ENV['MERIDIAN_STORAGE_PATH'] = $options['storage'];
    $_SERVER['MERIDIAN_STORAGE_PATH'] = $options['storage'];
}

// Delete the database before the bootstrap opens a PDO connection. Windows
// cannot unlink a file that SQLite still has open, so doing this after the
// container is built would silently leave an old database in place.
$requestedDatabasePath = $options['database']
    ?? (getenv('MERIDIAN_DB_PATH') ?: dirname(__DIR__) . '/storage/meridian.sqlite');

if ($command === 'fresh') {
    foreach ([$requestedDatabasePath, $requestedDatabasePath . '-wal', $requestedDatabasePath . '-shm'] as $file) {
        if (!is_file($file)) {
            continue;
        }

        if (!@unlink($file)) {
            fwrite(STDERR, "Could not delete [{$file}]. Stop any process using the database and try again.\n");
            exit(1);
        }
    }
}

$container = require dirname(__DIR__) . '/api/bootstrap.php';

$config = $container->get('config');
$pdo = $container->get(PDO::class);

$databasePath = $config['database']['path'];

$runMigrations = static function () use ($pdo, $config): void {
    $migrator = new Migrator($pdo, $config['paths']['migrations']);
    $applied = $migrator->run();
    echo $applied === []
        ? "Migrations: already up to date.\n"
        : 'Migrations applied: ' . implode(', ', $applied) . "\n";
};

$runSeeders = static function () use ($pdo, $config): void {
    $seeder = new Seeder($pdo, $config['paths']['seeders']);
    $applied = $seeder->run();
    echo $applied === []
        ? "Seeders: already applied.\n"
        : 'Seeders applied: ' . implode(', ', $applied) . "\n";

    $adminEmail = getenv('MERIDIAN_ADMIN_EMAIL') ?: DefaultCredentials::ADMIN_EMAIL;
    $adminPassword = getenv('MERIDIAN_ADMIN_PASSWORD') ?: DefaultCredentials::ADMIN_PASSWORD;

    echo 'Super Admin: ' . $adminEmail . ' / ' . $adminPassword
        . " (temporary password; change is forced on first sign-in)\n";
};

try {
    switch ($command) {
        case 'migrate':
            $runMigrations();
            break;

        case 'seed':
            $runSeeders();
            break;

        case 'setup':
            $runMigrations();
            $runSeeders();
            echo "Database ready: {$databasePath}\n";
            break;

        case 'fresh':
            $runMigrations();
            $runSeeders();
            echo "Database rebuilt: {$databasePath}\n";
            break;

        case 'status':
            $migrations = $pdo->query('SELECT COUNT(*) FROM schema_migrations')->fetchColumn();
            $seeders = $pdo->query('SELECT COUNT(*) FROM seeders')->fetchColumn();
            $users = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
            echo "Database: {$databasePath}\n";
            echo "Migrations applied: {$migrations}\n";
            echo "Seeders applied: {$seeders}\n";
            echo "Users: {$users}\n";
            break;

        case 'help':
        default:
            echo <<<TEXT
Meridian Academy database tool

  php scripts/db.php setup     Run migrations and seeders
  php scripts/db.php migrate   Run pending migrations
  php scripts/db.php seed      Run pending seeders
  php scripts/db.php fresh     Delete the database and rebuild it
  php scripts/db.php status    Show database state

Options:
  --database=<path>            Override the SQLite file
  --storage=<path>             Override the storage directory

TEXT;
            break;
    }
} catch (Throwable $exception) {
    fwrite(STDERR, 'Database command failed: ' . $exception->getMessage() . "\n");
    exit(1);
}
