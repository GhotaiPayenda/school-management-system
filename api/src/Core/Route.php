<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

final class Route
{
    public readonly string $regex;

    /**
     * @param list<string> $middleware Middleware aliases resolved by the Application.
     */
    public function __construct(
        public readonly string $method,
        public readonly string $pattern,
        public readonly mixed $handler,
        public readonly array $middleware = [],
    ) {
        $regex = preg_replace(
            '#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#',
            '(?P<$1>[^/]+)',
            $pattern,
        );

        $this->regex = '#^' . $regex . '$#';
    }
}
