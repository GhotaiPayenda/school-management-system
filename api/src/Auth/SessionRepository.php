<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

use PDO;

final class SessionRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findByTokenHash(string $tokenHash): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM sessions WHERE token_hash = :token_hash LIMIT 1');
        $statement->execute(['token_hash' => $tokenHash]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function create(
        string $tokenHash,
        string $csrfToken,
        ?int $userId,
        string $ip,
        string $userAgent,
        string $expiresAt,
    ): int {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $statement = $this->pdo->prepare(
            'INSERT INTO sessions (token_hash, user_id, csrf_token, ip, user_agent, created_at, last_seen_at, expires_at)
             VALUES (:token_hash, :user_id, :csrf_token, :ip, :user_agent, :created_at, :last_seen_at, :expires_at)',
        );
        $statement->execute([
            'token_hash' => $tokenHash,
            'user_id' => $userId,
            'csrf_token' => $csrfToken,
            'ip' => $ip,
            'user_agent' => $userAgent,
            'created_at' => $now,
            'last_seen_at' => $now,
            'expires_at' => $expiresAt,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function touch(int $sessionId, string $expiresAt): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE sessions SET last_seen_at = :last_seen_at, expires_at = :expires_at WHERE id = :id',
        );
        $statement->execute([
            'last_seen_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'expires_at' => $expiresAt,
            'id' => $sessionId,
        ]);
    }

    public function delete(int $sessionId): void
    {
        $statement = $this->pdo->prepare('DELETE FROM sessions WHERE id = :id');
        $statement->execute(['id' => $sessionId]);
    }

    public function deleteByTokenHash(string $tokenHash): void
    {
        $statement = $this->pdo->prepare('DELETE FROM sessions WHERE token_hash = :token_hash');
        $statement->execute(['token_hash' => $tokenHash]);
    }

    public function deleteForUser(int $userId, ?int $exceptSessionId = null): void
    {
        if ($exceptSessionId === null) {
            $statement = $this->pdo->prepare('DELETE FROM sessions WHERE user_id = :user_id');
            $statement->execute(['user_id' => $userId]);

            return;
        }

        $statement = $this->pdo->prepare('DELETE FROM sessions WHERE user_id = :user_id AND id != :id');
        $statement->execute(['user_id' => $userId, 'id' => $exceptSessionId]);
    }

    public function pruneExpired(): void
    {
        $statement = $this->pdo->prepare('DELETE FROM sessions WHERE expires_at <= :now');
        $statement->execute(['now' => gmdate('Y-m-d\TH:i:s\Z')]);
    }
}
