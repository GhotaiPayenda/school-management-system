<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Http\Middleware\AuthMiddleware;

final class DashboardController
{
    public function show(Request $request): Response
    {
        $user = AuthMiddleware::context($request)->user;

        return Response::json([
            'greeting' => 'Welcome back, ' . ($user?->name ?? 'there') . '.',
            'role' => [
                'slug' => $user?->roleSlug,
                'name' => $user?->roleName,
            ],
            'cards' => [
                ['key' => 'students', 'label' => 'Students', 'value' => null, 'hint' => 'Available in a later ticket'],
                ['key' => 'attendance', 'label' => "Today's attendance", 'value' => null, 'hint' => 'Available in a later ticket'],
                ['key' => 'collection', 'label' => 'Fee collection', 'value' => null, 'hint' => 'Available in a later ticket'],
                ['key' => 'pending', 'label' => 'Pending tasks', 'value' => null, 'hint' => 'Available in a later ticket'],
            ],
            'activity' => [],
        ]);
    }
}
