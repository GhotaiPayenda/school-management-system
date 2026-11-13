<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Access\RoleRepository;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;

final class RoleController
{
    public function __construct(private readonly RoleRepository $roles)
    {
    }

    public function index(Request $request): Response
    {
        return Response::json(['roles' => $this->roles->allWithPermissions()]);
    }
}
