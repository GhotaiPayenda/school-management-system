<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

use RuntimeException;

/**
 * An error that is safe to expose to API clients: a stable machine code, a
 * translation key, and an English fallback message.
 */
final class HttpException extends RuntimeException
{
    /**
     * @param array<string, string> $fields
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        public readonly string $messageKey,
        string $message,
        public readonly array $fields = [],
        public readonly array $headers = [],
    ) {
        parent::__construct($message, $status);
    }

    public static function unauthorized(string $messageKey = 'auth.unauthenticated', string $message = 'You must sign in to continue.'): self
    {
        return new self(401, 'unauthenticated', $messageKey, $message);
    }

    public static function forbidden(string $messageKey = 'auth.forbidden', string $message = 'You do not have permission to do that.'): self
    {
        return new self(403, 'forbidden', $messageKey, $message);
    }

    public static function notFound(string $messageKey = 'errors.notFound', string $message = 'The requested resource was not found.'): self
    {
        return new self(404, 'not_found', $messageKey, $message);
    }

    public static function methodNotAllowed(string $messageKey = 'errors.methodNotAllowed', string $message = 'That method is not allowed here.'): self
    {
        return new self(405, 'method_not_allowed', $messageKey, $message);
    }

    /**
     * @param array<string, string> $fields
     */
    public static function validation(array $fields, string $message = 'The submitted data is invalid.'): self
    {
        return new self(422, 'validation_failed', 'errors.validation', $message, $fields);
    }

    /**
     * @param array<string, string> $headers
     */
    public static function tooManyRequests(string $messageKey = 'auth.tooManyAttempts', string $message = 'Too many attempts. Try again later.', array $headers = []): self
    {
        return new self(429, 'too_many_attempts', $messageKey, $message, [], $headers);
    }

    public static function badRequest(string $code = 'bad_request', string $messageKey = 'errors.badRequest', string $message = 'The request could not be processed.'): self
    {
        return new self(400, $code, $messageKey, $message);
    }
}
