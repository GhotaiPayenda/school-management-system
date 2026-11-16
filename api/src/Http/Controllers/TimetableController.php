<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class TimetableController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function periods(Request $request, int $sectionId): Response
    {
        $this->section($sectionId);

        return Response::json([
            'items' => $this->fetchAll('SELECT * FROM periods WHERE section_id = :id ORDER BY sort_order', ['id' => $sectionId]),
        ]);
    }

    public function saveGrid(Request $request, int $sectionId): Response
    {
        $section = $this->section($sectionId);
        $before = $this->fetchAll('SELECT * FROM periods WHERE section_id = :id ORDER BY sort_order', ['id' => $sectionId]);
        $input = $request->input('periods');
        $periods = [];

        if (is_array($input) && $input !== []) {
            foreach ($input as $index => $entry) {
                if (!is_array($entry)) {
                    throw HttpException::validation(['periods' => 'validation.invalid']);
                }
                $start = (string) ($entry['startTime'] ?? '');
                $end = (string) ($entry['endTime'] ?? '');
                $kind = (string) ($entry['kind'] ?? 'period');
                if (!$this->validTime($start) || !$this->validTime($end) || $start >= $end) {
                    throw HttpException::validation(['periods' => 'validation.invalidTime']);
                }
                if (!in_array($kind, ['period', 'break'], true)) {
                    throw HttpException::validation(['periods' => 'validation.invalid']);
                }
                $periods[] = [
                    'sort_order' => $index + 1,
                    'kind' => $kind,
                    'label' => isset($entry['label']) ? trim((string) $entry['label']) : null,
                    'start_time' => $start,
                    'end_time' => $end,
                ];
            }
        } else {
            $start = $this->inputString($request, 'startTime') ?: '07:30';
            $count = max(1, min(16, $this->intInput($request, 'periodCount', 7) ?? 7));
            $minutes = max(20, min(120, $this->intInput($request, 'periodMinutes', 45) ?? 45));
            if (!$this->validTime($start)) {
                throw HttpException::validation(['startTime' => 'validation.invalidTime']);
            }
            $cursor = $start;
            $sort = 1;
            $breaks = $request->input('breaks');
            $breakAfter = [];
            if (is_array($breaks)) {
                foreach ($breaks as $break) {
                    if (is_array($break) && isset($break['afterPeriod'], $break['minutes'])) {
                        $breakAfter[(int) $break['afterPeriod']] = max(5, (int) $break['minutes']);
                    }
                }
            }
            for ($index = 0; $index < $count; $index++) {
                $end = $this->addMinutes($cursor, $minutes);
                $periods[] = ['sort_order' => $sort++, 'kind' => 'period', 'label' => 'Period ' . ($index + 1), 'start_time' => $cursor, 'end_time' => $end];
                $cursor = $end;
                if (isset($breakAfter[$index + 1])) {
                    $breakEnd = $this->addMinutes($cursor, $breakAfter[$index + 1]);
                    $periods[] = ['sort_order' => $sort++, 'kind' => 'break', 'label' => 'Break', 'start_time' => $cursor, 'end_time' => $breakEnd];
                    $cursor = $breakEnd;
                }
            }
        }

        $this->assertNoOverlap($periods);

        $this->transaction(function () use ($sectionId, $periods): void {
            $this->execute('DELETE FROM periods WHERE section_id = :id', ['id' => $sectionId]);
            foreach ($periods as $period) {
                $this->insert('periods', [
                    'section_id' => $sectionId,
                    'sort_order' => $period['sort_order'],
                    'kind' => $period['kind'],
                    'label' => $period['label'],
                    'start_time' => $period['start_time'],
                    'end_time' => $period['end_time'],
                    'created_at' => $this->now(),
                ]);
            }
        });

        $this->audit($request, 'timetable', 'period_grid.save', 'section', $sectionId, ['periods' => $before], ['periods' => $periods]);

        return Response::json(['items' => $this->fetchAll('SELECT * FROM periods WHERE section_id = :id ORDER BY sort_order', ['id' => $sectionId])]);
    }

    public function assignments(Request $request): Response
    {
        $yearId = $this->queryString($request, 'academicYearId');
        $where = $yearId === null ? '' : 'WHERE a.academic_year_id = :year';
        $params = $yearId === null ? [] : ['year' => (int) $yearId];
        $rows = $this->fetchAll(
            'SELECT a.*, s.code AS subject_code, s.name AS subject_name, st.first_name, st.last_name,
                    sec.name AS section_name, g.number AS grade_number, g.name AS grade_name
             FROM teaching_assignments a
             JOIN subjects s ON s.id = a.subject_id
             JOIN staff st ON st.id = a.teacher_staff_id
             JOIN sections sec ON sec.id = a.section_id
             JOIN grade_levels g ON g.id = sec.grade_level_id
             ' . $where . ' ORDER BY g.number, sec.name, s.code',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function createAssignment(Request $request): Response
    {
        $teacherId = $this->requiredInt($request, 'teacherStaffId', 'teacherStaffId');
        $subjectId = $this->requiredInt($request, 'subjectId', 'subjectId');
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $teacher = $this->fetchOne('SELECT * FROM staff WHERE id = :id AND status = \'active\'', ['id' => $teacherId]);
        if ($teacher === null || !(bool) $teacher['is_teacher']) {
            throw HttpException::validation(['teacherStaffId' => 'staff.notTeacher']);
        }
        $section = $this->section($sectionId);
        if ((int) $section['academic_year_id'] !== $yearId) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }
        $this->requireExists('subjects', $subjectId, 'subjectId');
        $this->requireExists('academic_years', $yearId, 'academicYearId');
        $this->ensureUnique(
            'SELECT id FROM teaching_assignments WHERE teacher_staff_id = :teacher AND subject_id = :subject AND section_id = :section AND academic_year_id = :year',
            ['teacher' => $teacherId, 'subject' => $subjectId, 'section' => $sectionId, 'year' => $yearId],
            'subjectId',
        );
        $id = $this->insert('teaching_assignments', [
            'teacher_staff_id' => $teacherId,
            'subject_id' => $subjectId,
            'section_id' => $sectionId,
            'academic_year_id' => $yearId,
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'timetable', 'assignment.create', 'teaching_assignment', $id, null, ['teacher' => $teacherId, 'subject' => $subjectId, 'section' => $sectionId]);

        return Response::json($this->fetchOne('SELECT * FROM teaching_assignments WHERE id = :id', ['id' => $id]), 201);
    }

    public function deleteAssignment(Request $request, int $id): Response
    {
        $assignment = $this->fetchOne('SELECT * FROM teaching_assignments WHERE id = :id', ['id' => $id]);
        if ($assignment === null) {
            throw HttpException::notFound();
        }
        $this->execute('DELETE FROM teaching_assignments WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'timetable', 'assignment.delete', 'teaching_assignment', $id, $assignment);

        return Response::noContent();
    }

    public function lessons(Request $request): Response
    {
        $sectionId = $this->queryString($request, 'sectionId');
        $where = $sectionId === null ? '' : 'WHERE l.section_id = :section';
        $params = $sectionId === null ? [] : ['section' => (int) $sectionId];
        $rows = $this->fetchAll(
            'SELECT l.*, p.start_time, p.end_time, p.kind, p.label AS period_label,
                    s.code AS subject_code, s.name AS subject_name, st.first_name, st.last_name, r.name AS room_name
             FROM lessons l
             JOIN periods p ON p.id = l.period_id
             JOIN teaching_assignments a ON a.id = l.teaching_assignment_id
             JOIN subjects s ON s.id = a.subject_id
             JOIN staff st ON st.id = a.teacher_staff_id
             LEFT JOIN rooms r ON r.id = l.room_id
             ' . $where . ' ORDER BY l.day_of_week, p.sort_order',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function createLesson(Request $request): Response
    {
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $periodId = $this->requiredInt($request, 'periodId', 'periodId');
        $assignmentId = $this->requiredInt($request, 'teachingAssignmentId', 'teachingAssignmentId');
        $day = $this->requiredInt($request, 'dayOfWeek', 'dayOfWeek');
        if ($day < 0 || $day > 6) {
            throw HttpException::validation(['dayOfWeek' => 'validation.invalid']);
        }
        $this->assertTeachingDay($day);
        $section = $this->section($sectionId);
        $period = $this->fetchOne('SELECT * FROM periods WHERE id = :id AND section_id = :section', ['id' => $periodId, 'section' => $sectionId]);
        if ($period === null || $period['kind'] !== 'period') {
            throw HttpException::validation(['periodId' => 'validation.invalid']);
        }
        $assignment = $this->fetchOne('SELECT * FROM teaching_assignments WHERE id = :id', ['id' => $assignmentId]);
        if ($assignment === null || (int) $assignment['section_id'] !== $sectionId || (int) $assignment['academic_year_id'] !== (int) $section['academic_year_id']) {
            throw HttpException::validation(['teachingAssignmentId' => 'validation.invalid']);
        }
        $this->ensureUnique(
            'SELECT id FROM lessons WHERE section_id = :section AND period_id = :period AND day_of_week = :day',
            ['section' => $sectionId, 'period' => $periodId, 'day' => $day],
            'periodId',
        );
        $roomId = $this->intInput($request, 'roomId');
        $this->assertNoLessonConflicts($sectionId, $assignmentId, $roomId, $day, $period);

        $id = $this->insert('lessons', [
            'section_id' => $sectionId,
            'period_id' => $periodId,
            'teaching_assignment_id' => $assignmentId,
            'day_of_week' => $day,
            'room_id' => $roomId,
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'timetable', 'lesson.create', 'lesson', $id, null, ['section' => $sectionId, 'day' => $day, 'period' => $periodId]);

        return Response::json($this->fetchOne('SELECT * FROM lessons WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateLesson(Request $request, int $id): Response
    {
        $lesson = $this->fetchOne('SELECT * FROM lessons WHERE id = :id', ['id' => $id]);
        if ($lesson === null) {
            throw HttpException::notFound();
        }
        $section = $this->section((int) $lesson['section_id']);
        $periodId = $request->input('periodId') !== null ? (int) $request->input('periodId') : (int) $lesson['period_id'];
        $period = $this->fetchOne('SELECT * FROM periods WHERE id = :id AND section_id = :section', ['id' => $periodId, 'section' => $lesson['section_id']]);
        if ($period === null || $period['kind'] !== 'period') {
            throw HttpException::validation(['periodId' => 'validation.invalid']);
        }
        $assignmentId = $request->input('teachingAssignmentId') !== null ? (int) $request->input('teachingAssignmentId') : (int) $lesson['teaching_assignment_id'];
        $day = $request->input('dayOfWeek') !== null ? (int) $request->input('dayOfWeek') : (int) $lesson['day_of_week'];
        $this->assertTeachingDay($day);
        $roomId = $request->input('roomId') !== null ? ($this->intInput($request, 'roomId')) : ($lesson['room_id'] === null ? null : (int) $lesson['room_id']);
        $this->assertNoLessonConflicts((int) $lesson['section_id'], $assignmentId, $roomId, $day, $period, $id);

        $values = ['period_id' => $periodId, 'teaching_assignment_id' => $assignmentId, 'day_of_week' => $day, 'room_id' => $roomId];
        $this->updateRow('lessons', $id, $values);
        $this->audit($request, 'timetable', 'lesson.update', 'lesson', $id, $lesson, $values);

        return Response::json($this->fetchOne('SELECT * FROM lessons WHERE id = :id', ['id' => $id]));
    }

    public function deleteLesson(Request $request, int $id): Response
    {
        $lesson = $this->fetchOne('SELECT * FROM lessons WHERE id = :id', ['id' => $id]);
        if ($lesson === null) {
            throw HttpException::notFound();
        }
        $this->execute('DELETE FROM lessons WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'timetable', 'lesson.delete', 'lesson', $id, $lesson);

        return Response::noContent();
    }

    public function sectionTimetable(Request $request, int $sectionId): Response
    {
        $section = $this->section($sectionId);
        $periods = $this->fetchAll('SELECT * FROM periods WHERE section_id = :id ORDER BY sort_order', ['id' => $sectionId]);
        $lessons = $this->fetchAll(
            'SELECT l.*, p.start_time, p.end_time, s.code AS subject_code, s.name AS subject_name,
                    st.first_name, st.last_name, r.name AS room_name
             FROM lessons l JOIN periods p ON p.id = l.period_id
             JOIN teaching_assignments a ON a.id = l.teaching_assignment_id
             JOIN subjects s ON s.id = a.subject_id JOIN staff st ON st.id = a.teacher_staff_id
             LEFT JOIN rooms r ON r.id = l.room_id
             WHERE l.section_id = :id',
            ['id' => $sectionId],
        );
        $grid = [];
        foreach ($lessons as $lesson) {
            $grid[$lesson['period_id']][$lesson['day_of_week']] = $lesson;
        }

        return Response::json([
            'section' => $section,
            'periods' => $periods,
            'lessons' => $grid,
            'teachingDays' => $this->teachingDays(),
        ]);
    }

    public function teacherTimetable(Request $request, int $staffId): Response
    {
        $rows = $this->fetchAll(
            'SELECT l.*, p.start_time, p.end_time, sec.name AS section_name, g.number AS grade_number,
                    s.code AS subject_code, s.name AS subject_name, r.name AS room_name
             FROM lessons l JOIN periods p ON p.id = l.period_id
             JOIN sections sec ON sec.id = l.section_id JOIN grade_levels g ON g.id = sec.grade_level_id
             JOIN teaching_assignments a ON a.id = l.teaching_assignment_id
             JOIN subjects s ON s.id = a.subject_id LEFT JOIN rooms r ON r.id = l.room_id
             WHERE a.teacher_staff_id = :id ORDER BY l.day_of_week, p.sort_order',
            ['id' => $staffId],
        );

        return Response::json(['items' => $rows, 'teachingDays' => $this->teachingDays()]);
    }

    public function roomTimetable(Request $request, int $roomId): Response
    {
        $rows = $this->fetchAll(
            'SELECT l.*, p.start_time, p.end_time, sec.name AS section_name, s.code AS subject_code, s.name AS subject_name,
                    st.first_name, st.last_name
             FROM lessons l JOIN periods p ON p.id = l.period_id JOIN sections sec ON sec.id = l.section_id
             JOIN teaching_assignments a ON a.id = l.teaching_assignment_id JOIN subjects s ON s.id = a.subject_id
             JOIN staff st ON st.id = a.teacher_staff_id
             WHERE l.room_id = :id ORDER BY l.day_of_week, p.sort_order',
            ['id' => $roomId],
        );

        return Response::json(['items' => $rows, 'teachingDays' => $this->teachingDays()]);
    }

    private function section(int $id): array
    {
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $id]);
        if ($section === null) {
            throw HttpException::notFound('academic.sectionNotFound', 'Section not found.');
        }

        return $section;
    }

    private function requireExists(string $table, int $id, string $field): void
    {
        if ($this->fetchOne('SELECT id FROM ' . $table . ' WHERE id = :id', ['id' => $id]) === null) {
            throw HttpException::validation([$field => 'validation.invalid']);
        }
    }

    private function validTime(string $time): bool
    {
        return (bool) preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time);
    }

    private function addMinutes(string $time, int $minutes): string
    {
        [$hour, $minute] = array_map('intval', explode(':', $time));
        $total = $hour * 60 + $minute + $minutes;

        return sprintf('%02d:%02d', intdiv($total, 60) % 24, $total % 60);
    }

    /**
     * @param list<array{start_time: string, end_time: string}> $periods
     */
    private function assertNoOverlap(array $periods): void
    {
        usort($periods, static fn (array $a, array $b): int => strcmp($a['start_time'], $b['start_time']));
        for ($index = 1; $index < count($periods); $index++) {
            if ($periods[$index]['start_time'] < $periods[$index - 1]['end_time']) {
                throw HttpException::validation(['periods' => 'timetable.overlap']);
            }
        }
    }

    private function assertTeachingDay(int $day): void
    {
        if (!in_array($day, $this->teachingDays(), true)) {
            throw HttpException::validation(['dayOfWeek' => 'timetable.notTeachingDay']);
        }
    }

    /**
     * @return list<int>
     */
    private function teachingDays(): array
    {
        $settings = $this->fetchOne('SELECT teaching_days FROM school_settings WHERE id = 1');
        $days = json_decode((string) ($settings['teaching_days'] ?? '[6,0,1,2,3,4]'), true);

        return is_array($days) ? array_map('intval', $days) : [6, 0, 1, 2, 3, 4];
    }

    private function assertNoLessonConflicts(int $sectionId, int $assignmentId, ?int $roomId, int $day, array $period, ?int $ignoreId = null): void
    {
        $assignment = $this->fetchOne('SELECT * FROM teaching_assignments WHERE id = :id', ['id' => $assignmentId]);
        if ($assignment === null) {
            throw HttpException::validation(['teachingAssignmentId' => 'validation.invalid']);
        }
        $params = [
            'day' => $day,
            'start' => $period['start_time'],
            'end' => $period['end_time'],
            'teacher' => $assignment['teacher_staff_id'],
        ];
        $ignore = $ignoreId === null ? '' : ' AND l.id <> :ignore';
        if ($ignoreId !== null) {
            $params['ignore'] = $ignoreId;
        }

        $teacherConflict = $this->fetchOne(
            'SELECT l.id FROM lessons l JOIN periods p ON p.id = l.period_id
             JOIN teaching_assignments a ON a.id = l.teaching_assignment_id
             WHERE l.day_of_week = :day AND a.teacher_staff_id = :teacher
               AND p.start_time < :end AND p.end_time > :start' . $ignore . ' LIMIT 1',
            $params,
        );
        if ($teacherConflict !== null) {
            throw HttpException::validation(['teachingAssignmentId' => 'timetable.teacherConflict']);
        }

        if ($roomId !== null) {
            $roomParams = $params;
            $roomParams['room'] = $roomId;
            $roomConflict = $this->fetchOne(
                'SELECT l.id FROM lessons l JOIN periods p ON p.id = l.period_id
                 WHERE l.day_of_week = :day AND l.room_id = :room
                   AND p.start_time < :end AND p.end_time > :start' . $ignore . ' LIMIT 1',
                $roomParams,
            );
            if ($roomConflict !== null) {
                throw HttpException::validation(['roomId' => 'timetable.roomConflict']);
            }
        }

        $sectionParams = $params;
        $sectionParams['section'] = $sectionId;
        $sectionConflict = $this->fetchOne(
            'SELECT l.id FROM lessons l JOIN periods p ON p.id = l.period_id
             WHERE l.day_of_week = :day AND l.section_id = :section
               AND p.start_time < :end AND p.end_time > :start' . $ignore . ' LIMIT 1',
            $sectionParams,
        );
        if ($sectionConflict !== null) {
            throw HttpException::validation(['periodId' => 'timetable.sectionConflict']);
        }
    }
}