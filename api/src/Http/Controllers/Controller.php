<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Auth\User;
use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Http\Middleware\AuthMiddleware;
use Meridian\Api\Support\AuditService;
use PDO;

abstract class Controller
{
    protected readonly AuditService $auditService;

    public function __construct(protected readonly PDO $db)
    {
        $this->auditService = new AuditService($db);
    }

    protected function user(Request $request): User
    {
        $context = AuthMiddleware::context($request);
        if ($context->user === null) {
            throw HttpException::unauthorized();
        }

        return $context->user;
    }

    protected function queryString(Request $request, string $key, ?string $default = null): ?string
    {
        $value = $request->query[$key] ?? $default;
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    protected function inputString(Request $request, string $key): ?string
    {
        $value = $request->input($key);
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    protected function requiredString(Request $request, string $key, string $field): string
    {
        $value = $this->inputString($request, $key);
        if ($value === null) {
            throw HttpException::validation([$field => 'validation.required']);
        }

        return $value;
    }

    protected function intInput(Request $request, string $key, ?int $default = null): ?int
    {
        $value = $request->input($key, $default);
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        return (int) $value;
    }

    protected function requiredInt(Request $request, string $key, string $field): int
    {
        $value = $this->intInput($request, $key);
        if ($value === null) {
            throw HttpException::validation([$field => 'validation.required']);
        }

        return $value;
    }

    protected function floatInput(Request $request, string $key, ?float $default = null): ?float
    {
        $value = $request->input($key, $default);
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    /**
     * @return array{page: int, perPage: int, offset: int}
     */
    protected function pagination(Request $request, int $defaultPerPage = 25): array
    {
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = $request->query['perPage'] ?? $request->query['pageSize'] ?? $defaultPerPage;
        $perPage = min(100, max(1, (int) $pageSize));

        return ['page' => $page, 'perPage' => $perPage, 'offset' => ($page - 1) * $perPage];
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    protected function fetchOne(string $sql, array $params = []): ?array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    protected function fetchAll(string $sql, array $params = []): array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }

    protected function execute(string $sql, array $params = []): void
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
    }

    protected function insert(string $table, array $values): int
    {
        $columns = array_keys($values);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $table,
            implode(', ', $columns),
            implode(', ', $placeholders),
        );

        $this->execute($sql, $values);

        return (int) $this->db->lastInsertId();
    }

    protected function updateRow(string $table, int $id, array $values): void
    {
        if ($values === []) {
            return;
        }

        $assignments = array_map(static fn (string $column): string => $column . ' = :' . $column, array_keys($values));
        $values['id'] = $id;

        $this->execute(
            sprintf('UPDATE %s SET %s WHERE id = :id', $table, implode(', ', $assignments)),
            $values,
        );
    }

    protected function now(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    protected function audit(Request $request, string $module, string $action, string $entityType, int|string|null $entityId, ?array $before = null, ?array $after = null, ?string $reason = null): void
    {
        $this->auditService->record(
            $this->user($request)->id,
            $action,
            $module,
            $entityType,
            $entityId,
            $before,
            $after,
            $reason,
            $request->ip,
            $request->userAgent,
        );
    }

    protected function ensureOneOf(Request $request, string $key, array $allowed, string $field): string
    {
        $value = $this->requiredString($request, $key, $field);
        if (!in_array($value, $allowed, true)) {
            throw HttpException::validation([$field => 'validation.invalid']);
        }

        return $value;
    }

    protected function ensureUnique(string $sql, array $params, string $field): void
    {
        if ($this->fetchOne($sql, $params) !== null) {
            throw HttpException::validation([$field => 'validation.duplicate']);
        }
    }

    protected function dateInput(Request $request, string $key, string $field, bool $required = true): ?string
    {
        $value = $this->inputString($request, $key);
        if ($value === null) {
            if ($required) {
                throw HttpException::validation([$field => 'validation.required']);
            }

            return null;
        }

        $parsed = \DateTimeImmutable::createFromFormat('Y-m-d', $value);
        if ($parsed === false || $parsed->format('Y-m-d') !== $value) {
            throw HttpException::validation([$field => 'validation.invalidDate']);
        }

        return $value;
    }

    protected function transaction(callable $callback): mixed
    {
        $this->db->beginTransaction();

        try {
            $result = $callback();
            $this->db->commit();

            return $result;
        } catch (\Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $exception;
        }
    }
}