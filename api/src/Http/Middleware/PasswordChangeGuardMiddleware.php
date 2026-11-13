<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Middleware;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\MiddlewareInterface;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;

final class PasswordChangeGuardMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $context = AuthMiddleware::context($request);

        if ($context->user?->mustChangePassword === true) {
            throw new HttpException(
                403,
                'password_change_required',
                'auth.passwordChangeRequired',
                'Change your temporary password before continuing.',
            );
        }

        return $next($request);
    }
}
