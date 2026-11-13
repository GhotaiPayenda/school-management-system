<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Middleware;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\MiddlewareInterface;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;

final class PermissionMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly string $permission)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        $context = AuthMiddleware::context($request);

        if (!$context->hasPermission($this->permission)) {
            throw HttpException::forbidden(
                'auth.missingPermission',
                'You do not have permission to do that.',
            );
        }

        return $next($request);
    }
}
