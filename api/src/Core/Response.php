<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

final class Response
{
    /**
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly int $status,
        public readonly array $headers,
        public readonly string $body,
    ) {
    }

    public static function json(mixed $data, int $status = 200, array $headers = []): self
    {
        $body = json_encode(['data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return new self(
            $status,
            ['Content-Type' => 'application/json; charset=utf-8', ...$headers],
            $body === false ? '{"data":null}' : $body,
        );
    }

    /**
     * @param array<string, string> $fields
     * @param array<string, string> $headers
     */
    public static function error(
        string $code,
        string $messageKey,
        string $message,
        int $status,
        array $fields = [],
        array $headers = [],
    ): self {
        $payload = [
            'error' => [
                'code' => $code,
                'messageKey' => $messageKey,
                'message' => $message,
            ],
        ];

        if ($fields !== []) {
            $payload['error']['fields'] = $fields;
        }

        $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return new self(
            $status,
            ['Content-Type' => 'application/json; charset=utf-8', ...$headers],
            $body === false ? '{"error":{"code":"server_error","message":"Unexpected error."}}' : $body,
        );
    }

    public static function noContent(array $headers = []): self
    {
        return new self(204, $headers, '');
    }

    public function withHeader(string $name, string $value): self
    {
        return new self($this->status, [...$this->headers, $name => $value], $this->body);
    }

    /**
     * @param array<string, string> $headers
     */
    public function withHeaders(array $headers): self
    {
        return new self($this->status, [...$this->headers, ...$headers], $this->body);
    }

    public function send(): void
    {
        http_response_code($this->status);

        foreach ($this->headers as $name => $value) {
            header("{$name}: {$value}");
        }

        if ($this->status !== 204) {
            echo $this->body;
        }
    }
}
