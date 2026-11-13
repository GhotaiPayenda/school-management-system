<?php

declare(strict_types=1);

namespace Meridian\Api\Support;

use RuntimeException;

/**
 * Minimal service container. Dependencies are wired once in AppFactory so that
 * controllers, repositories, and middleware never reach for globals.
 */
final class Container
{
    /** @var array<string, callable> */
    private array $factories = [];

    /** @var array<string, mixed> */
    private array $instances = [];

    public function set(string $id, callable $factory): void
    {
        $this->factories[$id] = $factory;
    }

    public function has(string $id): bool
    {
        return isset($this->factories[$id]) || array_key_exists($id, $this->instances);
    }

    public function get(string $id): mixed
    {
        if (array_key_exists($id, $this->instances)) {
            return $this->instances[$id];
        }

        if (!isset($this->factories[$id])) {
            throw new RuntimeException("Service [{$id}] is not registered.");
        }

        $instance = $this->factories[$id]($this);
        $this->instances[$id] = $instance;

        return $instance;
    }
}
