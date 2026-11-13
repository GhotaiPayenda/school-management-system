<?php

declare(strict_types=1);

namespace Meridian\Api\Access;

use PDO;

final class RoleRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function allWithPermissions(): array
    {
        $roles = $this->pdo->query(
            'SELECT id, slug, name, description FROM roles ORDER BY id ASC',
        )->fetchAll();

        $permissions = $this->pdo->query(
            'SELECT role_permissions.role_id, permissions.slug
             FROM role_permissions
             INNER JOIN permissions ON permissions.id = role_permissions.permission_id
             ORDER BY permissions.slug ASC',
        )->fetchAll();

        $byRole = [];

        foreach ($permissions as $permission) {
            $byRole[(int) $permission['role_id']][] = (string) $permission['slug'];
        }

        return array_map(static function (array $role) use ($byRole): array {
            return [
                'id' => (int) $role['id'],
                'slug' => (string) $role['slug'],
                'name' => (string) $role['name'],
                'description' => $role['description'],
                'permissions' => $byRole[(int) $role['id']] ?? [],
            ];
        }, $roles);
    }
}
