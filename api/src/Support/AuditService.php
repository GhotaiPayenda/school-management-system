<?php

declare(strict_types=1);

namespace Meridian\Api\Support;

use PDO;

final class AuditService
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @param array<string, mixed>|null $before
     * @param array<string, mixed>|null $after
     */
    public function record(
        ?int $actorUserId,
        string $action,
        string $module,
        string $entityType,
        int|string|null $entityId = null,
        ?array $before = null,
        ?array $after = null,
        ?string $reason = null,
        ?string $ip = null,
        ?string $userAgent = null,
    ): void {
        $statement = $this->db->prepare(
            'INSERT INTO audit_entries
                (actor_user_id, action, module, entity_type, entity_id, reason, before_json, after_json, ip, user_agent, created_at)
             VALUES
                (:actor_user_id, :action, :module, :entity_type, :entity_id, :reason, :before_json, :after_json, :ip, :user_agent, :created_at)',
        );

        $statement->execute([
            'actor_user_id' => $actorUserId,
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId === null ? null : (string) $entityId,
            'reason' => $reason,
            'before_json' => $before === null ? null : json_encode($before, JSON_UNESCAPED_UNICODE),
            'after_json' => $after === null ? null : json_encode($after, JSON_UNESCAPED_UNICODE),
            'ip' => $ip,
            'user_agent' => $userAgent,
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ]);
    }
}