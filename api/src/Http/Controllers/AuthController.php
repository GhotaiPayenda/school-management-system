<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Auth\AuthService;
use Meridian\Api\Auth\SessionService;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Http\Middleware\AuthMiddleware;

final class AuthController
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly SessionService $sessions,
    ) {
    }

    public function csrf(Request $request): Response
    {
        $result = $this->sessions->ensureAnonymous($request);

        return Response::json(
            ['csrfToken' => $result['context']->csrfToken],
            200,
            ['Set-Cookie' => $this->sessions->cookieHeader($result['token'])],
        );
    }

    public function login(Request $request): Response
    {
        $result = $this->auth->login($request);

        return Response::json(
            $result['payload'],
            200,
            ['Set-Cookie' => $this->sessions->cookieHeader($result['token'])],
        );
    }

    public function me(Request $request): Response
    {
        return Response::json($this->auth->buildPayload(AuthMiddleware::context($request)));
    }

    public function changePassword(Request $request): Response
    {
        $result = $this->auth->changePassword($request, AuthMiddleware::context($request));

        return Response::json(
            $result['payload'],
            200,
            ['Set-Cookie' => $this->sessions->cookieHeader($result['token'])],
        );
    }

    public function logout(Request $request): Response
    {
        $this->sessions->destroy($request);

        return Response::noContent([
            'Set-Cookie' => $this->sessions->expiredCookieHeader(),
        ]);
    }
}
