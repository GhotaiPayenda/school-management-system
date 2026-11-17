<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Access\SectionAccess;
use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
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
}
