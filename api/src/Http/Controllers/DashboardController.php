<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Http\Middleware\AuthMiddleware;
use PDO;

final class DashboardController
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function show(Request $request): Response
    {
        $context = AuthMiddleware::context($request);
        $user = $context->user;
        if ($user === null) {
            return Response::json(['cards' => [], 'activity' => []]);
        }
        $role = $user->roleSlug;
        $cards = [];
        $tasks = [];
        $charts = [];

        if (in_array($role, ['super-admin', 'principal', 'registrar'], true)) {
            $students = (int) $this->scalar('SELECT COUNT(*) FROM students WHERE status = \'active\'');
            $staff = (int) $this->scalar('SELECT COUNT(*) FROM staff WHERE status = \'active\'');
            $attendance = $this->attendanceToday();
            $outstanding = (float) $this->scalar('SELECT COALESCE(SUM(balance), 0) FROM invoices WHERE status IN (\'issued\', \'partially_paid\', \'overdue\')');
            $cards = [
                ['key' => 'students', 'label' => 'Active students', 'value' => $students, 'hint' => 'Across all Sections'],
                ['key' => 'staff', 'label' => 'Active staff', 'value' => $staff, 'hint' => 'All departments'],
                ['key' => 'attendance', 'label' => 'Attendance today', 'value' => $attendance['rate'], 'hint' => $attendance['total'] . ' records', 'format' => 'percent'],
                ['key' => 'outstanding', 'label' => 'Outstanding fees', 'value' => $outstanding, 'hint' => 'Issued invoices', 'format' => 'currency'],
            ];
            $tasks = [
                ['key' => 'applicants', 'label' => 'Applicants waiting', 'count' => (int) $this->scalar('SELECT COUNT(*) FROM applicants WHERE status = \'applicant\''), 'to' => '/admissions'],
                ['key' => 'reports', 'label' => 'Report cards in draft', 'count' => (int) $this->scalar('SELECT COUNT(*) FROM report_cards WHERE status = \'draft\''), 'to' => '/exams/report-cards'],
                ['key' => 'overdue', 'label' => 'Overdue books', 'count' => (int) $this->scalar('SELECT COUNT(*) FROM loans WHERE status = \'open\' AND due_at < :now', ['now' => gmdate('Y-m-d\TH:i:s\Z')]), 'to' => '/library/loans'],
            ];
            $charts['enrollmentByGrade'] = $this->rows(
                'SELECT g.number AS label, COUNT(e.id) AS value FROM grade_levels g
                 LEFT JOIN sections sec ON sec.grade_level_id = g.id
                 LEFT JOIN enrollments e ON e.section_id = sec.id AND e.status = \'active\'
                 GROUP BY g.number ORDER BY g.number',
            );
        } elseif ($role === 'teacher') {
            $staff = $this->row('SELECT * FROM staff WHERE user_id = :user', ['user' => $user->id]);
            $staffId = $staff['id'] ?? 0;
            $sections = (int) $this->scalar('SELECT COUNT(DISTINCT section_id) FROM teaching_assignments WHERE teacher_staff_id = :id', ['id' => $staffId]);
            $students = (int) $this->scalar(
                'SELECT COUNT(DISTINCT e.student_id) FROM enrollments e WHERE e.status = \'active\' AND e.section_id IN
                 (SELECT section_id FROM teaching_assignments WHERE teacher_staff_id = :id)',
                ['id' => $staffId],
            );
            $drafts = (int) $this->scalar(
                'SELECT COUNT(*) FROM exam_scores sc JOIN exams ex ON ex.id = sc.exam_id
                 WHERE sc.is_draft = 1 AND ex.subject_id IN (SELECT subject_id FROM teaching_assignments WHERE teacher_staff_id = :id)',
                ['id' => $staffId],
            );
            $cards = [
                ['key' => 'sections', 'label' => 'My Sections', 'value' => $sections, 'hint' => 'Assigned teaching'],
                ['key' => 'students', 'label' => 'My students', 'value' => $students, 'hint' => 'Active enrollment'],
                ['key' => 'drafts', 'label' => 'Draft scores', 'value' => $drafts, 'hint' => 'Awaiting publication'],
                ['key' => 'attendance', 'label' => 'Attendance today', 'value' => $this->attendanceToday($staffId)['rate'], 'hint' => 'My Sections', 'format' => 'percent'],
            ];
            $tasks = [
                ['key' => 'schedule', 'label' => 'Upcoming exams', 'count' => (int) $this->scalar('SELECT COUNT(*) FROM exam_schedules sch JOIN exams ex ON ex.id = sch.exam_id WHERE sch.date >= date(\'now\') AND ex.subject_id IN (SELECT subject_id FROM teaching_assignments WHERE teacher_staff_id = :id)', ['id' => $staffId]), 'to' => '/exams/schedule'],
                ['key' => 'scores', 'label' => 'Scores to finish', 'count' => $drafts, 'to' => '/exams'],
            ];
            $charts['attendance7'] = $this->attendanceTrend($staffId);
        } elseif ($role === 'accountant') {
            $collected = (float) $this->scalar('SELECT COALESCE(SUM(amount), 0) FROM payments WHERE paid_at >= :from', ['from' => gmdate('Y-m-01')]);
            $outstanding = (float) $this->scalar('SELECT COALESCE(SUM(balance), 0) FROM invoices WHERE status IN (\'issued\', \'partially_paid\', \'overdue\')');
            $overdue = (int) $this->scalar('SELECT COUNT(*) FROM invoices WHERE balance > 0 AND due_date < date(\'now\') AND status IN (\'issued\', \'partially_paid\', \'overdue\')');
            $today = (float) $this->scalar('SELECT COALESCE(SUM(amount), 0) FROM payments WHERE substr(paid_at, 1, 10) = date(\'now\')');
            $cards = [
                ['key' => 'collected', 'label' => 'Collected this month', 'value' => $collected, 'format' => 'currency'],
                ['key' => 'today', 'label' => 'Collected today', 'value' => $today, 'format' => 'currency'],
                ['key' => 'outstanding', 'label' => 'Outstanding', 'value' => $outstanding, 'format' => 'currency'],
                ['key' => 'overdue', 'label' => 'Overdue invoices', 'value' => $overdue],
            ];
            $tasks = [
                ['key' => 'arrears', 'label' => 'Accounts in arrears', 'count' => (int) $this->scalar('SELECT COUNT(DISTINCT student_id) FROM invoices WHERE balance > 0'), 'to' => '/finance/arrears'],
                ['key' => 'billing', 'label' => 'Invoices this month', 'count' => (int) $this->scalar('SELECT COUNT(*) FROM invoices WHERE billing_period = :period', ['period' => gmdate('Y-m')]), 'to' => '/finance/invoices'],
            ];
            $charts['daily'] = $this->rows(
                'SELECT substr(paid_at, 6, 5) AS label, SUM(amount) AS value FROM payments
                 WHERE paid_at >= :from GROUP BY substr(paid_at, 1, 10) ORDER BY paid_at',
                ['from' => gmdate('Y-m-d', strtotime('-14 days'))],
            );
        } elseif ($role === 'librarian') {
            $open = (int) $this->scalar('SELECT COUNT(*) FROM loans WHERE status = \'open\'');
            $overdue = (int) $this->scalar('SELECT COUNT(*) FROM loans WHERE status = \'open\' AND due_at < :now', ['now' => gmdate('Y-m-d\TH:i:s\Z')]);
            $fines = (float) $this->scalar('SELECT COALESCE(SUM(amount), 0) FROM fines WHERE settled = 0');
            $available = (int) $this->scalar('SELECT COUNT(*) FROM library_copies WHERE status = \'available\'');
            $cards = [
                ['key' => 'open', 'label' => 'Open loans', 'value' => $open],
                ['key' => 'overdue', 'label' => 'Overdue loans', 'value' => $overdue],
                ['key' => 'fines', 'label' => 'Unsettled fines', 'value' => $fines, 'format' => 'currency'],
                ['key' => 'available', 'label' => 'Available copies', 'value' => $available],
            ];
            $charts['categories'] = $this->rows(
                'SELECT COALESCE(t.category, \'Uncategorised\') AS label, COUNT(c.id) AS value
                 FROM library_copies c JOIN library_titles t ON t.id = c.title_id GROUP BY t.category ORDER BY value DESC LIMIT 8',
            );
        } else {
            $portal = new PortalController($this->db);
            $overview = $portal->buildOverview($request, $user);
            $cards = $overview['cards'];
            $tasks = $overview['tasks'];
            $charts = $overview['charts'] ?? [];
        }

        if ($charts === []) {
            $charts['attendance7'] = $this->attendanceTrend();
        }

        return Response::json([
            'greeting' => 'Welcome back, ' . $user->name . '.',
            'role' => ['slug' => $role, 'name' => $user->roleName],
            'cards' => $cards,
            'tasks' => $tasks,
            'charts' => $charts,
            'activity' => $this->activity($user->roleSlug, $user->id),
            'announcements' => $this->announcements($user->roleSlug, $user->id),
            'date' => gmdate('Y-m-d'),
        ]);
    }

    private function attendanceToday(?int $staffId = null): array
    {
        $params = ['date' => gmdate('Y-m-d')];
        $sectionFilter = '';
        if ($staffId !== null) {
            $sectionFilter = ' AND section_id IN (SELECT section_id FROM teaching_assignments WHERE teacher_staff_id = :staff)';
            $params['staff'] = $staffId;
        }
        $rows = $this->rows('SELECT status, COUNT(*) AS value FROM attendance_records WHERE date = :date' . $sectionFilter . ' GROUP BY status', $params);
        $counts = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
        foreach ($rows as $row) {
            $counts[$row['status']] = (int) $row['value'];
        }
        $total = array_sum($counts);

        return ['total' => $total, 'rate' => $total === 0 ? null : round((($counts['present'] + $counts['late']) / $total) * 100, 1)];
    }

    private function attendanceTrend(?int $staffId = null): array
    {
        $params = [];
        $filter = '';
        if ($staffId !== null) {
            $filter = ' AND section_id IN (SELECT section_id FROM teaching_assignments WHERE teacher_staff_id = :staff)';
            $params['staff'] = $staffId;
        }
        $rows = $this->rows(
            'SELECT date AS label, ROUND(100.0 * SUM(CASE WHEN status IN (\'present\', \'late\') THEN 1 ELSE 0 END) / COUNT(*), 1) AS value
             FROM attendance_records WHERE date >= :from' . $filter . ' GROUP BY date ORDER BY date',
            ['from' => gmdate('Y-m-d', strtotime('-6 days'))] + $params,
        );

        return $rows;
    }

    private function activity(string $role, int $userId): array
    {
        if (!in_array($role, ['super-admin', 'principal'], true)) {
            return [];
        }
        $rows = $this->rows(
            'SELECT a.id, a.action, a.module, a.entity_type, a.created_at, u.name AS actor_name
             FROM audit_entries a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 8',
        );

        return $rows;
    }

    private function announcements(string $role, int $userId): array
    {
        return $this->rows(
            'SELECT a.id, a.title, a.published_at, (SELECT read_at FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = :user) AS read_at
             FROM announcements a WHERE a.status = \'published\' AND (a.target_type = \'all\' OR (a.target_type = \'role\' AND a.target_value = :role))
             ORDER BY a.published_at DESC LIMIT 5',
            ['user' => $userId, 'role' => $role],
        );
    }

    private function scalar(string $sql, array $params = []): mixed
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        $value = $statement->fetchColumn();

        return $value === false ? 0 : $value;
    }

    private function rows(string $sql, array $params = []): array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }

    private function row(string $sql, array $params = []): ?array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }
}