<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

final class Router
{
    /** @var list<Route> */
    private array $routes = [];

    /**
     * @param list<string> $middleware
     */
    public function add(string $method, string $pattern, mixed $handler, array $middleware = []): void
    {
        $this->routes[] = new Route(strtoupper($method), $pattern, $handler, $middleware);
    }

    /**
     * @param list<string> $middleware
     */
    public function get(string $pattern, mixed $handler, array $middleware = []): void
    {
        $this->add('GET', $pattern, $handler, $middleware);
    }

    /**
     * @param list<string> $middleware
     */
    public function post(string $pattern, mixed $handler, array $middleware = []): void
    {
        $this->add('POST', $pattern, $handler, $middleware);
    }

    /**
     * @param list<string> $middleware
     */
    public function put(string $pattern, mixed $handler, array $middleware = []): void
    {
        $this->add('PUT', $pattern, $handler, $middleware);
    }

    /**
     * @param list<string> $middleware
     */
    public function patch(string $pattern, mixed $handler, array $middleware = []): void
    {
        $this->add('PATCH', $pattern, $handler, $middleware);
    }

    /**
     * @param list<string> $middleware
     */
    public function delete(string $pattern, mixed $handler, array $middleware = []): void
    {
        $this->add('DELETE', $pattern, $handler, $middleware);
    }

    /**
     * @return array{route: Route, params: array<string, string>}
     */
    public function match(string $method, string $path): array
    {
        $allowed = [];

        foreach ($this->routes as $route) {
            if (!preg_match($route->regex, $path, $matches)) {
                continue;
            }

            if ($route->method !== $method) {
                $allowed[$route->method] = true;
                continue;
            }

            $params = [];

            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = rawurldecode($value);
                }
            }

            return ['route' => $route, 'params' => $params];
        }

        if ($allowed !== []) {
            throw HttpException::methodNotAllowed();
        }

        throw HttpException::notFound();
    }
}
