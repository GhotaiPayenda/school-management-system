<?php

declare(strict_types=1);

use Meridian\Api\Support\DefaultCredentials;

return static function (\PDO $pdo): void {
    $email = strtolower(trim(getenv('MERIDIAN_ADMIN_EMAIL') ?: DefaultCredentials::ADMIN_EMAIL));
    $password = getenv('MERIDIAN_ADMIN_PASSWORD') ?: DefaultCredentials::ADMIN_PASSWORD;

    $statement = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);

    if ($statement->fetchColumn() !== false) {
        return;
    }

    $roleStatement = $pdo->prepare('SELECT id FROM roles WHERE slug = :slug LIMIT 1');
    $roleStatement->execute(['slug' => 'super-admin']);
    $roleId = $roleStatement->fetchColumn();

    if ($roleId === false) {
        throw new \RuntimeException('The super-admin Role must exist before seeding the Super Admin User.');
    }

    $now = gmdate('Y-m-d\TH:i:s\Z');
    $insert = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, role_id, status, must_change_password, created_at, updated_at)
         VALUES (:name, :email, :password_hash, :role_id, :status, 1, :created_at, :updated_at)',
    );
    $insert->execute([
        'name' => DefaultCredentials::ADMIN_NAME,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role_id' => (int) $roleId,
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
};
