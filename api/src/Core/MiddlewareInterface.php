<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

interface MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response;
}
