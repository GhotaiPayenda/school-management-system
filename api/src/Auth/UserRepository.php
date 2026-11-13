<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

use PDO;

final class UserRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findByEmail(string $email): ?User
    {
        $statement = $this->pdo->prepare(
            'SELECT users.*, roles.slug AS role_slug, roles.name AS role_name
             FROM users
             INNER JOIN roles ON roles.id = users.role_id
             WHERE users.email = :email
             LIMIT 1',
        );
        $statement->execute(['email' => $email]);
        $row = $statement->fetch();

        return $row === false ? null : $this->map($row);
    }

    public function findById(int $id): ?User
    {
        $statement = $this->pdo->prepare(
            'SELECT users.*, roles.slug AS role_slug, roles.name AS role_name
             FROM users
             INNER JOIN roles ON roles.id = users.role_id
             WHERE users.id = :id
             LIMIT 1',
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $this->map($row);
    }

    /**
     * @return list<string>
     */
    public function permissionsForRole(int $roleId): array
    {
        $statement = $this->pdo->prepare(
            'SELECT permissions.slug
             FROM permissions
             INNER JOIN role_permissions ON role_permissions.permission_id = permissions.id
             WHERE role_permissions.role_id = :role_id
             ORDER BY permissions.slug ASC',
        );
        $statement->execute(['role_id' => $roleId]);

        return $statement->fetchAll(PDO::FETCH_COLUMN);
    }

    public function roleIdBySlug(string $slug): ?int
    {
        $statement = $this->pdo->prepare('SELECT id FROM roles WHERE slug = :slug LIMIT 1');
        $statement->execute(['slug' => $slug]);
        $id = $statement->fetchColumn();

        return $id === false ? null : (int) $id;
    }

    public function create(
        string $name,
        string $email,
        string $passwordHash,
        int $roleId,
        bool $mustChangePassword,
    ): int {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $statement = $this->pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role_id, status, must_change_password, created_at, updated_at)
             VALUES (:name, :email, :password_hash, :role_id, :status, :must_change_password, :created_at, :updated_at)',
        );
        $statement->execute([
            'name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash,
            'role_id' => $roleId,
            'status' => 'active',
            'must_change_password' => $mustChangePassword ? 1 : 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function passwordHash(int $userId): string
    {
        $statement = $this->pdo->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $userId]);
        $hash = $statement->fetchColumn();

        return $hash === false ? '' : (string) $hash;
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE users
             SET password_hash = :password_hash,
                 must_change_password = 0,
                 updated_at = :updated_at
             WHERE id = :id',
        );
        $statement->execute([
            'password_hash' => $passwordHash,
            'updated_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'id' => $userId,
        ]);
    }

    public function markLogin(int $userId): void
    {
        $statement = $this->pdo->prepare('UPDATE users SET last_login_at = :last_login_at WHERE id = :id');
        $statement->execute([
            'last_login_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'id' => $userId,
        ]);
    }

    /**
     * @param array<string, mixed> $row
     */
    private function map(array $row): User
    {
        return new User(
            (int) $row['id'],
            (string) $row['name'],
            (string) $row['email'],
            (int) $row['role_id'],
            (string) $row['role_slug'],
            (string) $row['role_name'],
            (bool) $row['must_change_password'],
            (string) $row['status'],
        );
    }
}
