<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

final class SessionContext
{
    /**
     * @param list<string> $permissions
     */
    public function __construct(
        public readonly int $sessionId,
        public readonly string $csrfToken,
        public readonly ?User $user,
        public readonly array $permissions = [],
    ) {
    }

    public function isAuthenticated(): bool
    {
        return $this->user !== null;
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions, true);
    }
}
