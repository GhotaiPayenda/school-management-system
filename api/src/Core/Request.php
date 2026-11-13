<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

final class Request
{
    /**
     * @param array<string, mixed> $query
     * @param array<string, string> $headers Lower-cased header names.
     * @param array<string, mixed>|null $body
     * @param array<string, mixed> $attributes
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $headers,
        public readonly ?array $body,
        public readonly string $ip,
        public readonly string $userAgent,
        private array $attributes = [],
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        $headers = [];
        foreach (self::readHeaders() as $name => $value) {
            $headers[strtolower($name)] = $value;
        }

        $body = null;
        $contentType = strtolower($headers['content-type'] ?? '');

        if ($method !== 'GET' && $method !== 'HEAD' && str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');

            if ($raw !== false && trim($raw) !== '') {
                try {
                    $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
                } catch (\JsonException) {
                    throw HttpException::badRequest('invalid_json', 'errors.invalidJson', 'The request body is not valid JSON.');
                }

                if (!is_array($decoded)) {
                    throw HttpException::badRequest('invalid_json', 'errors.invalidJson', 'The request body must be a JSON object.');
                }

                $body = $decoded;
            }
        }

        return new self(
            $method,
            $path,
            $_GET,
            $headers,
            $body,
            (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
            (string) ($headers['user-agent'] ?? 'unknown'),
        );
    }

    /**
     * @return array<string, string>
     */
    private static function readHeaders(): array
    {
        $headers = [];

        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', substr($key, 5));
                $headers[$name] = (string) $value;
                continue;
            }

            if (in_array($key, ['CONTENT_TYPE', 'CONTENT_LENGTH'], true)) {
                $headers[str_replace('_', '-', $key)] = (string) $value;
            }
        }

        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                $headers[$name] = (string) $value;
            }
        }

        return $headers;
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function cookie(string $name): ?string
    {
        $cookie = $this->header('cookie');
        if ($cookie === null || $cookie === '') {
            return null;
        }

        foreach (explode(';', $cookie) as $pair) {
            $parts = explode('=', trim($pair), 2);
            if (count($parts) === 2 && $parts[0] === $name) {
                return urldecode($parts[1]);
            }
        }

        return null;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function isStateChanging(): bool
    {
        return in_array($this->method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    }

    public function attribute(string $key, mixed $default = null): mixed
    {
        return $this->attributes[$key] ?? $default;
    }

    public function withAttribute(string $key, mixed $value): self
    {
        $clone = clone $this;
        $clone->attributes[$key] = $value;

        return $clone;
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public function withAttributes(array $attributes): self
    {
        $clone = clone $this;

        foreach ($attributes as $key => $value) {
            $clone->attributes[$key] = $value;
        }

        return $clone;
    }

    /**
     * @return array<string, mixed>
     */
    public function attributes(): array
    {
        return $this->attributes;
    }
}
