<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

use PDO;

final class LoginRateLimiter
{
    /**
     * @param array{max_attempts: int, window_seconds: int} $config
     */
    public function __construct(
        private readonly PDO $pdo,
        private readonly array $config,
    ) {
    }

    public function assertAllowed(string $email, string $ip): void
    {
        $since = gmdate('Y-m-d\TH:i:s\Z', time() - $this->config['window_seconds']);
        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM login_attempts
             WHERE successful = 0
               AND created_at >= :since
               AND email = :email
               AND ip = :ip',
        );
        $statement->execute(['since' => $since, 'email' => $email, 'ip' => $ip]);
        $failures = (int) $statement->fetchColumn();

        if ($failures >= $this->config['max_attempts']) {
            throw \Meridian\Api\Core\HttpException::tooManyRequests(
                'auth.tooManyAttempts',
                'Too many sign-in attempts. Try again later.',
                ['Retry-After' => (string) $this->config['window_seconds']],
            );
        }
    }

    public function recordFailure(string $email, string $ip): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO login_attempts (email, ip, successful, created_at)
             VALUES (:email, :ip, 0, :created_at)',
        );
        $statement->execute([
            'email' => $email,
            'ip' => $ip,
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ]);

        $this->prune();
    }

    public function clearFor(string $email, string $ip): void
    {
        $statement = $this->pdo->prepare('DELETE FROM login_attempts WHERE email = :email AND ip = :ip');
        $statement->execute(['email' => $email, 'ip' => $ip]);
    }

    private function prune(): void
    {
        $statement = $this->pdo->prepare('DELETE FROM login_attempts WHERE created_at < :cutoff');
        $statement->execute(['cutoff' => gmdate('Y-m-d\TH:i:s\Z', time() - 24 * 60 * 60)]);
    }
}
