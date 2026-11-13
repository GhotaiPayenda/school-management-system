<?php

declare(strict_types=1);

/**
 * Router script for PHP's built-in server.
 *
 * - /api/* always reaches the PHP front controller.
 * - Built SPA assets are served from web/dist.
 * - Unknown non-API paths fall back to the SPA entry point so client routing works.
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/index.php';

    return true;
}

if ($path !== '/') {
    $publicRoot = realpath(__DIR__);
    $direct = realpath(__DIR__ . $path);

    if (
        $publicRoot !== false
        && $direct !== false
        && is_file($direct)
        && str_starts_with(str_replace('\\', '/', $direct), str_replace('\\', '/', $publicRoot) . '/')
    ) {
        return false;
    }
}

$dist = getenv('MERIDIAN_WEB_DIST') ?: dirname(__DIR__, 2) . '/web/dist';
$distReal = realpath($dist);
$candidate = realpath($dist . $path);

if (
    $distReal !== false
    && $candidate !== false
    && is_file($candidate)
    && str_starts_with(str_replace('\\', '/', $candidate), str_replace('\\', '/', $distReal) . '/')
) {
    $extension = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));
    $types = [
        'html' => 'text/html; charset=utf-8',
        'js' => 'text/javascript; charset=utf-8',
        'mjs' => 'text/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'woff2' => 'font/woff2',
        'ico' => 'image/x-icon',
    ];

    header('Content-Type: ' . ($types[$extension] ?? 'application/octet-stream'));
    readfile($candidate);

    return true;
}

if ($distReal !== false && is_file($distReal . '/index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($distReal . '/index.html');

    return true;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'error' => [
        'code' => 'not_found',
        'messageKey' => 'errors.notFound',
        'message' => 'The requested resource was not found.',
    ],
], JSON_UNESCAPED_SLASHES);

return true;
