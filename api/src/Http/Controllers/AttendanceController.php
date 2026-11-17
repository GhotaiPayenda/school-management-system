<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Access\SectionAccess;
use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Support\Csv;
use PDO;

final class AttendanceController extends Controller
{
    private readonly SectionAccess $sectionAccess;

    public function __construct(PDO $db)
    {
        parent::__construct($db);
        $this->sectionAccess = new SectionAccess($db);
    }

    public function index(Request $request): Response
    {
        $pagination = $this->pagination($request, 50);
        $where = [];
        $params = [];
        foreach (['date' => 'a.date', 'sectionId' => 'a.section_id', 'studentId' => 'a.student_id', 'status' => 'a.status'] as $key => $column) {
            $value = $this->queryString($request, $key);
            if ($value !== null) {
                $where[] = $column . ' = :' . $key;
                $params[$key] = $key === 'date' || $key === 'status' ? $value : (int) $value;
            }
        }
        $from = $this->queryString($request, 'from');
        $to = $this->queryString($request, 'to');
        if ($from !== null) {
            $where[] = 'a.date >= :from';
            $params['from'] = $from;
        }
        if ($to !== null) {
            $where[] = 'a.date <= :to';
            $params['to'] = $to;
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $studentIds = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'a.student_id IN (' . ($studentIds === [] ? '0' : implode(',', $studentIds)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM attendance_records a JOIN students st ON st.id = a.student_id JOIN sections sec ON sec.id = a.section_id
                 JOIN grade_levels g ON g.id = sec.grade_level_id LEFT JOIN periods p ON p.id = a.period_id';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT a.*, st.admission_number, st.first_name, st.last_name, sec.name AS section_name, g.number AS grade_number, p.label AS period_label
             ' . $base . ' ' . $whereSql . ' ORDER BY a.date DESC, g.number, sec.name, st.last_name LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function sheet(Request $request): Response
    {
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $date = $this->dateInput($request, 'date', 'date');
        $periodId = $this->intInput($request, 'periodId');
        $this->section($sectionId);
        $this->sectionAccess->assertAccess($this->user($request), $sectionId);
        $this->assertNotLocked($date);

        $students = $this->fetchAll(
            'SELECT st.id, st.admission_number, st.first_name, st.last_name, e.id AS enrollment_id
             FROM enrollments e JOIN students st ON st.id = e.student_id
             WHERE e.section_id = :section AND e.status = \'active\' ORDER BY st.last_name, st.first_name',
            ['section' => $sectionId],
        );
        $existing = [];
        if ($periodId === null) {
            $rows = $this->fetchAll(
                'SELECT student_id, status, reason FROM attendance_records WHERE section_id = :section AND date = :date AND period_id IS NULL',
                ['section' => $sectionId, 'date' => $date],
            );
        } else {
            $rows = $this->fetchAll(
                'SELECT student_id, status, reason FROM attendance_records WHERE section_id = :section AND date = :date AND period_id = :period',
                ['section' => $sectionId, 'date' => $date, 'period' => $periodId],
            );
        }
        foreach ($rows as $row) {
            $existing[(int) $row['student_id']] = $row;
        }
        foreach ($students as &$student) {
            $student['attendance'] = $existing[(int) $student['id']] ?? null;
        }
        unset($student);
        $periods = $this->fetchAll('SELECT * FROM periods WHERE section_id = :section ORDER BY sort_order', ['section' => $sectionId]);
        $settings = $this->fetchOne('SELECT per_period_attendance FROM school_settings WHERE id = 1');

        return Response::json([
            'sectionId' => $sectionId,
            'date' => $date,
            'periodId' => $periodId,
            'students' => $students,
            'periods' => $periods,
            'perPeriodAttendance' => (bool) ($settings['per_period_attendance'] ?? false),
            'locked' => false,
        ]);
    }

    public function bulk(Request $request): Response
    {
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $date = $this->dateInput($request, 'date', 'date');
        $periodId = $this->intInput($request, 'periodId');
        $this->section($sectionId);
        $this->sectionAccess->assertAccess($this->user($request), $sectionId);
        $this->assertNotLocked($date);
        $records = $request->input('records');
        if (!is_array($records) || $records === []) {
            throw HttpException::validation(['records' => 'validation.required']);
        }
        if ($periodId !== null) {
            $period = $this->fetchOne('SELECT * FROM periods WHERE id = :id AND section_id = :section', ['id' => $periodId, 'section' => $sectionId]);
            if ($period === null || $period['kind'] !== 'period') {
                throw HttpException::validation(['periodId' => 'validation.invalid']);
            }
        }
        $allowed = ['present', 'absent', 'late', 'excused'];
        $saved = 0;
        $this->transaction(function () use ($request, $records, $sectionId, $date, $periodId, $allowed, &$saved): void {
            foreach ($records as $record) {
                if (!is_array($record)) {
                    continue;
                }
                $studentId = (int) ($record['studentId'] ?? 0);
                $status = (string) ($record['status'] ?? '');
                if (!in_array($status, $allowed, true)) {
                    throw HttpException::validation(['records' => 'validation.invalid']);
                }
                $enrolled = $this->fetchOne(
                    'SELECT id FROM enrollments WHERE student_id = :student AND section_id = :section AND status = \'active\'',
                    ['student' => $studentId, 'section' => $sectionId],
                );
                if ($enrolled === null) {
                    throw HttpException::validation(['records' => 'attendance.studentNotEnrolled']);
                }
                $reason = isset($record['reason']) ? trim((string) $record['reason']) ?: null : null;
                $existing = $periodId === null
                    ? $this->fetchOne('SELECT id FROM attendance_records WHERE student_id = :student AND section_id = :section AND date = :date AND period_id IS NULL', ['student' => $studentId, 'section' => $sectionId, 'date' => $date])
                    : $this->fetchOne('SELECT id FROM attendance_records WHERE student_id = :student AND section_id = :section AND date = :date AND period_id = :period', ['student' => $studentId, 'section' => $sectionId, 'date' => $date, 'period' => $periodId]);

                if ($existing === null) {
                    $this->insert('attendance_records', [
                        'student_id' => $studentId,
                        'section_id' => $sectionId,
                        'date' => $date,
                        'period_id' => $periodId,
                        'status' => $status,
                        'reason' => $reason,
                        'recorded_by' => $this->user($request)->id,
                        'created_at' => $this->now(),
                        'updated_at' => $this->now(),
                    ]);
                } else {
                    $this->execute(
                        'UPDATE attendance_records SET status = :status, reason = :reason, recorded_by = :user, updated_at = :at WHERE id = :id',
                        ['status' => $status, 'reason' => $reason, 'user' => $this->user($request)->id, 'at' => $this->now(), 'id' => $existing['id']],
                    );
                }
                $saved++;
            }
        });
        $this->audit($request, 'attendance', 'attendance.record', 'section', $sectionId, null, ['date' => $date, 'periodId' => $periodId, 'saved' => $saved]);

        return Response::json(['saved' => $saved, 'sectionId' => $sectionId, 'date' => $date, 'periodId' => $periodId]);
    }

    public function summary(Request $request): Response
    {
        $studentId = $this->queryString($request, 'studentId');
        $sectionId = $this->queryString($request, 'sectionId');
        $studentId = $studentId === null ? null : (int) $studentId;
        $sectionId = $sectionId === null ? null : (int) $sectionId;
        if ($studentId === null && $sectionId === null) {
            throw HttpException::validation(['studentId' => 'validation.required']);
        }
        if ($sectionId !== null) {
            $this->sectionAccess->assertAccess($this->user($request), $sectionId);
        }
        $where = [];
        $params = [];
        if ($studentId !== null) {
            $user = $this->user($request);
            if (in_array($user->roleSlug, ['student', 'guardian'], true) && !in_array($studentId, $this->linkedStudentIds($user->id, $user->roleSlug), true)) {
                throw HttpException::forbidden();
            }
            $where[] = 'a.student_id = :student';
            $params['student'] = $studentId;
        }
        if ($sectionId !== null) {
            $where[] = 'a.section_id = :section';
            $params['section'] = $sectionId;
        }
        $from = $this->queryString($request, 'from');
        $to = $this->queryString($request, 'to');
        if ($from !== null) {
            $where[] = 'a.date >= :from';
            $params['from'] = $from;
        }
        if ($to !== null) {
            $where[] = 'a.date <= :to';
            $params['to'] = $to;
        }
        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $counts = $this->fetchAll(
            'SELECT a.status, COUNT(*) AS total FROM attendance_records a ' . $whereSql . ' GROUP BY a.status',
            $params,
        );
        $totals = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
        foreach ($counts as $row) {
            $totals[$row['status']] = (int) $row['total'];
        }
        $total = array_sum($totals);

        return Response::json([
            'counts' => $totals,
            'total' => $total,
            'attendanceRate' => $total === 0 ? null : round((($totals['present'] + $totals['late']) / $total) * 100, 1),
            'absenceRate' => $total === 0 ? null : round(($totals['absent'] / $total) * 100, 1),
        ]);
    }

    public function locks(Request $request): Response
    {
        $yearId = $this->queryString($request, 'academicYearId');
        $where = $yearId === null ? '' : 'WHERE l.academic_year_id = :year';
        $params = $yearId === null ? [] : ['year' => (int) $yearId];
        $rows = $this->fetchAll(
            'SELECT l.*, u.name AS locked_by_name, ru.name AS reopened_by_name FROM attendance_locks l
             LEFT JOIN users u ON u.id = l.locked_by LEFT JOIN users ru ON ru.id = l.reopened_by ' . $where . ' ORDER BY l.month DESC',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function lock(Request $request): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $month = $this->requiredString($request, 'month', 'month');
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            throw HttpException::validation(['month' => 'validation.invalid']);
        }
        $existing = $this->fetchOne('SELECT * FROM attendance_locks WHERE academic_year_id = :year AND month = :month', ['year' => $yearId, 'month' => $month]);
        if ($existing !== null) {
            $this->execute('UPDATE attendance_locks SET locked_by = :user, locked_at = :at, reopened_by = NULL, reopened_at = NULL, reason = :reason WHERE id = :id', [
                'user' => $this->user($request)->id,
                'at' => $this->now(),
                'reason' => $this->inputString($request, 'reason'),
                'id' => $existing['id'],
            ]);
        } else {
            $this->insert('attendance_locks', [
                'academic_year_id' => $yearId,
                'month' => $month,
                'locked_by' => $this->user($request)->id,
                'locked_at' => $this->now(),
                'reason' => $this->inputString($request, 'reason'),
            ]);
        }
        $this->audit($request, 'attendance', 'attendance.lock', 'academic_year', $yearId, null, ['month' => $month]);

        return Response::json($this->fetchOne('SELECT * FROM attendance_locks WHERE academic_year_id = :year AND month = :month', ['year' => $yearId, 'month' => $month]));
    }

    public function unlock(Request $request, int $id): Response
    {
        $lock = $this->fetchOne('SELECT * FROM attendance_locks WHERE id = :id', ['id' => $id]);
        if ($lock === null) {
            throw HttpException::notFound();
        }
        $reason = $this->requiredString($request, 'reason', 'reason');
        $this->execute('UPDATE attendance_locks SET reopened_by = :user, reopened_at = :at, reason = :reason WHERE id = :id', [
            'user' => $this->user($request)->id,
            'at' => $this->now(),
            'reason' => $reason,
            'id' => $id,
        ]);
        $this->audit($request, 'attendance', 'attendance.unlock', 'attendance_lock', $id, $lock, ['reason' => $reason]);

        return Response::json($this->fetchOne('SELECT * FROM attendance_locks WHERE id = :id', ['id' => $id]));
    }

    public function export(Request $request): Response
    {
        $sectionId = $this->intInput($request, 'sectionId');
        $from = $this->queryString($request, 'from');
        $to = $this->queryString($request, 'to');
        $where = [];
        $params = [];
        if ($sectionId !== null) {
            $where[] = 'a.section_id = :section';
            $params['section'] = $sectionId;
        }
        if ($from !== null) {
            $where[] = 'a.date >= :from';
            $params['from'] = $from;
        }
        if ($to !== null) {
            $where[] = 'a.date <= :to';
            $params['to'] = $to;
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $linked = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'a.student_id IN (' . ($linked === [] ? '0' : implode(',', $linked)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT a.date, st.admission_number, st.first_name, st.last_name, sec.name AS section_name, g.number AS grade_number,
                    p.label AS period, a.status, a.reason
             FROM attendance_records a JOIN students st ON st.id = a.student_id JOIN sections sec ON sec.id = a.section_id
             JOIN grade_levels g ON g.id = sec.grade_level_id LEFT JOIN periods p ON p.id = a.period_id
             ' . $whereSql . ' ORDER BY a.date, g.number, sec.name, st.last_name',
            $params,
        );

        return Csv::response(
            ['date', 'admission_number', 'first_name', 'last_name', 'section', 'grade', 'period', 'status', 'reason'],
            $rows,
            'attendance.csv',
        );
    }

    private function section(int $id): array
    {
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $id]);
        if ($section === null) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }

        return $section;
    }

    private function assertNotLocked(string $date): void
    {
        $month = substr($date, 0, 7);
        $lock = $this->fetchOne(
            'SELECT id FROM attendance_locks WHERE month = :month AND reopened_at IS NULL',
            ['month' => $month],
        );
        if ($lock !== null) {
            throw new HttpException(409, 'attendance_locked', 'attendance.monthLocked', 'Attendance for this month is locked.');
        }
    }

    private function studentForUser(int $userId): ?int
    {
        $row = $this->fetchOne('SELECT id FROM students WHERE user_id = :user', ['user' => $userId]);

        return $row === null ? null : (int) $row['id'];
    }

    /**
     * @return list<int>
     */
    private function linkedStudentIds(int $userId, string $role): array
    {
        if ($role === 'student') {
            return array_map(
                static fn (array $row): int => (int) $row['id'],
                $this->fetchAll('SELECT id FROM students WHERE user_id = :user', ['user' => $userId]),
            );
        }
        if ($role === 'guardian') {
            return array_map(
                static fn (array $row): int => (int) $row['student_id'],
                $this->fetchAll(
                    'SELECT sg.student_id FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE g.user_id = :user',
                    ['user' => $userId],
                ),
            );
        }

        return [];
    }

    /**
     * @param array{page: int, perPage: int, offset: int} $pagination
     * @return array<string, int>
     */
    private function paginationMeta(array $pagination, int $total): array
    {
        return [
            'page' => $pagination['page'],
            'perPage' => $pagination['perPage'],
            'total' => $total,
            'pages' => max(1, (int) ceil($total / $pagination['perPage'])),
        ];
    }
}