<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class ExamController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function exams(Request $request): Response
    {
        $yearId = $this->queryString($request, 'academicYearId');
        $subjectId = $this->queryString($request, 'subjectId');
        $where = [];
        $params = [];
        if ($yearId !== null) {
            $where[] = 'e.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        if ($subjectId !== null) {
            $where[] = 'e.subject_id = :subject';
            $params['subject'] = (int) $subjectId;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT e.*, s.code AS subject_code, s.name AS subject_name, y.label AS academic_year_label, sem.name AS semester_name,
                    (SELECT COUNT(*) FROM exam_scores sc WHERE sc.exam_id = e.id AND sc.is_draft = 0) AS published_scores
             FROM exams e JOIN subjects s ON s.id = e.subject_id JOIN academic_years y ON y.id = e.academic_year_id
             JOIN semesters sem ON sem.id = e.semester_id ' . $whereSql . ' ORDER BY y.start_date DESC, s.code, e.type',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function createExam(Request $request): Response
    {
        $subjectId = $this->requiredInt($request, 'subjectId', 'subjectId');
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $semesterId = $this->requiredInt($request, 'semesterId', 'semesterId');
        $type = $this->ensureOneOf($request, 'type', ['first', 'final'], 'type');
        $subject = $this->fetchOne('SELECT * FROM subjects WHERE id = :id', ['id' => $subjectId]);
        if ($subject === null || !(bool) $subject['has_exam']) {
            throw HttpException::validation(['subjectId' => 'exams.subjectHasNoExam']);
        }
        $semester = $this->fetchOne('SELECT * FROM semesters WHERE id = :id AND academic_year_id = :year', ['id' => $semesterId, 'year' => $yearId]);
        if ($semester === null) {
            throw HttpException::validation(['semesterId' => 'validation.invalid']);
        }
        $this->ensureUnique(
            'SELECT id FROM exams WHERE subject_id = :subject AND academic_year_id = :year AND type = :type',
            ['subject' => $subjectId, 'year' => $yearId, 'type' => $type],
            'type',
        );
        $max = $type === 'first' ? 40 : 60;
        $id = $this->insert('exams', [
            'subject_id' => $subjectId,
            'academic_year_id' => $yearId,
            'semester_id' => $semesterId,
            'type' => $type,
            'max_score' => $max,
            'marking_deadline' => $this->dateInput($request, 'markingDeadline', 'markingDeadline', false),
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'exams', 'exam.create', 'exam', $id, null, ['subjectId' => $subjectId, 'type' => $type]);

        return Response::json($this->fetchOne('SELECT * FROM exams WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateExam(Request $request, int $id): Response
    {
        $exam = $this->fetchOne('SELECT * FROM exams WHERE id = :id', ['id' => $id]);
        if ($exam === null) {
            throw HttpException::notFound('exams.examNotFound', 'Exam not found.');
        }
        $values = [];
        if ($request->input('markingDeadline') !== null) {
            $values['marking_deadline'] = $this->dateInput($request, 'markingDeadline', 'markingDeadline', false);
        }
        if ($request->input('semesterId') !== null) {
            $semesterId = $this->requiredInt($request, 'semesterId', 'semesterId');
            $semester = $this->fetchOne('SELECT * FROM semesters WHERE id = :id AND academic_year_id = :year', ['id' => $semesterId, 'year' => $exam['academic_year_id']]);
            if ($semester === null) {
                throw HttpException::validation(['semesterId' => 'validation.invalid']);
            }
            $values['semester_id'] = $semesterId;
        }
        if ($values !== []) {
            $this->updateRow('exams', $id, $values);
            $this->audit($request, 'exams', 'exam.update', 'exam', $id, $exam, $values);
        }

        return Response::json($this->fetchOne('SELECT * FROM exams WHERE id = :id', ['id' => $id]));
    }

    public function schedules(Request $request): Response
    {
        $examId = $this->queryString($request, 'examId');
        $where = $examId === null ? '' : 'WHERE sch.exam_id = :exam';
        $params = $examId === null ? [] : ['exam' => (int) $examId];
        $rows = $this->fetchAll(
            'SELECT sch.*, e.type, e.max_score, s.name AS subject_name, s.code AS subject_code, sec.name AS section_name,
                    g.number AS grade_number, r.name AS room_name
             FROM exam_schedules sch JOIN exams e ON e.id = sch.exam_id JOIN subjects s ON s.id = e.subject_id
             JOIN sections sec ON sec.id = sch.section_id JOIN grade_levels g ON g.id = sec.grade_level_id
             LEFT JOIN rooms r ON r.id = sch.room_id ' . $where . ' ORDER BY sch.date, sch.start_time',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function createSchedule(Request $request): Response
    {
        $examId = $this->requiredInt($request, 'examId', 'examId');
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $exam = $this->fetchOne('SELECT * FROM exams WHERE id = :id', ['id' => $examId]);
        if ($exam === null) {
            throw HttpException::validation(['examId' => 'validation.invalid']);
        }
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $sectionId]);
        if ($section === null || (int) $section['academic_year_id'] !== (int) $exam['academic_year_id']) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }
        $this->ensureUnique('SELECT id FROM exam_schedules WHERE exam_id = :exam AND section_id = :section', ['exam' => $examId, 'section' => $sectionId], 'sectionId');
        $date = $this->dateInput($request, 'date', 'date');
        $start = $this->requiredString($request, 'startTime', 'startTime');
        if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $start)) {
            throw HttpException::validation(['startTime' => 'validation.invalidTime']);
        }
        $date = $this->dateInput($request, 'date', 'date');
        $id = $this->insert('exam_schedules', [
            'exam_id' => $examId,
            'section_id' => $sectionId,
            'date' => $date,
            'start_time' => $start,
            'duration_minutes' => max(15, $this->intInput($request, 'durationMinutes', 90) ?? 90),
            'room_id' => $this->intInput($request, 'roomId'),
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'exams', 'exam_schedule.create', 'exam_schedule', $id, null, ['examId' => $examId, 'date' => $date]);

        return Response::json($this->fetchOne('SELECT * FROM exam_schedules WHERE id = :id', ['id' => $id]), 201);
    }

    public function deleteSchedule(Request $request, int $id): Response
    {
        $schedule = $this->fetchOne('SELECT * FROM exam_schedules WHERE id = :id', ['id' => $id]);
        if ($schedule === null) {
            throw HttpException::notFound();
        }
        $this->execute('DELETE FROM exam_schedules WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'exams', 'exam_schedule.delete', 'exam_schedule', $id, $schedule);

        return Response::noContent();
    }

    public function scores(Request $request, int $examId): Response
    {
        $exam = $this->exam($examId);
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $this->assertExamSectionAccess($request, $exam, $sectionId);
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $sectionId]);
        if ($section === null || (int) $section['academic_year_id'] !== (int) $exam['academic_year_id']) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }
        $students = $this->fetchAll(
            'SELECT st.id, st.admission_number, st.first_name, st.last_name, sc.id AS score_id, sc.score, sc.is_absent, sc.is_draft, sc.published_at
             FROM enrollments e JOIN students st ON st.id = e.student_id
             LEFT JOIN exam_scores sc ON sc.student_id = st.id AND sc.exam_id = :exam
             WHERE e.section_id = :section AND e.status = \'active\' ORDER BY st.last_name, st.first_name',
            ['exam' => $examId, 'section' => $sectionId],
        );
        $schedule = $this->fetchOne('SELECT * FROM exam_schedules WHERE exam_id = :exam AND section_id = :section', ['exam' => $examId, 'section' => $sectionId]);

        return Response::json([
            'exam' => $exam,
            'section' => $section,
            'schedule' => $schedule,
            'students' => $students,
        ]);
    }

    public function saveScores(Request $request, int $examId): Response
    {
        $exam = $this->exam($examId);
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $this->assertExamSectionAccess($request, $exam, $sectionId);
        $publish = (bool) $request->input('publish', false);
        $scores = $request->input('scores');
        if (!is_array($scores) || $scores === []) {
            throw HttpException::validation(['scores' => 'validation.required']);
        }
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $sectionId]);
        if ($section === null || (int) $section['academic_year_id'] !== (int) $exam['academic_year_id']) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }
        $saved = 0;
        $this->transaction(function () use ($request, $exam, $sectionId, $scores, $publish, &$saved): void {
            foreach ($scores as $entry) {
                if (!is_array($entry)) {
                    continue;
                }
                $studentId = (int) ($entry['studentId'] ?? 0);
                $enrolled = $this->fetchOne('SELECT id FROM enrollments WHERE student_id = :student AND section_id = :section AND status = \'active\'', ['student' => $studentId, 'section' => $sectionId]);
                if ($enrolled === null) {
                    throw HttpException::validation(['scores' => 'exams.studentNotEnrolled']);
                }
                $isAbsent = (bool) ($entry['isAbsent'] ?? false);
                $score = $isAbsent ? null : (isset($entry['score']) && $entry['score'] !== '' ? (int) $entry['score'] : null);
                if (!$isAbsent && $score !== null && ($score < 0 || $score > (int) $exam['max_score'])) {
                    throw HttpException::validation(['scores' => 'exams.scoreRange']);
                }
                $existing = $this->fetchOne('SELECT * FROM exam_scores WHERE exam_id = :exam AND student_id = :student', ['exam' => $exam['id'], 'student' => $studentId]);
                if ($existing !== null && !(bool) $existing['is_draft']) {
                    $this->audit($request, 'exams', 'score.correct', 'exam_score', $existing['id'], $existing, ['score' => $score, 'isAbsent' => $isAbsent]);
                }
                $values = [
                    'score' => $score,
                    'is_absent' => $isAbsent ? 1 : 0,
                    'is_draft' => $publish ? 0 : 1,
                    'published_at' => $publish ? $this->now() : null,
                    'published_by' => $publish ? $this->user($request)->id : null,
                    'updated_at' => $this->now(),
                ];
                if ($existing === null) {
                    $this->insert('exam_scores', ['exam_id' => $exam['id'], 'student_id' => $studentId, 'created_at' => $this->now()] + $values);
                } else {
                    $this->updateRow('exam_scores', (int) $existing['id'], $values);
                }
                $saved++;
            }
        });
        $this->audit($request, 'exams', $publish ? 'scores.publish' : 'scores.save', 'exam', $examId, null, ['sectionId' => $sectionId, 'saved' => $saved]);

        return Response::json(['saved' => $saved, 'published' => $publish]);
    }

    public function studentResults(Request $request, int $studentId): Response
    {
        $student = $this->student($studentId);
        $this->assertStudentAccess($request, $studentId);
        $yearId = $this->intInput($request, 'academicYearId');
        if ($yearId === null) {
            $enrollment = $this->fetchOne('SELECT academic_year_id FROM enrollments WHERE student_id = :id AND status = \'active\' ORDER BY started_at DESC LIMIT 1', ['id' => $studentId]);
            $yearId = $enrollment === null ? null : (int) $enrollment['academic_year_id'];
        }
        if ($yearId === null) {
            throw HttpException::validation(['academicYearId' => 'validation.required']);
        }
        $publishedOnly = in_array($this->user($request)->roleSlug, ['student', 'guardian'], true);
        $annual = $this->annualResults($studentId, $yearId, $publishedOnly);
        $semesters = $this->fetchAll('SELECT * FROM semesters WHERE academic_year_id = :year ORDER BY number', ['year' => $yearId]);
        $semesterResults = [];
        foreach ($semesters as $semester) {
            $semesterResults[] = $this->semesterResults($studentId, $yearId, (int) $semester['id'], $publishedOnly) + ['semester' => $semester];
        }

        return Response::json([
            'student' => $student,
            'academicYearId' => $yearId,
            'annual' => $annual,
            'semesters' => $semesterResults,
        ]);
    }

    public function sectionResults(Request $request, int $sectionId): Response
    {
        if (in_array($this->user($request)->roleSlug, ['student', 'guardian'], true)) {
            throw HttpException::forbidden();
        }
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $sectionId]);
        if ($section === null) {
            throw HttpException::notFound();
        }
        $yearId = $this->intInput($request, 'academicYearId') ?? (int) $section['academic_year_id'];
        $students = $this->fetchAll(
            'SELECT st.id, st.admission_number, st.first_name, st.last_name FROM enrollments e JOIN students st ON st.id = e.student_id
             WHERE e.section_id = :section AND e.status = \'active\' ORDER BY st.last_name, st.first_name',
            ['section' => $sectionId],
        );
        $results = [];
        foreach ($students as $student) {
            $annual = $this->annualResults((int) $student['id'], $yearId, false);
            $results[] = [
                'student' => $student,
                'average' => $annual['average'],
                'letterGrade' => $annual['letterGrade'],
                'failedSubjects' => count(array_filter($annual['subjects'], static fn (array $subject): bool => !$subject['passed'])),
                'subjects' => $annual['subjects'],
            ];
        }
        usort($results, static fn (array $a, array $b): int => ($b['average'] ?? -1) <=> ($a['average'] ?? -1));

        return Response::json(['section' => $section, 'academicYearId' => $yearId, 'items' => $results]);
    }

    public function supplementary(Request $request): Response
    {
        $studentId = $this->queryString($request, 'studentId');
        $yearId = $this->queryString($request, 'academicYearId');
        $where = [];
        $params = [];
        if ($studentId !== null) {
            $where[] = 'sp.student_id = :student';
            $params['student'] = (int) $studentId;
        }
        if ($yearId !== null) {
            $where[] = 'sp.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $linked = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'sp.student_id IN (' . ($linked === [] ? '0' : implode(',', $linked)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT sp.*, st.first_name, st.last_name, st.admission_number, s.name AS subject_name, s.code AS subject_code
             FROM supplementary_exams sp JOIN students st ON st.id = sp.student_id JOIN subjects s ON s.id = sp.subject_id
             ' . $whereSql . ' ORDER BY st.last_name, s.code',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function saveSupplementary(Request $request): Response
    {
        $studentId = $this->requiredInt($request, 'studentId', 'studentId');
        $subjectId = $this->requiredInt($request, 'subjectId', 'subjectId');
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $score = $this->requiredInt($request, 'score', 'score');
        if ($score < 0 || $score > 100) {
            throw HttpException::validation(['score' => 'exams.scoreRange']);
        }
        $this->student($studentId);
        $this->requireExists('subjects', $subjectId, 'subjectId');
        $this->requireExists('academic_years', $yearId, 'academicYearId');
        $capped = min(40, $score);
        $passed = $score >= 40 ? 1 : 0;
        $existing = $this->fetchOne('SELECT * FROM supplementary_exams WHERE student_id = :student AND subject_id = :subject AND academic_year_id = :year', ['student' => $studentId, 'subject' => $subjectId, 'year' => $yearId]);
        if ($existing === null) {
            $id = $this->insert('supplementary_exams', [
                'student_id' => $studentId,
                'subject_id' => $subjectId,
                'academic_year_id' => $yearId,
                'score' => $score,
                'capped_score' => $capped,
                'passed' => $passed,
                'entered_by' => $this->user($request)->id,
                'created_at' => $this->now(),
            ]);
        } else {
            $id = (int) $existing['id'];
            $this->updateRow('supplementary_exams', (int) $existing['id'], [
                'score' => $score,
                'capped_score' => $capped,
                'passed' => $passed,
                'entered_by' => $this->user($request)->id,
            ]);
        }
        $this->audit($request, 'exams', 'supplementary.save', 'supplementary_exam', $id, $existing, ['studentId' => $studentId, 'subjectId' => $subjectId, 'score' => $score]);

        return Response::json($this->fetchOne('SELECT * FROM supplementary_exams WHERE id = :id', ['id' => $id]));
    }

    public function reportCards(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $where = [];
        $params = [];
        foreach (['studentId' => 'rc.student_id', 'academicYearId' => 'rc.academic_year_id', 'status' => 'rc.status', 'type' => 'rc.type'] as $key => $column) {
            $value = $this->queryString($request, $key);
            if ($value !== null) {
                $where[] = $column . ' = :' . $key;
                $params[$key] = in_array($key, ['status', 'type'], true) ? $value : (int) $value;
            }
        }
        $sectionId = $this->queryString($request, 'sectionId');
        if ($sectionId !== null) {
            $where[] = 'e.section_id = :section';
            $params['section'] = (int) $sectionId;
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $linked = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'rc.student_id IN (' . ($linked === [] ? '0' : implode(',', $linked)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM report_cards rc JOIN students st ON st.id = rc.student_id
                 JOIN academic_years y ON y.id = rc.academic_year_id
                 LEFT JOIN semesters sem ON sem.id = rc.semester_id
                 LEFT JOIN enrollments e ON e.student_id = rc.student_id AND e.academic_year_id = rc.academic_year_id AND e.status = \'active\'';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT rc.id, rc.student_id, rc.academic_year_id, rc.semester_id, rc.type, rc.version, rc.status, rc.remark,
                    rc.published_at, rc.created_at, st.admission_number, st.first_name, st.last_name,
                    y.label AS academic_year_label, sem.name AS semester_name
             ' . $base . ' ' . $whereSql . ' ORDER BY rc.created_at DESC LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function showReportCard(Request $request, int $id): Response
    {
        $report = $this->fetchOne(
            'SELECT rc.*, st.first_name, st.last_name, st.admission_number, y.label AS academic_year_label, sem.name AS semester_name
             FROM report_cards rc JOIN students st ON st.id = rc.student_id JOIN academic_years y ON y.id = rc.academic_year_id
             LEFT JOIN semesters sem ON sem.id = rc.semester_id WHERE rc.id = :id',
            ['id' => $id],
        );
        if ($report === null) {
            throw HttpException::notFound();
        }
        $this->assertStudentAccess($request, (int) $report['student_id']);
        $report['snapshot'] = json_decode((string) $report['snapshot_json'], true);

        return Response::json($report);
    }

    public function generateReportCards(Request $request): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $type = $this->ensureOneOf($request, 'type', ['semester', 'annual'], 'type');
        $semesterId = $this->intInput($request, 'semesterId');
        if ($type === 'semester' && $semesterId === null) {
            throw HttpException::validation(['semesterId' => 'validation.required']);
        }
        $sectionId = $this->intInput($request, 'sectionId');
        $studentId = $this->intInput($request, 'studentId');
        $studentIds = [];
        if ($studentId !== null) {
            $studentIds = [$studentId];
        } elseif ($sectionId !== null) {
            $studentIds = array_map(static fn (array $row): int => (int) $row['student_id'], $this->fetchAll('SELECT student_id FROM enrollments WHERE section_id = :section AND academic_year_id = :year AND status = \'active\'', ['section' => $sectionId, 'year' => $yearId]));
        } else {
            throw HttpException::validation(['sectionId' => 'validation.required']);
        }
        $ranked = [];
        foreach ($studentIds as $id) {
            $ranked[$id] = $this->annualResults($id, $yearId, false)['average'];
        }
        arsort($ranked);
        $sectionSize = count($ranked);
        $generated = [];
        foreach ($studentIds as $id) {
            $rank = 1;
            foreach ($ranked as $rankedId => $average) {
                if ($rankedId === $id) {
                    break;
                }
                $rank++;
            }
            $generated[] = $this->generateReportCard($request, $id, $yearId, $semesterId, $type, $rank, $sectionSize);
        }
        $this->audit($request, 'exams', 'report_cards.generate', 'academic_year', $yearId, null, ['type' => $type, 'count' => count($generated)]);

        return Response::json(['generated' => count($generated), 'items' => $generated]);
    }

    public function publishReportCards(Request $request): Response
    {
        $ids = $request->input('ids');
        if (!is_array($ids) || $ids === []) {
            throw HttpException::validation(['ids' => 'validation.required']);
        }
        $settings = $this->fetchOne('SELECT principal_name, name FROM school_settings WHERE id = 1');
        $published = 0;
        foreach ($ids as $id) {
            $report = $this->fetchOne('SELECT * FROM report_cards WHERE id = :id', ['id' => (int) $id]);
            if ($report === null) {
                continue;
            }
            if ($report['status'] === 'published') {
                throw HttpException::validation(['ids' => 'exams.reportAlreadyPublished']);
            }
            $this->execute(
                'UPDATE report_cards SET status = \'published\', published_at = :at, published_by = :user,
                    principal_name = :principal, updated_at = :at WHERE id = :id',
                [
                    'at' => $this->now(),
                    'user' => $this->user($request)->id,
                    'principal' => $settings['principal_name'] ?? null,
                    'id' => (int) $id,
                ],
            );
            $published++;
            $this->audit($request, 'exams', 'report_card.publish', 'report_card', (int) $id, $report);
        }

        return Response::json(['published' => $published]);
    }

    private function generateReportCard(Request $request, int $studentId, int $yearId, ?int $semesterId, string $type, int $rank, int $sectionSize): array
    {
        $student = $this->student($studentId);
        $enrollment = $this->fetchOne(
            'SELECT e.*, sec.name AS section_name, g.number AS grade_number, g.name AS grade_name
             FROM enrollments e JOIN sections sec ON sec.id = e.section_id JOIN grade_levels g ON g.id = sec.grade_level_id
             WHERE e.student_id = :student AND e.academic_year_id = :year AND e.status = \'active\'',
            ['student' => $studentId, 'year' => $yearId],
        );
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $yearId]);
        if ($year === null) {
            throw HttpException::validation(['academicYearId' => 'validation.invalid']);
        }
        $semester = $semesterId === null ? null : $this->fetchOne('SELECT * FROM semesters WHERE id = :id', ['id' => $semesterId]);
        if ($type === 'semester') {
            $results = $this->semesterResults($studentId, $yearId, (int) $semesterId, false);
            $average = $results['averagePercentage'];
            $letter = $this->letterFor($average ?? 0);
        } else {
            $results = $this->annualResults($studentId, $yearId, false);
            $average = $results['average'];
            $letter = $results['letterGrade'];
        }
        $attendance = $this->attendanceSummary($studentId, $yearId);
        $settings = $this->fetchOne('SELECT name, address, phone, email, principal_name, principal_title, logo_path FROM school_settings WHERE id = 1');
        $snapshot = [
            'school' => [
                'name' => $settings['name'] ?? 'Meridian Academy',
                'address' => $settings['address'] ?? null,
                'phone' => $settings['phone'] ?? null,
                'email' => $settings['email'] ?? null,
                'principalName' => $settings['principal_name'] ?? null,
                'principalTitle' => $settings['principal_title'] ?? 'Principal',
                'hasLogo' => !empty($settings['logo_path']),
            ],
            'student' => [
                'id' => $student['id'],
                'admissionNumber' => $student['admission_number'],
                'firstName' => $student['first_name'],
                'lastName' => $student['last_name'],
                'nameFa' => $student['name_fa'],
                'namePs' => $student['name_ps'],
            ],
            'enrollment' => $enrollment,
            'academicYear' => ['id' => $year['id'], 'label' => $year['label']],
            'semester' => $semester === null ? null : ['id' => $semester['id'], 'name' => $semester['name'], 'number' => $semester['number']],
            'type' => $type,
            'results' => $results,
            'average' => $average,
            'letterGrade' => $letter,
            'outcome' => $average === null ? null : ($average >= 40 ? ($type === 'annual' ? 'promoted' : 'pass') : 'retention'),
            'rank' => $rank,
            'sectionSize' => $sectionSize,
            'attendance' => $attendance,
            'generatedAt' => $this->now(),
        ];
        $existing = $this->fetchOne(
            'SELECT * FROM report_cards WHERE student_id = :student AND academic_year_id = :year AND type = :type
             AND (semester_id = :semester OR (semester_id IS NULL AND :semester IS NULL)) ORDER BY version DESC LIMIT 1',
            ['student' => $studentId, 'year' => $yearId, 'type' => $type, 'semester' => $semesterId],
        );
        $snapshotJson = json_encode($snapshot, JSON_UNESCAPED_UNICODE);
        $remark = $this->inputString($request, 'remark');
        if ($existing !== null && $existing['status'] === 'draft') {
            $this->execute('UPDATE report_cards SET snapshot_json = :snapshot, remark = :remark, updated_at = :at WHERE id = :id', [
                'snapshot' => $snapshotJson,
                'remark' => $remark,
                'at' => $this->now(),
                'id' => $existing['id'],
            ]);
            $id = (int) $existing['id'];
        } else {
            $version = $existing === null ? 1 : (int) $existing['version'] + 1;
            $id = $this->insert('report_cards', [
                'student_id' => $studentId,
                'academic_year_id' => $yearId,
                'semester_id' => $semesterId,
                'type' => $type,
                'version' => $version,
                'status' => 'draft',
                'snapshot_json' => $snapshotJson,
                'remark' => $remark,
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);
        }

        return $this->fetchOne('SELECT id, student_id, academic_year_id, semester_id, type, version, status, created_at FROM report_cards WHERE id = :id', ['id' => $id]);
    }

    private function annualResults(int $studentId, int $yearId, bool $publishedOnly): array
    {
        $enrollment = $this->fetchOne('SELECT e.section_id, sec.grade_level_id FROM enrollments e JOIN sections sec ON sec.id = e.section_id WHERE e.student_id = :student AND e.academic_year_id = :year AND e.status = \'active\'', ['student' => $studentId, 'year' => $yearId]);
        $subjects = [];
        if ($enrollment !== null) {
            $subjects = $this->fetchAll(
                'SELECT s.*, c.weekly_periods FROM curriculum c JOIN subjects s ON s.id = c.subject_id
                 WHERE c.academic_year_id = :year AND c.grade_level_id = :grade AND s.has_exam = 1 AND s.status = \'active\' ORDER BY s.code',
                ['year' => $yearId, 'grade' => $enrollment['grade_level_id']],
            );
        }
        if ($subjects === []) {
            $subjects = $this->fetchAll(
                'SELECT s.* FROM subjects s WHERE s.has_exam = 1 AND s.status = \'active\'
                 AND EXISTS (SELECT 1 FROM exams e WHERE e.subject_id = s.id AND e.academic_year_id = :year) ORDER BY s.code',
                ['year' => $yearId],
            );
        }
        $rows = [];
        $totals = [];
        foreach ($subjects as $subject) {
            $exams = $this->fetchAll('SELECT * FROM exams WHERE subject_id = :subject AND academic_year_id = :year', ['subject' => $subject['id'], 'year' => $yearId]);
            $first = null;
            $final = null;
            foreach ($exams as $exam) {
                $scoreRow = $this->fetchOne('SELECT * FROM exam_scores WHERE exam_id = :exam AND student_id = :student', ['exam' => $exam['id'], 'student' => $studentId]);
                if ($publishedOnly && ($scoreRow === null || (bool) $scoreRow['is_draft'])) {
                    $scoreRow = null;
                }
                $entry = [
                    'examId' => $exam['id'],
                    'type' => $exam['type'],
                    'maxScore' => (int) $exam['max_score'],
                    'score' => $scoreRow === null ? null : ($scoreRow['score'] === null ? null : (int) $scoreRow['score']),
                    'isAbsent' => $scoreRow === null ? false : (bool) $scoreRow['is_absent'],
                    'published' => $scoreRow !== null && !(bool) $scoreRow['is_draft'],
                    'publishedAt' => $scoreRow['published_at'] ?? null,
                ];
                if ($exam['type'] === 'first') {
                    $first = $entry;
                } else {
                    $final = $entry;
                }
            }
            $firstScore = $first['score'] ?? 0;
            $finalScore = $final['score'] ?? 0;
            $raw = $firstScore + $finalScore;
            $supplementary = $this->fetchOne('SELECT * FROM supplementary_exams WHERE student_id = :student AND subject_id = :subject AND academic_year_id = :year', ['student' => $studentId, 'subject' => $subject['id'], 'year' => $yearId]);
            $effective = $raw;
            if ($supplementary !== null) {
                $effective = max($raw, min(40, (int) $supplementary['score']));
            }
            $passed = $effective >= 40;
            $retention = $raw < 40 && ($supplementary === null || (int) $supplementary['score'] < 40);
            $rows[] = [
                'subjectId' => (int) $subject['id'],
                'code' => $subject['code'],
                'name' => $subject['name'],
                'nameFa' => $subject['name_fa'],
                'namePs' => $subject['name_ps'],
                'firstExam' => $first,
                'finalExam' => $final,
                'rawScore' => $raw,
                'supplementaryScore' => $supplementary === null ? null : (int) $supplementary['score'],
                'supplementaryCapped' => $supplementary === null ? null : (int) $supplementary['capped_score'],
                'score' => $effective,
                'letterGrade' => $this->letterFor($effective),
                'passed' => $passed,
                'retention' => $retention,
            ];
            $totals[] = $effective;
        }
        $average = $totals === [] ? null : round(array_sum($totals) / count($totals), 1);

        return [
            'subjects' => $rows,
            'average' => $average,
            'letterGrade' => $avgLetter = $average === null ? null : $this->letterFor($average),
            'passed' => $rows !== [] && $average !== null && $average >= 40 && !in_array(false, array_column($rows, 'passed'), true),
            'retentionSubjects' => array_values(array_map(static fn (array $row): string => $row['code'], array_filter($rows, static fn (array $row): bool => $row['retention']))),
        ];
    }

    private function semesterResults(int $studentId, int $yearId, int $semesterId, bool $publishedOnly): array
    {
        $exams = $this->fetchAll(
            'SELECT e.*, s.code AS subject_code, s.name AS subject_name, s.name_fa, s.name_ps
             FROM exams e JOIN subjects s ON s.id = e.subject_id
             WHERE e.academic_year_id = :year AND e.semester_id = :semester ORDER BY s.code',
            ['year' => $yearId, 'semester' => $semesterId],
        );
        $rows = [];
        $percentages = [];
        foreach ($exams as $exam) {
            $scoreRow = $this->fetchOne('SELECT * FROM exam_scores WHERE exam_id = :exam AND student_id = :student', ['exam' => $exam['id'], 'student' => $studentId]);
            if ($publishedOnly && ($scoreRow === null || (bool) $scoreRow['is_draft'])) {
                $scoreRow = null;
            }
            $score = $scoreRow === null ? 0 : (int) ($scoreRow['score'] ?? 0);
            $percentage = $scoreRow === null ? null : round(($score / (int) $exam['max_score']) * 100, 1);
            if ($percentage !== null) {
                $percentages[] = $percentage;
            }
            $rows[] = [
                'examId' => (int) $exam['id'],
                'subjectId' => (int) $exam['subject_id'],
                'code' => $exam['subject_code'],
                'name' => $exam['subject_name'],
                'nameFa' => $exam['name_fa'],
                'namePs' => $exam['name_ps'],
                'type' => $exam['type'],
                'maxScore' => (int) $exam['max_score'],
                'score' => $scoreRow === null ? null : $score,
                'isAbsent' => $scoreRow === null ? false : (bool) $scoreRow['is_absent'],
                'published' => $scoreRow !== null && !(bool) $scoreRow['is_draft'],
                'percentage' => $percentage,
            ];
        }

        return [
            'subjects' => $rows,
            'averagePercentage' => $percentages === [] ? null : round(array_sum($percentages) / count($percentages), 1),
            'letterGrade' => $percentages === [] ? null : $this->letterFor(array_sum($percentages) / count($percentages)),
        ];
    }

    private function attendanceSummary(int $studentId, int $yearId): array
    {
        $rows = $this->fetchAll(
            'SELECT a.status, COUNT(*) AS total FROM attendance_records a
             JOIN academic_years y ON y.id = :year
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

    private function letterFor(float $score): string
    {
        if ($score >= 90) {
            return 'A';
        }
        if ($score >= 80) {
            return 'B';
        }
        if ($score >= 70) {
            return 'C';
        }
        if ($score >= 40) {
            return 'D';
        }

        return 'F';
    }

    private function exam(int $id): array
    {
        $exam = $this->fetchOne('SELECT * FROM exams WHERE id = :id', ['id' => $id]);
        if ($exam === null) {
            throw HttpException::notFound('exams.examNotFound', 'Exam not found.');
        }

        return $exam;
    }

    private function student(int $id): array
    {
        $student = $this->fetchOne('SELECT * FROM students WHERE id = :id', ['id' => $id]);
        if ($student === null) {
            throw HttpException::notFound('people.studentNotFound', 'Student not found.');
        }

        return $student;
    }

    private function assertExamSectionAccess(Request $request, array $exam, int $sectionId): void
    {
        $user = $this->user($request);
        if ($user->roleSlug !== 'teacher') {
            return;
        }
        $staff = $this->fetchOne('SELECT id FROM staff WHERE user_id = :user', ['user' => $user->id]);
        if ($staff === null) {
            throw HttpException::forbidden();
        }
        $allowed = $this->fetchOne(
            'SELECT id FROM teaching_assignments WHERE teacher_staff_id = :staff AND subject_id = :subject AND section_id = :section',
            ['staff' => $staff['id'], 'subject' => $exam['subject_id'], 'section' => $sectionId],
        );
        if ($allowed === null) {
            throw HttpException::forbidden();
        }
    }

    private function assertStudentAccess(Request $request, int $studentId): void
    {
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['super-admin', 'principal', 'registrar', 'accountant', 'librarian'], true)) {
            return;
        }
        if ($user->roleSlug === 'student') {
            $row = $this->fetchOne('SELECT id FROM students WHERE id = :student AND user_id = :user', ['student' => $studentId, 'user' => $user->id]);
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        if ($user->roleSlug === 'guardian') {
            $row = $this->fetchOne(
                'SELECT 1 FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id
                 WHERE sg.student_id = :student AND g.user_id = :user',
                ['student' => $studentId, 'user' => $user->id],
            );
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        if ($user->roleSlug === 'teacher') {
            $staff = $this->fetchOne('SELECT id FROM staff WHERE user_id = :user', ['user' => $user->id]);
            if ($staff === null) {
                throw HttpException::forbidden();
            }
            $row = $this->fetchOne(
                'SELECT 1 FROM enrollments e JOIN sections s ON s.id = e.section_id
                 WHERE e.student_id = :student AND e.status = \'active\' AND (
                    s.homeroom_teacher_id = :staff OR EXISTS (SELECT 1 FROM teaching_assignments a WHERE a.section_id = s.id AND a.teacher_staff_id = :staff)
                 )',
                ['student' => $studentId, 'staff' => $staff['id']],
            );
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        throw HttpException::forbidden();
    }

    private function requireExists(string $table, int $id, string $field): void
    {
        if ($this->fetchOne('SELECT id FROM ' . $table . ' WHERE id = :id', ['id' => $id]) === null) {
            throw HttpException::validation([$field => 'validation.invalid']);
        }
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