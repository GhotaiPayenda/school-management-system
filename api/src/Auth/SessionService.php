<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

use Meridian\Api\Core\Request;

final class SessionService
{
    /**
     * @param array{cookie: string, lifetime_seconds: int, anonymous_lifetime_seconds: int, secure: bool} $config
     */
    public function __construct(
        private readonly SessionRepository $sessions,
        private readonly UserRepository $users,
        private readonly array $config,
    ) {
    }

    public function resolve(Request $request): ?SessionContext
    {
        $token = $request->cookie($this->config['cookie']);

        if ($token === null || $token === '') {
            return null;
        }

        $tokenHash = hash('sha256', $token);
        $row = $this->sessions->findByTokenHash($tokenHash);

        if ($row === null) {
            return null;
        }

        if ($this->isExpired((string) $row['expires_at'])) {
            $this->sessions->delete((int) $row['id']);

            return null;
        }

        if ($row['user_id'] === null) {
            $this->sessions->touch((int) $row['id'], $this->expiry($this->config['anonymous_lifetime_seconds']));

            return new SessionContext((int) $row['id'], (string) $row['csrf_token'], null, []);
        }

        $user = $this->users->findById((int) $row['user_id']);

        if ($user === null || $user->status !== 'active') {
            $this->sessions->delete((int) $row['id']);

            return null;
        }

        $this->sessions->touch((int) $row['id'], $this->expiry($this->config['lifetime_seconds']));

        return new SessionContext(
            (int) $row['id'],
            (string) $row['csrf_token'],
            $user,
            $this->users->permissionsForRole($user->roleId),
        );
    }

    /**
     * Returns the current session, creating an anonymous CSRF-only session when
     * the client does not have one yet.
     *
     * @return array{context: SessionContext, token: string}
     */
    public function ensureAnonymous(Request $request): array
    {
        $context = $this->resolve($request);

        if ($context !== null) {
            return ['context' => $context, 'token' => (string) $request->cookie($this->config['cookie'])];
        }

        return $this->create(null, $request);
    }

    /**
     * Issues a fresh session for a user and rotates out the previous token.
     *
     * @return array{context: SessionContext, token: string}
     */
    public function createForUser(int $userId, Request $request): array
    {
        $user = $this->users->findById($userId);

        if ($user === null) {
            throw new \RuntimeException('Cannot create a session for an unknown user.');
        }

        $this->forgetCurrent($request);

        return $this->create($userId, $request);
    }

    /**
     * Rotates the session token without changing the authenticated user.
     *
     * @return array{context: SessionContext, token: string}
     */
    public function rotate(Request $request, int $userId): array
    {
        $this->forgetCurrent($request);

        return $this->create($userId, $request);
    }

    public function deleteForUser(int $userId): void
    {
        $this->sessions->deleteForUser($userId);
    }

    public function destroy(Request $request): void
    {
        $token = $request->cookie($this->config['cookie']);

        if ($token !== null && $token !== '') {
            $this->sessions->deleteByTokenHash(hash('sha256', $token));
        }
    }

    public function cookieHeader(string $token): string
    {
        $parts = [
            $this->config['cookie'] . '=' . rawurlencode($token),
            'Path=/',
            'HttpOnly',
            'SameSite=Lax',
        ];

        if ($this->config['secure']) {
            $parts[] = 'Secure';
        }

        return implode('; ', $parts);
    }

    public function expiredCookieHeader(): string
    {
        $parts = [
            $this->config['cookie'] . '=',
            'Path=/',
            'HttpOnly',
            'SameSite=Lax',
            'Max-Age=0',
            'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        ];

        if ($this->config['secure']) {
            $parts[] = 'Secure';
        }

        return implode('; ', $parts);
    }

    /**
     * @return array{context: SessionContext, token: string}
     */
    private function create(?int $userId, Request $request): array
    {
        $lifetime = $userId === null
            ? $this->config['anonymous_lifetime_seconds']
            : $this->config['lifetime_seconds'];

        $token = bin2hex(random_bytes(32));
        $csrfToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expiresAt = $this->expiry($lifetime);

        $sessionId = $this->sessions->create(
            $tokenHash,
            $csrfToken,
            $userId,
            $request->ip,
            $request->userAgent,
            $expiresAt,
        );

        $user = $userId === null ? null : $this->users->findById($userId);
        $permissions = $user === null ? [] : $this->users->permissionsForRole($user->roleId);

        return [
            'context' => new SessionContext($sessionId, $csrfToken, $user, $permissions),
            'token' => $token,
        ];
    }

    private function forgetCurrent(Request $request): void
    {
        $token = $request->cookie($this->config['cookie']);

        if ($token !== null && $token !== '') {
            $this->sessions->deleteByTokenHash(hash('sha256', $token));
        }
    }

    private function expiry(int $lifetimeSeconds): string
    {
        return gmdate('Y-m-d\TH:i:s\Z', time() + $lifetimeSeconds);
    }

    private function isExpired(string $expiresAt): bool
    {
        $timestamp = strtotime($expiresAt);

        return $timestamp === false || $timestamp <= time();
    }
}
