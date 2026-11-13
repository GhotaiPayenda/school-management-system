<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Middleware;

use Meridian\Api\Auth\SessionContext;
use Meridian\Api\Auth\SessionService;
use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\MiddlewareInterface;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;

final class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly SessionService $sessions)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        $context = $this->sessions->resolve($request);

        if ($context === null || !$context->isAuthenticated()) {
            throw HttpException::unauthorized();
        }

        return $next($request->withAttribute('auth', $context));
    }

    public static function context(Request $request): SessionContext
    {
        $context = $request->attribute('auth');

        if (!$context instanceof SessionContext) {
            throw HttpException::unauthorized();
        }

        return $context;
    }
}
