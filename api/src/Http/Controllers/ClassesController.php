<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Access\SectionAccess;
use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Support\TimetableGrid;
use PDO;

/**
 * The Classes read model: one card per Section across Academic Years.
 */
final class ClassesController extends Controller
{
    private readonly SectionAccess $sectionAccess;

    public function __construct(PDO $db)
    {
        parent::__construct($db);
        $this->sectionAccess = new SectionAccess($db);
    }

    public function index(Request $request): Response
    {
        $years = $this->fetchAll(
            'SELECT id, label, start_date, end_date, is_current FROM academic_years ORDER BY start_date DESC, id DESC',
        );

        $currentYearId = null;
        foreach ($years as $year) {
            if ((int) $year['is_current'] === 1) {
                $currentYearId = (int) $year['id'];
                break;
            }
        }

        $allYears = in_array($this->queryString($request, 'allYears'), ['1', 'true'], true);
        $selectedYearId = null;

        if (!$allYears) {
            $requestedYear = $this->queryString($request, 'academicYearId');
            if ($requestedYear === null) {
                $selectedYearId = $currentYearId ?? (isset($years[0]) ? (int) $years[0]['id'] : null);
            } else {
                if (!ctype_digit($requestedYear)) {
                    throw HttpException::validation(['academicYearId' => 'validation.invalid']);
                }
                $selectedYearId = (int) $requestedYear;
                $known = array_map(static fn (array $year): int => (int) $year['id'], $years);
                if (!in_array($selectedYearId, $known, true)) {
                    throw HttpException::validation(['academicYearId' => 'validation.invalid']);
                }
            }
        }

        $scope = $this->sectionAccess->scope($this->user($request), 's');
        $where = [$scope['sql']];
        $params = $scope['params'];
        if ($selectedYearId !== null) {
            $where[] = 's.academic_year_id = :selected_year';
            $params['selected_year'] = $selectedYearId;
        }
        $whereSql = implode(' AND ', $where);

        $rows = $this->fetchAll(
            'SELECT s.id, s.name, s.academic_year_id, s.grade_level_id, s.capacity, s.homeroom_teacher_id,
                    g.number AS grade_number, g.name AS grade_name, g.name_fa AS grade_name_fa, g.name_ps AS grade_name_ps,
                    y.label AS academic_year_label, y.start_date AS academic_year_start_date, y.is_current AS is_current_year,
                    st.first_name || \' \' || st.last_name AS homeroom_teacher_name,
                    (SELECT COUNT(*) FROM enrollments e WHERE e.section_id = s.id AND e.status = \'active\') AS active_students,
                    (SELECT COUNT(*) FROM enrollments e WHERE e.section_id = s.id AND e.status <> \'active\') AS inactive_students,
                    (SELECT COUNT(*) FROM curriculum c
                     WHERE c.academic_year_id = s.academic_year_id AND c.grade_level_id = s.grade_level_id) AS subject_count,
                    (SELECT COUNT(*) FROM curriculum c
                     WHERE c.academic_year_id = s.academic_year_id AND c.grade_level_id = s.grade_level_id
                       AND NOT EXISTS (
                           SELECT 1 FROM teaching_assignments ta
                           WHERE ta.section_id = s.id AND ta.subject_id = c.subject_id
                             AND ta.academic_year_id = s.academic_year_id
                       )) AS unassigned_subject_count
             FROM sections s
             JOIN grade_levels g ON g.id = s.grade_level_id
             JOIN academic_years y ON y.id = s.academic_year_id
             LEFT JOIN staff st ON st.id = s.homeroom_teacher_id
             WHERE ' . $whereSql . '
             ORDER BY y.start_date DESC, g.number ASC, s.name ASC',
            $params,
        );

        $attendance = $this->fetchAll(
            'SELECT t.section_id AS section_id,
                    SUM(CASE WHEN t.collapsed_status IN (\'present\', \'late\') THEN 1 ELSE 0 END) AS credited,
                    COUNT(*) AS total
             FROM (
                 SELECT a.section_id, a.student_id, a.date,
                        COALESCE(
                            MAX(CASE WHEN a.period_id IS NULL THEN a.status END),
                            CASE
                                WHEN SUM(CASE WHEN a.status = \'absent\' THEN 1 ELSE 0 END) > 0 THEN \'absent\'
                                WHEN SUM(CASE WHEN a.status = \'late\' THEN 1 ELSE 0 END) > 0 THEN \'late\'
                                WHEN SUM(CASE WHEN a.status = \'excused\' THEN 1 ELSE 0 END) > 0 THEN \'excused\'
                                ELSE \'present\'
                            END
                        ) AS collapsed_status
                 FROM attendance_records a
                 JOIN sections s ON s.id = a.section_id
                 JOIN academic_years y ON y.id = s.academic_year_id
                 WHERE ' . $whereSql . '
                   AND a.date >= y.start_date AND a.date <= y.end_date
                 GROUP BY a.section_id, a.student_id, a.date
             ) t
             GROUP BY t.section_id',
            $params,
        );

        $rates = [];
        foreach ($attendance as $row) {
            $total = (int) $row['total'];
            $rates[(int) $row['section_id']] = $total === 0
                ? null
                : round((((int) $row['credited']) / $total) * 100, 1);
        }

        $classes = array_map(static function (array $row) use ($rates): array {
            $id = (int) $row['id'];

            return [
                'id' => $id,
                'name' => $row['name'],
                'grade_level_id' => (int) $row['grade_level_id'],
                'grade_number' => (int) $row['grade_number'],
                'grade_name' => $row['grade_name'],
                'grade_name_fa' => $row['grade_name_fa'],
                'grade_name_ps' => $row['grade_name_ps'],
                'academic_year_id' => (int) $row['academic_year_id'],
                'academic_year_label' => $row['academic_year_label'],
                'academic_year_start_date' => $row['academic_year_start_date'],
                'is_current_year' => (int) $row['is_current_year'],
                'capacity' => (int) $row['capacity'],
                'active_students' => (int) $row['active_students'],
                'inactive_students' => (int) $row['inactive_students'],
                'homeroom_teacher_id' => $row['homeroom_teacher_id'] === null ? null : (int) $row['homeroom_teacher_id'],
                'homeroom_teacher_name' => $row['homeroom_teacher_name'] === null ? null : trim((string) $row['homeroom_teacher_name']),
                'subject_count' => (int) $row['subject_count'],
                'unassigned_subject_count' => (int) $row['unassigned_subject_count'],
                'attendance_rate' => $rates[$id] ?? null,
            ];
        }, $rows);

        $yearRows = array_map(static fn (array $year): array => [
            'id' => (int) $year['id'],
            'label' => $year['label'],
            'start_date' => $year['start_date'],
            'end_date' => $year['end_date'],
            'is_current' => (int) $year['is_current'],
        ], $years);

        return Response::json([
            'years' => $yearRows,
            'current_academic_year_id' => $currentYearId,
            'selected_academic_year_id' => $selectedYearId,
            'all_years' => $allYears,
            'classes' => $classes,
        ]);
    }

    public function profile(Request $request, int $sectionId): Response
    {
        $section = $this->fetchOne(
            'SELECT s.id, s.name, s.academic_year_id, s.grade_level_id, s.capacity, s.homeroom_teacher_id,
                    g.number AS grade_number, g.name AS grade_name,
                    g.name_fa AS grade_name_fa, g.name_ps AS grade_name_ps,
                    y.label AS academic_year_label, y.start_date AS academic_year_start_date,
                    y.end_date AS academic_year_end_date, y.is_current AS is_current_year,
                    st.first_name || \' \' || st.last_name AS homeroom_teacher_name
             FROM sections s
             JOIN grade_levels g ON g.id = s.grade_level_id
             JOIN academic_years y ON y.id = s.academic_year_id
             LEFT JOIN staff st ON st.id = s.homeroom_teacher_id
             WHERE s.id = :id',
            ['id' => $sectionId],
        );

        if ($section === null) {
            throw HttpException::notFound('academic.sectionNotFound', 'Section not found.');
        }

        $this->sectionAccess->assertAccess($this->user($request), $sectionId);

        $yearId = (int) $section['academic_year_id'];
        $gradeId = (int) $section['grade_level_id'];

        $students = $this->fetchAll(
            'SELECT st.id, st.admission_number, st.first_name, st.last_name,
                    st.name_fa, st.name_ps, st.gender, st.status AS student_status,
                    e.id AS enrollment_id, e.status AS enrollment_status,
                    e.started_at, e.ended_at
             FROM enrollments e
             JOIN students st ON st.id = e.student_id
             WHERE e.section_id = :section
             ORDER BY CASE e.status WHEN \'active\' THEN 0 ELSE 1 END, st.last_name ASC, st.first_name ASC',
            ['section' => $sectionId],
        );

        $activeStudents = 0;
        $inactiveStudents = 0;
        $studentRows = array_map(static function (array $row) use (&$activeStudents, &$inactiveStudents): array {
            $isActive = $row['enrollment_status'] === 'active';
            if ($isActive) {
                $activeStudents++;
            } else {
                $inactiveStudents++;
            }

            return [
                'id' => (int) $row['id'],
                'admission_number' => $row['admission_number'],
                'first_name' => $row['first_name'],
                'last_name' => $row['last_name'],
                'name_fa' => $row['name_fa'],
                'name_ps' => $row['name_ps'],
                'gender' => $row['gender'],
                'student_status' => $row['student_status'],
                'enrollment_id' => (int) $row['enrollment_id'],
                'enrollment_status' => $row['enrollment_status'],
                'started_at' => $row['started_at'],
                'ended_at' => $row['ended_at'],
            ];
        }, $students);

        $counts = $this->fetchOne(
            'SELECT
                (SELECT COUNT(*) FROM curriculum c
                 WHERE c.academic_year_id = :subject_year AND c.grade_level_id = :subject_grade) AS subject_count,
                (SELECT COUNT(*) FROM curriculum c
                 WHERE c.academic_year_id = :unassigned_year AND c.grade_level_id = :unassigned_grade
                   AND NOT EXISTS (
                       SELECT 1 FROM teaching_assignments ta
                       WHERE ta.section_id = :unassigned_section AND ta.subject_id = c.subject_id
                         AND ta.academic_year_id = :unassigned_year_match
                   )) AS unassigned_subject_count,
                (SELECT COUNT(DISTINCT ta.teacher_staff_id) FROM teaching_assignments ta
                 WHERE ta.section_id = :teacher_section) AS teacher_count',
            [
                'subject_year' => $yearId,
                'subject_grade' => $gradeId,
                'unassigned_year' => $yearId,
                'unassigned_grade' => $gradeId,
                'unassigned_section' => $sectionId,
                'unassigned_year_match' => $yearId,
                'teacher_section' => $sectionId,
            ],
        );

        $siblings = $this->fetchAll(
            'SELECT s.id, s.academic_year_id, y.label AS academic_year_label,
                    y.start_date, y.is_current
             FROM sections s
             JOIN academic_years y ON y.id = s.academic_year_id
             WHERE s.grade_level_id = :sibling_grade AND s.name = :sibling_name AND s.id <> :sibling_section
             ORDER BY y.start_date DESC, s.id DESC',
            [
                'sibling_grade' => $gradeId,
                'sibling_name' => $section['name'],
                'sibling_section' => $sectionId,
            ],
        );

        $years = $this->fetchAll(
            'SELECT id, label, start_date, end_date, is_current FROM academic_years ORDER BY start_date DESC, id DESC',
        );

        $assignmentRows = $this->fetchAll(
            'SELECT a.teacher_staff_id, st.first_name, st.last_name, st.name_fa, st.name_ps,
                    s.id AS subject_id, s.code, s.name AS subject_name,
                    s.name_fa AS subject_name_fa, s.name_ps AS subject_name_ps
             FROM teaching_assignments a
             JOIN staff st ON st.id = a.teacher_staff_id
             JOIN subjects s ON s.id = a.subject_id
             WHERE a.section_id = :assignment_section AND a.academic_year_id = :assignment_year
             ORDER BY st.last_name ASC, st.first_name ASC, s.name ASC',
            ['assignment_section' => $sectionId, 'assignment_year' => $yearId],
        );

        $homeroomId = $section['homeroom_teacher_id'] === null ? 0 : (int) $section['homeroom_teacher_id'];
        $teacherMap = [];
        foreach ($assignmentRows as $row) {
            $staffId = (int) $row['teacher_staff_id'];
            if (!isset($teacherMap[$staffId])) {
                $teacherMap[$staffId] = [
                    'staff_id' => $staffId,
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'],
                    'name_fa' => $row['name_fa'],
                    'name_ps' => $row['name_ps'],
                    'is_homeroom' => $staffId === $homeroomId,
                    'subjects' => [],
                ];
            }
            $teacherMap[$staffId]['subjects'][] = [
                'id' => (int) $row['subject_id'],
                'code' => $row['code'],
                'name' => $row['subject_name'],
                'name_fa' => $row['subject_name_fa'],
                'name_ps' => $row['subject_name_ps'],
            ];
        }

        $teachers = array_values($teacherMap);
        usort($teachers, static function (array $left, array $right): int {
            if ($left['is_homeroom'] !== $right['is_homeroom']) {
                return $left['is_homeroom'] ? -1 : 1;
            }

            return [$left['last_name'], $left['first_name']] <=> [$right['last_name'], $right['first_name']];
        });

        $curriculumRows = $this->fetchAll(
            'SELECT c.subject_id, c.weekly_periods, c.is_elective,
                    s.code, s.name AS subject_name, s.name_fa AS subject_name_fa, s.name_ps AS subject_name_ps,
                    (SELECT ta.teacher_staff_id FROM teaching_assignments ta
                     WHERE ta.section_id = :curriculum_teacher_section AND ta.subject_id = c.subject_id
                       AND ta.academic_year_id = c.academic_year_id ORDER BY ta.id LIMIT 1) AS teacher_staff_id,
                    (SELECT st2.first_name || \' \' || st2.last_name FROM teaching_assignments ta
                     JOIN staff st2 ON st2.id = ta.teacher_staff_id
                     WHERE ta.section_id = :curriculum_name_section AND ta.subject_id = c.subject_id
                       AND ta.academic_year_id = c.academic_year_id ORDER BY ta.id LIMIT 1) AS teacher_name
             FROM curriculum c
             JOIN subjects s ON s.id = c.subject_id
             WHERE c.academic_year_id = :curriculum_year AND c.grade_level_id = :curriculum_grade
             ORDER BY s.name ASC',
            [
                'curriculum_teacher_section' => $sectionId,
                'curriculum_name_section' => $sectionId,
                'curriculum_year' => $yearId,
                'curriculum_grade' => $gradeId,
            ],
        );

        $curriculum = array_map(static fn (array $row): array => [
            'subject_id' => (int) $row['subject_id'],
            'code' => $row['code'],
            'name' => $row['subject_name'],
            'name_fa' => $row['subject_name_fa'],
            'name_ps' => $row['subject_name_ps'],
            'weekly_periods' => (int) $row['weekly_periods'],
            'is_elective' => (int) $row['is_elective'],
            'teacher_staff_id' => $row['teacher_staff_id'] === null ? null : (int) $row['teacher_staff_id'],
            'teacher_name' => $row['teacher_name'] === null ? null : trim((string) $row['teacher_name']),
        ], $curriculumRows);

        return Response::json([
            'section' => [
                'id' => (int) $section['id'],
                'name' => $section['name'],
                'academic_year_id' => $yearId,
                'academic_year_label' => $section['academic_year_label'],
                'academic_year_start_date' => $section['academic_year_start_date'],
                'academic_year_end_date' => $section['academic_year_end_date'],
                'is_current_year' => (int) $section['is_current_year'],
                'grade_level_id' => $gradeId,
                'grade_number' => (int) $section['grade_number'],
                'grade_name' => $section['grade_name'],
                'grade_name_fa' => $section['grade_name_fa'],
                'grade_name_ps' => $section['grade_name_ps'],
                'capacity' => (int) $section['capacity'],
                'homeroom_teacher_id' => $section['homeroom_teacher_id'] === null ? null : (int) $section['homeroom_teacher_id'],
                'homeroom_teacher_name' => $section['homeroom_teacher_name'] === null
                    ? null
                    : trim((string) $section['homeroom_teacher_name']),
            ],
            'counts' => [
                'active_students' => $activeStudents,
                'inactive_students' => $inactiveStudents,
                'capacity' => (int) $section['capacity'],
                'subject_count' => (int) ($counts['subject_count'] ?? 0),
                'unassigned_subject_count' => (int) ($counts['unassigned_subject_count'] ?? 0),
                'teacher_count' => (int) ($counts['teacher_count'] ?? 0),
            ],
            'academic_years' => array_map(static fn (array $year): array => [
                'id' => (int) $year['id'],
                'label' => $year['label'],
                'start_date' => $year['start_date'],
                'end_date' => $year['end_date'],
                'is_current' => (int) $year['is_current'],
            ], $years),
            'siblings' => array_map(static fn (array $row): array => [
                'id' => (int) $row['id'],
                'academic_year_id' => (int) $row['academic_year_id'],
                'academic_year_label' => $row['academic_year_label'],
                'start_date' => $row['start_date'],
                'is_current' => (int) $row['is_current'],
            ], $siblings),
            'teachers' => $teachers,
            'curriculum' => $curriculum,
            'timetable' => TimetableGrid::forSection($this->db, $sectionId),
            'students' => $studentRows,
        ]);
    }
}
