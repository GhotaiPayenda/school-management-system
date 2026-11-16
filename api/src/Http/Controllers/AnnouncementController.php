<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class AnnouncementController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function index(Request $request): Response
    {
        $user = $this->user($request);
        $canManage = $this->hasPermission($request, 'announcements.manage');
        $where = [];
        $params = [];
        $status = $this->queryString($request, 'status');
        if ($status !== null && $canManage) {
            $where[] = 'a.status = :status';
            $params['status'] = $status;
        } elseif (!$canManage) {
            $where[] = 'a.status = \'published\'';
        }
        if (!$canManage) {
            $where[] = $this->audienceSql($user, $params);
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT a.*, u.name AS created_by_name,
                    (SELECT read_at FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = :reader) AS read_at
             FROM announcements a LEFT JOIN users u ON u.id = a.created_by ' . $whereSql . '
             ORDER BY a.published_at DESC, a.created_at DESC LIMIT 100',
            $params + ['reader' => $user->id],
        );

        return Response::json(['items' => $rows]);
    }

    public function show(Request $request, int $id): Response
    {
        $user = $this->user($request);
        $announcement = $this->findVisible($request, $id);
        $announcement['read_at'] = $this->fetchOne('SELECT read_at FROM announcement_reads WHERE announcement_id = :id AND user_id = :user', ['id' => $id, 'user' => $user->id])['read_at'] ?? null;

        return Response::json($announcement);
    }

    public function create(Request $request): Response
    {
        $targetType = $this->ensureOneOf($request, 'targetType', ['all', 'role', 'grade', 'section'], 'targetType');
        $targetValue = $this->inputString($request, 'targetValue');
        if ($targetType !== 'all' && $targetValue === null) {
            throw HttpException::validation(['targetValue' => 'validation.required']);
        }
        $status = (string) ($request->input('status') ?? 'draft');
        if (!in_array($status, ['draft', 'published'], true)) {
            throw HttpException::validation(['status' => 'validation.invalid']);
        }
        $id = $this->insert('announcements', [
            'title' => $this->requiredString($request, 'title', 'title'),
            'body' => $this->requiredString($request, 'body', 'body'),
            'target_type' => $targetType,
            'target_value' => $targetType === 'all' ? null : $targetValue,
            'status' => $status,
            'published_at' => $status === 'published' ? $this->now() : null,
            'created_by' => $this->user($request)->id,
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->audit($request, 'announcements', 'announcement.create', 'announcement', $id, null, ['title' => $request->input('title'), 'status' => $status]);

        return Response::json($this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]), 201);
    }

    public function update(Request $request, int $id): Response
    {
        $announcement = $this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]);
        if ($announcement === null) {
            throw HttpException::notFound();
        }
        $values = [];
        foreach (['title' => 'title', 'body' => 'body', 'targetValue' => 'target_value'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if ($request->input('targetType') !== null) {
            $values['target_type'] = $this->ensureOneOf($request, 'targetType', ['all', 'role', 'grade', 'section'], 'targetType');
            if ($values['target_type'] === 'all') {
                $values['target_value'] = null;
            }
        }
        if ($request->input('status') !== null) {
            $status = $this->ensureOneOf($request, 'status', ['draft', 'published', 'archived'], 'status');
            $values['status'] = $status;
            if ($status === 'published' && $announcement['published_at'] === null) {
                $values['published_at'] = $this->now();
            }
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('announcements', $id, $values);
        $this->audit($request, 'announcements', 'announcement.update', 'announcement', $id, $announcement, $values);

        return Response::json($this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]));
    }

    public function publish(Request $request, int $id): Response
    {
        $announcement = $this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]);
        if ($announcement === null) {
            throw HttpException::notFound();
        }
        $this->execute('UPDATE announcements SET status = \'published\', published_at = COALESCE(published_at, :at), updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $id]);
        $this->audit($request, 'announcements', 'announcement.publish', 'announcement', $id, $announcement);

        return Response::json($this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]));
    }

    public function archive(Request $request, int $id): Response
    {
        $announcement = $this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]);
        if ($announcement === null) {
            throw HttpException::notFound();
        }
        $this->execute('UPDATE announcements SET status = \'archived\', updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $id]);
        $this->audit($request, 'announcements', 'announcement.archive', 'announcement', $id, $announcement);

        return Response::json($this->fetchOne('SELECT * FROM announcements WHERE id = :id', ['id' => $id]));
    }

    public function markRead(Request $request, int $id): Response
    {
        $this->findVisible($request, $id);
        $user = $this->user($request);
        $this->execute(
            'INSERT INTO announcement_reads (announcement_id, user_id, read_at) VALUES (:id, :user, :at)
             ON CONFLICT(announcement_id, user_id) DO UPDATE SET read_at = excluded.read_at',
            ['id' => $id, 'user' => $user->id, 'at' => $this->now()],
        );

        return Response::json(['announcementId' => $id, 'readAt' => $this->now()]);
    }

    public function unreadCount(Request $request): Response
    {
        $user = $this->user($request);
        $params = [];
        $where = ['a.status = \'published\''];
        if (!$this->hasPermission($request, 'announcements.manage')) {
            $where[] = $this->audienceSql($user, $params);
        }
        $count = (int) $this->fetchOne(
            'SELECT COUNT(*) AS total FROM announcements a WHERE ' . implode(' AND ', $where) . '
             AND NOT EXISTS (SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = :user2)',
            $params + ['user2' => $user->id],
        )['total'];

        return Response::json(['count' => $count]);
    }

    private function findVisible(Request $request, int $id): array
    {
        $user = $this->user($request);
        $params = ['id' => $id];
        $audience = $this->audienceSql($user, $params);
        $announcement = $this->fetchOne(
            'SELECT a.*, u.name AS created_by_name FROM announcements a LEFT JOIN users u ON u.id = a.created_by
             WHERE a.id = :id AND (' . $audience . ' OR :manager = 1)',
            $params + ['manager' => $this->hasPermission($request, 'announcements.manage') ? 1 : 0],
        );
        if ($announcement === null) {
            throw HttpException::notFound();
        }

        return $announcement;
    }

    /**
     * @param array<string, mixed> $params
     */
    private function audienceSql(\Meridian\Api\Auth\User $user, array &$params): string
    {
        $studentIds = [];
        $gradeNumbers = [];
        $sectionIds = [];
        if ($user->roleSlug === 'student') {
            $student = $this->fetchOne(
                'SELECT st.id, g.number AS grade_number, e.section_id FROM students st
                 LEFT JOIN enrollments e ON e.student_id = st.id AND e.status = \'active\'
                 LEFT JOIN sections sec ON sec.id = e.section_id LEFT JOIN grade_levels g ON g.id = sec.grade_level_id
                 WHERE st.user_id = :user LIMIT 1',
                ['user' => $user->id],
            );
            if ($student !== null) {
                $studentIds[] = (int) $student['id'];
                if ($student['grade_number'] !== null) $gradeNumbers[] = (string) $student['grade_number'];
                if ($student['section_id'] !== null) $sectionIds[] = (string) $student['section_id'];
            }
        } elseif ($user->roleSlug === 'guardian') {
            $children = $this->fetchAll(
                'SELECT st.id, g.number AS grade_number, e.section_id FROM student_guardians sg
                 JOIN guardians gu ON gu.id = sg.guardian_id JOIN students st ON st.id = sg.student_id
                 LEFT JOIN enrollments e ON e.student_id = st.id AND e.status = \'active\'
                 LEFT JOIN sections sec ON sec.id = e.section_id LEFT JOIN grade_levels g ON g.id = sec.grade_level_id
                 WHERE gu.user_id = :user',
                ['user' => $user->id],
            );
            foreach ($children as $child) {
                $studentIds[] = (int) $child['id'];
                if ($child['grade_number'] !== null) $gradeNumbers[] = (string) $child['grade_number'];
                if ($child['section_id'] !== null) $sectionIds[] = (string) $child['section_id'];
            }
        }
        $clauses = ['a.target_type = \'all\''];
        $params['role_slug'] = $user->roleSlug;
        $clauses[] = '(a.target_type = \'role\' AND a.target_value = :role_slug)';
        if ($gradeNumbers !== []) {
            $placeholders = [];
            foreach (array_values(array_unique($gradeNumbers)) as $index => $grade) {
                $key = 'grade_' . $index;
                $placeholders[] = ':' . $key;
                $params[$key] = $grade;
            }
            $clauses[] = '(a.target_type = \'grade\' AND a.target_value IN (' . implode(', ', $placeholders) . '))';
        }
        if ($sectionIds !== []) {
            $placeholders = [];
            foreach (array_values(array_unique($sectionIds)) as $index => $section) {
                $key = 'section_' . $index;
                $placeholders[] = ':' . $key;
                $params[$key] = $section;
            }
            $clauses[] = '(a.target_type = \'section\' AND a.target_value IN (' . implode(', ', $placeholders) . '))';
        }

        return '(' . implode(' OR ', $clauses) . ')';
    }

    private function hasPermission(Request $request, string $permission): bool
    {
        return \Meridian\Api\Http\Middleware\AuthMiddleware::context($request)->hasPermission($permission);
    }
}