<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $email,
        public readonly int $roleId,
        public readonly string $roleSlug,
        public readonly string $roleName,
        public readonly bool $mustChangePassword,
        public readonly string $status,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'mustChangePassword' => $this->mustChangePassword,
            'status' => $this->status,
        ];
    }
}
