<?php

declare(strict_types=1);

/**
 * Test-only fixtures. The production seeder creates exactly one Super Admin;
 * tests add a Teacher so RBAC can be asserted against a second Role.
 */

use Meridian\Api\Auth\UserRepository;
use Meridian\Api\Support\DefaultCredentials;

$container = require dirname(__DIR__, 3) . '/api/bootstrap.php';

/** @var UserRepository $users */
$users = $container->get(UserRepository::class);

if ($users->findByEmail(DefaultCredentials::TEACHER_EMAIL) !== null) {
    echo "Fixture already present.\n";
    exit(0);
}

$roleId = $users->roleIdBySlug('teacher');

if ($roleId === null) {
    fwrite(STDERR, "The teacher Role is missing. Run scripts/db.php setup first.\n");
    exit(1);
}

$users->create(
    DefaultCredentials::TEACHER_NAME,
    DefaultCredentials::TEACHER_EMAIL,
    password_hash(DefaultCredentials::TEACHER_PASSWORD, PASSWORD_DEFAULT),
    $roleId,
    false,
);

echo 'Fixture created: ' . DefaultCredentials::TEACHER_EMAIL . "\n";
