<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Auth\User;
use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class PortalController
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function overview(Request $request): Response
    {
        $user = \Meridian\Api\Http\Middleware\AuthMiddleware::context($request)->user;
        if ($user === null) {
            throw HttpException::unauthorized();
        }
        $overview = $this->buildOverview($request, $user);
        $overview['user'] = $user->toArray();
        $overview['role'] = ['slug' => $user->roleSlug, 'name' => $user->roleName];

        return Response::json($overview);
    }

    public function children(Request $request): Response
    {
        $user = $this->user($request);
        $students = $this->linkedStudents($user);
        $items = array_map(fn (array $student): array => $this->childSummary($student), $students);

        return Response::json(['items' => $items]);
    }

    public function childOverview(Request $request, int $studentId): Response
    {
        $user = $this->user($request);
        $students = $this->linkedStudents($user);
        $match = null;
        foreach ($students as $student) {
            if ((int) $student['id'] === $studentId) {
                $match = $student;
                break;
            }
        }
        if ($match === null) {
            throw HttpException::forbidden();
        }
        $this->assertLinked($user, $studentId);
        $summary = $this->childSummary($match);
        $summary['timetable'] = $this->todayTimetable((int) $match['section_id']);
        $summary['invoices'] = $this->studentInvoices($studentId);
        $summary['loans'] = $this->studentLoans($studentId);
        $summary['attendance'] = $this->attendanceSummary($studentId, (int) $match['academic_year_id']);
        $summary['subjects'] = $this->subjectResults($studentId, (int) $match['academic_year_id']);

        return Response::json($summary);
    }

    /**
     * @return array<string, mixed>
     */
    public function buildOverview(Request $request, User $user): array
    {
        $students = $this->linkedStudents($user);
        if ($students === []) {
            return [
                'cards' => [
                    ['key' => 'children', 'label' => 'Linked students', 'value' => 0, 'hint' => 'Ask the Registrar to link your account'],
                ],
                'tasks' => [],
                'children' => [],
                'charts' => [],
            ];
        }
        $items = [];
        $averages = [];
        $outstanding = 0.0;
        $attendanceRates = [];
        $openLoans = 0;
        foreach ($students as $student) {
            $summary = $this->childSummary($student);
            $items[] = $summary;
            if ($summary['average'] !== null) {
                $averages[] = $summary['average'];
            }
            if ($summary['attendanceRate'] !== null) {
                $attendanceRates[] = $summary['attendanceRate'];
            }
            $outstanding += (float) $summary['outstanding'];
            $openLoans += (int) $summary['openLoans'];
        }
        $average = $averages === [] ? null : round(array_sum($averages) / count($averages), 1);
        $attendance = $attendanceRates === [] ? null : round(array_sum($attendanceRates) / count($attendanceRates), 1);
        $first = $items[0];
        $cards = [
            ['key' => 'attendance', 'label' => 'Attendance', 'value' => $attendance, 'format' => 'percent', 'hint' => 'Current Academic Year'],
            ['key' => 'average', 'label' => 'Overall average', 'value' => $average, 'hint' => $average === null ? 'No published scores yet' : 'Equal-weight subject mean'],
            ['key' => 'outstanding', 'label' => 'Outstanding fees', 'value' => round($outstanding, 2), 'format' => 'currency'],
            ['key' => 'loans', 'label' => 'Library loans', 'value' => $openLoans, 'hint' => 'Open items'],
        ];
        $tasks = [];
        foreach ($items as $item) {
            if ($item['outstanding'] > 0) {
                $tasks[] = ['key' => 'fees-' . $item['id'], 'label' => 'Unpaid fees for ' . $item['firstName'], 'count' => 1, 'to' => '/portal/fees'];
            }
            if ($item['openLoans'] > 0) {
                $tasks[] = ['key' => 'loans-' . $item['id'], 'label' => 'Library books with ' . $item['firstName'], 'count' => $item['openLoans'], 'to' => '/portal/library'];
            }
        }

        return [
            'cards' => $cards,
            'tasks' => $tasks,
            'children' => $items,
            'charts' => [
                'subjects' => $first['subjects'] ?? [],
            ],
        ];
    }

    private function childSummary(array $student): array
    {
        $yearId = $student['academic_year_id'] === null ? null : (int) $student['academic_year_id'];
        $attendance = $yearId === null ? ['counts' => [], 'total' => 0, 'rate' => null] : $this->attendanceSummary((int) $student['id'], $yearId);
        $annual = $yearId === null ? ['average' => null, 'letterGrade' => null, 'subjects' => []] : $this->resultSummary((int) $student['id'], $yearId);
        $outstanding = (float) $this->scalar(
            'SELECT COALESCE(SUM(balance), 0) FROM invoices WHERE student_id = :student AND status IN (\'issued\', \'partially_paid\', \'overdue\')',
            ['student' => $student['id']],
        );
        $openLoans = (int) $this->scalar('SELECT COUNT(*) FROM loans WHERE borrower_type = \'student\' AND borrower_id = :student AND status = \'open\'', ['student' => $student['id']]);

        return [
            'id' => (int) $student['id'],
            'admissionNumber' => $student['admission_number'],
            'firstName' => $student['first_name'],
            'lastName' => $student['last_name'],
            'nameFa' => $student['name_fa'],
            'namePs' => $student['name_ps'],
            'sectionId' => $student['section_id'] === null ? null : (int) $student['section_id'],
            'sectionName' => $student['section_name'],
            'gradeNumber' => $student['grade_number'],
            'gradeName' => $student['grade_name'],
            'academicYearId' => $yearId,
            'academicYearLabel' => $student['academic_year_label'],
            'attendance' => $attendance,
            'attendanceRate' => $attendance['rate'],
            'average' => $annual['average'],
            'letterGrade' => $annual['letterGrade'],
            'subjects' => $annual['subjects'],
            'outstanding' => round($outstanding, 2),
            'openLoans' => $openLoans,
        ];
    }

    private function linkedStudents(User $user): array
    {
        if ($user->roleSlug === 'student') {
            return $this->studentsFor('st.user_id = :user', ['user' => $user->id]);
        }
        if ($user->roleSlug === 'guardian') {
            return $this->studentsFor(
                'st.id IN (SELECT sg.student_id FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE g.user_id = :user)',
                ['user' => $user->id],
            );
        }
        if (in_array($user->roleSlug, ['super-admin', 'principal'], true)) {
            return $this->studentsFor('1 = 1', []);
        }

        return [];
    }

    private function studentsFor(string $where, array $params): array
    {
        return $this->rows(
            'SELECT st.*, e.section_id, e.academic_year_id, sec.name AS section_name, g.number AS grade_number,
                    g.name AS grade_name, y.label AS academic_year_label
             FROM students st
             LEFT JOIN enrollments e ON e.student_id = st.id AND e.status = \'active\'
             LEFT JOIN sections sec ON sec.id = e.section_id
             LEFT JOIN grade_levels g ON g.id = sec.grade_level_id
             LEFT JOIN academic_years y ON y.id = e.academic_year_id
             WHERE ' . $where . ' ORDER BY st.last_name, st.first_name',
            $params,
        );
    }

    private function attendanceSummary(int $studentId, int $yearId): array
    {
        $rows = $this->rows(
            'SELECT a.status, COUNT(*) AS total FROM attendance_records a JOIN academic_years y ON y.id = :year
             WHERE a.student_id = :student AND a.date BETWEEN y.start_date AND y.end_date GROUP BY a.status',
            ['student' => $studentId, 'year' => $yearId],
        );
        $counts = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
        foreach ($rows as $row) {
            $counts[$row['status']] = (int) $row['total'];
        }
        $total = array_sum($counts);

        return [
            'counts' => $counts,
            'total' => $total,
            'rate' => $total === 0 ? null : round((($counts['present'] + $counts['late']) / $total) * 100, 1),
        ];
    }

    private function resultSummary(int $studentId, int $yearId): array
    {
        $subjects = $this->subjectResults($studentId, $yearId);
        $scores = array_values(array_filter(array_map(static fn (array $subject): ?float => $subject['published'] ? $subject['score'] : null, $subjects), static fn (?float $score): bool => $score !== null));
        $average = $scores === [] ? null : round(array_sum($scores) / count($scores), 1);

        return [
            'subjects' => $subjects,
            'average' => $average,
            'letterGrade' => $average === null ? null : $this->letterFor($average),
        ];
    }

    private function subjectResults(int $studentId, int $yearId): array
    {
        $enrollment = $this->row(
            'SELECT sec.grade_level_id FROM enrollments e JOIN sections sec ON sec.id = e.section_id
             WHERE e.student_id = :student AND e.academic_year_id = :year AND e.status = \'active\'',
            ['student' => $studentId, 'year' => $yearId],
        );
        $subjects = $enrollment === null ? [] : $this->rows(
            'SELECT s.id, s.code, s.name, s.name_fa, s.name_ps FROM curriculum c JOIN subjects s ON s.id = c.subject_id
             WHERE c.academic_year_id = :year AND c.grade_level_id = :grade AND s.has_exam = 1 AND s.status = \'active\' ORDER BY s.code',
            ['year' => $yearId, 'grade' => $enrollment['grade_level_id']],
        );
        if ($subjects === []) {
            $subjects = $this->rows(
                'SELECT s.id, s.code, s.name, s.name_fa, s.name_ps FROM subjects s WHERE s.has_exam = 1 AND s.status = \'active\'
                 AND EXISTS (SELECT 1 FROM exams e WHERE e.subject_id = s.id AND e.academic_year_id = :year) ORDER BY s.code',
                ['year' => $yearId],
            );
        }
        $result = [];
        foreach ($subjects as $subject) {
            $exams = $this->rows('SELECT * FROM exams WHERE subject_id = :subject AND academic_year_id = :year', ['subject' => $subject['id'], 'year' => $yearId]);
            $first = 0;
            $final = 0;
            $published = false;
            foreach ($exams as $exam) {
                $score = $this->row('SELECT * FROM exam_scores WHERE exam_id = :exam AND student_id = :student', ['exam' => $exam['id'], 'student' => $studentId]);
                $value = $score === null || (bool) $score['is_draft'] ? 0 : (int) ($score['score'] ?? 0);
                if ($score !== null && !(bool) $score['is_draft']) {
                    $published = true;
                }
                if ($exam['type'] === 'first') {
                    $first = $value;
                } else {
                    $final = $value;
                }
            }
            $supplementary = $this->row('SELECT * FROM supplementary_exams WHERE student_id = :student AND subject_id = :subject AND academic_year_id = :year', ['student' => $studentId, 'subject' => $subject['id'], 'year' => $yearId]);
            $raw = $first + $final;
            $score = $supplementary === null ? $raw : max($raw, min(40, (int) $supplementary['score']));
            $result[] = [
                'subjectId' => (int) $subject['id'],
                'code' => $subject['code'],
                'name' => $subject['name'],
                'nameFa' => $subject['name_fa'],
                'namePs' => $subject['name_ps'],
                'firstScore' => $first,
                'finalScore' => $final,
                'score' => $score,
                'letterGrade' => $this->letterFor($score),
                'published' => $published,
                'supplementary' => $supplementary === null ? null : (int) $supplementary['score'],
            ];
        }

        return $result;
    }

    private function todayTimetable(?int $sectionId): array
    {
        if ($sectionId === null) {
            return [];
        }
        $day = (int) gmdate('w');

        return $this->rows(
            'SELECT l.day_of_week, p.label AS period_label, p.start_time, p.end_time, s.code AS subject_code, s.name AS subject_name,
                    st.first_name, st.last_name, r.name AS room_name
             FROM lessons l JOIN periods p ON p.id = l.period_id JOIN teaching_assignments a ON a.id = l.teaching_assignment_id
             JOIN subjects s ON s.id = a.subject_id JOIN staff st ON st.id = a.teacher_staff_id LEFT JOIN rooms r ON r.id = l.room_id
             WHERE l.section_id = :section AND l.day_of_week = :day ORDER BY p.sort_order',
            ['section' => $sectionId, 'day' => $day],
        );
    }

    private function studentInvoices(int $studentId): array
    {
        return $this->rows(
            'SELECT id, invoice_number, billing_period, status, total, paid_total, balance, due_date
             FROM invoices WHERE student_id = :student ORDER BY billing_period DESC LIMIT 24',
            ['student' => $studentId],
        );
    }

    private function studentLoans(int $studentId): array
    {
        return $this->rows(
            'SELECT l.*, c.accession_number, t.title, t.author FROM loans l JOIN library_copies c ON c.id = l.copy_id
             JOIN library_titles t ON t.id = c.title_id WHERE l.borrower_type = \'student\' AND l.borrower_id = :student
             ORDER BY l.issued_at DESC LIMIT 20',
            ['student' => $studentId],
        );
    }

    private function assertLinked(User $user, int $studentId): void
    {
        if ($user->roleSlug === 'student') {
            $row = $this->row('SELECT id FROM students WHERE id = :student AND user_id = :user', ['student' => $studentId, 'user' => $user->id]);
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        if ($user->roleSlug === 'guardian') {
            $row = $this->row(
                'SELECT 1 FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE sg.student_id = :student AND g.user_id = :user',
                ['student' => $studentId, 'user' => $user->id],
            );
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        if (!in_array($user->roleSlug, ['super-admin', 'principal'], true)) {
            throw HttpException::forbidden();
        }
    }

    private function letterFor(float $score): string
    {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 40) return 'D';

        return 'F';
    }

    private function user(Request $request): User
    {
        $user = \Meridian\Api\Http\Middleware\AuthMiddleware::context($request)->user;
        if ($user === null) {
            throw HttpException::unauthorized();
        }

        return $user;
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