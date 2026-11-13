<?php

declare(strict_types=1);

$container = require dirname(__DIR__) . '/bootstrap.php';

$container->get(Meridian\Api\Core\Application::class)->run();
