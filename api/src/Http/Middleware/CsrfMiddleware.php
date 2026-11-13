<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Middleware;

use Meridian\Api\Auth\SessionService;
use Meridian\Api\Core\MiddlewareInterface;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Core\HttpException;

final class CsrfMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly SessionService $sessions)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        if (!$request->isStateChanging()) {
            return $next($request);
        }

        $session = $this->sessions->resolve($request);

        if ($session === null) {
            throw new HttpException(
                403,
                'csrf_token_missing',
                'auth.csrfMissing',
                'Your session is missing. Refresh the page and try again.',
            );
        }

        $provided = $request->header('x-csrf-token');

        if ($provided === null || !hash_equals($session->csrfToken, $provided)) {
            throw new HttpException(
                403,
                'csrf_token_invalid',
                'auth.csrfInvalid',
                'The security token is invalid. Refresh the page and try again.',
            );
        }

        return $next($request->withAttribute('csrfSession', $session));
    }
}
