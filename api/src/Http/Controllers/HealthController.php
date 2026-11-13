<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;

final class HealthController
{
    /**
     * @param array{app: array<string, mixed>, storage: array{path: string}} $config
     */
    public function __construct(
        private readonly \PDO $pdo,
        private readonly array $config,
    ) {
    }

    public function show(Request $request): Response
    {
        $checks = [
            'database' => 'ok',
            'storage' => 'ok',
        ];

        try {
            $this->pdo->query('SELECT 1')->fetchColumn();
        } catch (\Throwable) {
            $checks['database'] = 'error';
        }

        $storagePath = $this->config['storage']['path'];

        if (!is_dir($storagePath) && !@mkdir($storagePath, 0775, true) && !is_dir($storagePath)) {
            $checks['storage'] = 'error';
        } elseif (!is_writable($storagePath)) {
            $checks['storage'] = 'error';
        }

        $healthy = !in_array('error', $checks, true);

        return Response::json([
            'status' => $healthy ? 'ok' : 'degraded',
            'version' => $this->config['app']['version'],
            'time' => gmdate('Y-m-d\TH:i:s\Z'),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }
}
