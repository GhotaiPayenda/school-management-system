<?php

declare(strict_types=1);

if (!defined('MERIDIAN_BASE_PATH')) {
    define('MERIDIAN_BASE_PATH', dirname(__DIR__));
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'Meridian\\Api\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require_once $file;
    }
});

$config = require __DIR__ . '/config.php';

return Meridian\Api\Support\AppFactory::build($config);
