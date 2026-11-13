<?php

declare(strict_types=1);

$environment = getenv('MERIDIAN_ENV') ?: 'local';
$databasePath = getenv('MERIDIAN_DB_PATH') ?: MERIDIAN_BASE_PATH . '/storage/meridian.sqlite';
$storagePath = getenv('MERIDIAN_STORAGE_PATH') ?: MERIDIAN_BASE_PATH . '/storage';

return [
    'app' => [
        'name' => 'Meridian Academy',
        'version' => '0.1.0',
        'environment' => $environment,
        'debug' => $environment === 'local',
        'api_prefix' => '/api/v1',
    ],
    'database' => [
        'path' => $databasePath,
        'busy_timeout_ms' => 5000,
    ],
    'storage' => [
        'path' => $storagePath,
    ],
    'session' => [
        'cookie' => 'meridian_session',
        'lifetime_seconds' => 8 * 60 * 60,
        'anonymous_lifetime_seconds' => 60 * 60,
        'secure' => getenv('MERIDIAN_SECURE_COOKIES') === '1',
    ],
    'login_rate_limit' => [
        'max_attempts' => 5,
        'window_seconds' => 15 * 60,
    ],
    'paths' => [
        'migrations' => MERIDIAN_BASE_PATH . '/database/migrations',
        'seeders' => MERIDIAN_BASE_PATH . '/database/seeders',
        'web_dist' => getenv('MERIDIAN_WEB_DIST') ?: MERIDIAN_BASE_PATH . '/web/dist',
    ],
];
