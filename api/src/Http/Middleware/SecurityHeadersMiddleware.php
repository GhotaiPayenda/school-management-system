<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Middleware;

use Meridian\Api\Core\MiddlewareInterface;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;

final class SecurityHeadersMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        return self::decorate($next($request));
    }

    public static function decorate(Response $response): Response
    {
        return $response->withHeaders([
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'no-referrer',
            'Cache-Control' => 'no-store',
        ]);
    }
}
