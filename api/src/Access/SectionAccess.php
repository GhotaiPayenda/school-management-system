<?php

declare(strict_types=1);

namespace Meridian\Api\Access;

use Meridian\Api\Auth\User;
use Meridian\Api\Core\HttpException;
use PDO;

/**
 * The single Section access rule: a Teacher may read a Section only when they
 * are its Homeroom Teacher or hold a Teaching Assignment in it. Other Roles
 * are governed by their Permissions alone.
 */
final class SectionAccess
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function isTeacher(User $user): bool
    {
        return $user->roleSlug === 'teacher';
    }

    public function staffIdFor(User $user): ?int
    {
        $statement = $this->db->prepare('SELECT id FROM staff WHERE user_id = :user');
        $statement->execute(['user' => $user->id]);
        $value = $statement->fetchColumn();

        return $value === false ? null : (int) $value;
    }

    public function assertAccess(User $user, int $sectionId): void
    {
        if (!$this->isTeacher($user)) {
            return;
        }

        $staffId = $this->staffIdFor($user);
        if ($staffId === null) {
            throw HttpException::forbidden();
        }

        $statement = $this->db->prepare(
            'SELECT 1 FROM sections s WHERE s.id = :section AND (
                s.homeroom_teacher_id = :staff OR EXISTS (
                    SELECT 1 FROM teaching_assignments a WHERE a.section_id = s.id AND a.teacher_staff_id = :staff
                )
             )',
        );
        $statement->execute(['section' => $sectionId, 'staff' => $staffId]);
        if ($statement->fetchColumn() === false) {
            throw HttpException::forbidden();
        }
    }

    /**
     * A WHERE fragment that limits a Section query to what the User may read.
     *
     * @return array{sql: string, params: array<string, int>}
     */
    public function scope(User $user, string $alias = 's'): array
    {
        if (!$this->isTeacher($user)) {
            return ['sql' => '1 = 1', 'params' => []];
        }

        $staffId = $this->staffIdFor($user);
        if ($staffId === null) {
            return ['sql' => '1 = 0', 'params' => []];
        }

        return [
            'sql' => sprintf(
                '(%1$s.homeroom_teacher_id = :section_access_staff OR EXISTS (
                    SELECT 1 FROM teaching_assignments section_access_assignment
                    WHERE section_access_assignment.section_id = %1$s.id
                      AND section_access_assignment.teacher_staff_id = :section_access_staff
                ))',
                $alias,
            ),
            'params' => ['section_access_staff' => $staffId],
        ];
    }
}
