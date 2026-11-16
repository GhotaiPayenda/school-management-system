<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class AcademicController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function years(Request $request): Response
    {
        $pagination = $this->pagination($request, 50);
        $search = $this->queryString($request, 'search');
        $where = '';
        $params = [];

        if ($search !== null) {
            $where = 'WHERE y.label LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM academic_years y ' . $where, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT y.*, (SELECT COUNT(*) FROM semesters s WHERE s.academic_year_id = y.id) AS semester_count
             FROM academic_years y ' . $where . ' ORDER BY y.start_date DESC LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createYear(Request $request): Response
    {
        $label = $this->requiredString($request, 'label', 'label');
        $start = $this->dateInput($request, 'startDate', 'startDate');
        $end = $this->dateInput($request, 'endDate', 'endDate');
        if ($start > $end) {
            throw HttpException::validation(['endDate' => 'validation.dateOrder']);
        }

        $this->ensureUnique('SELECT id FROM academic_years WHERE label = :label', ['label' => $label], 'label');

        $id = $this->transaction(function () use ($request, $label, $start, $end): int {
            if ((bool) $request->input('isCurrent', false)) {
                $this->execute('UPDATE academic_years SET is_current = 0');
            }

            $id = $this->insert('academic_years', [
                'label' => $label,
                'start_date' => $start,
                'end_date' => $end,
                'is_current' => (bool) $request->input('isCurrent', false) ? 1 : 0,
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);

            $semesters = $request->input('semesters');
            if (is_array($semesters) && $semesters !== []) {
                $this->saveSemesters($id, $semesters, $start, $end);
            }

            return $id;
        });

        $this->audit($request, 'academic', 'academic_year.create', 'academic_year', $id, null, ['label' => $label]);

        return $this->showYear($request, $id);
    }

    public function updateYear(Request $request, int $id): Response
    {
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $id]);
        if ($year === null) {
            throw HttpException::notFound('academic.yearNotFound', 'Academic Year not found.');
        }

        $values = [];
        if ($request->input('label') !== null) {
            $label = $this->requiredString($request, 'label', 'label');
            $this->ensureUnique('SELECT id FROM academic_years WHERE label = :label AND id <> :id', ['label' => $label, 'id' => $id], 'label');
            $values['label'] = $label;
        }
        if ($request->input('startDate') !== null) {
            $values['start_date'] = $this->dateInput($request, 'startDate', 'startDate');
        }
        if ($request->input('endDate') !== null) {
            $values['end_date'] = $this->dateInput($request, 'endDate', 'endDate');
        }
        $start = $values['start_date'] ?? $year['start_date'];
        $end = $values['end_date'] ?? $year['end_date'];
        if ($start > $end) {
            throw HttpException::validation(['endDate' => 'validation.dateOrder']);
        }

        if ($request->input('isCurrent') !== null) {
            if ((bool) $request->input('isCurrent')) {
                $this->execute('UPDATE academic_years SET is_current = 0 WHERE id <> :id', ['id' => $id]);
            }
            $values['is_current'] = (bool) $request->input('isCurrent') ? 1 : 0;
        }

        if ($values !== []) {
            $values['updated_at'] = $this->now();
            $this->updateRow('academic_years', $id, $values);
            $this->audit($request, 'academic', 'academic_year.update', 'academic_year', $id, $year, $values);
        }

        return $this->showYear($request, $id);
    }

    public function showYear(Request $request, int $id): Response
    {
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $id]);
        if ($year === null) {
            throw HttpException::notFound('academic.yearNotFound', 'Academic Year not found.');
        }
        $year['semesters'] = $this->fetchAll('SELECT * FROM semesters WHERE academic_year_id = :id ORDER BY number', ['id' => $id]);

        return Response::json($year);
    }

    public function semesters(Request $request, int $yearId): Response
    {
        $rows = $this->fetchAll('SELECT * FROM semesters WHERE academic_year_id = :id ORDER BY number', ['id' => $yearId]);

        return Response::json(['items' => $rows]);
    }

    public function createSemester(Request $request, int $yearId): Response
    {
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $yearId]);
        if ($year === null) {
            throw HttpException::notFound('academic.yearNotFound', 'Academic Year not found.');
        }
        if ((int) $this->fetchOne('SELECT COUNT(*) AS total FROM semesters WHERE academic_year_id = :id', ['id' => $yearId])['total'] >= 2) {
            throw HttpException::validation(['academicYearId' => 'academic.twoSemestersOnly']);
        }

        $number = $this->requiredInt($request, 'number', 'number');
        if (!in_array($number, [1, 2], true)) {
            throw HttpException::validation(['number' => 'validation.invalid']);
        }
        $name = $this->inputString($request, 'name') ?: 'Semester ' . $number;
        $start = $this->dateInput($request, 'startDate', 'startDate');
        $end = $this->dateInput($request, 'endDate', 'endDate');
        $this->validateSemesterDates($yearId, $number, $start, $end, $year);

        $id = $this->insert('semesters', [
            'academic_year_id' => $yearId,
            'number' => $number,
            'name' => $name,
            'start_date' => $start,
            'end_date' => $end,
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'semester.create', 'semester', $id, null, ['number' => $number]);

        return Response::json($this->fetchOne('SELECT * FROM semesters WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateSemester(Request $request, int $yearId, int $id): Response
    {
        $semester = $this->fetchOne('SELECT * FROM semesters WHERE id = :id AND academic_year_id = :year', ['id' => $id, 'year' => $yearId]);
        if ($semester === null) {
            throw HttpException::notFound('academic.semesterNotFound', 'Semester not found.');
        }
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $yearId]);
        $start = $request->input('startDate') !== null ? $this->dateInput($request, 'startDate', 'startDate') : $semester['start_date'];
        $end = $request->input('endDate') !== null ? $this->dateInput($request, 'endDate', 'endDate') : $semester['end_date'];
        $number = $request->input('number') !== null ? $this->requiredInt($request, 'number', 'number') : (int) $semester['number'];
        $this->validateSemesterDates($yearId, $number, $start, $end, $year, $id);

        $values = [
            'number' => $number,
            'name' => $this->inputString($request, 'name') ?: $semester['name'],
            'start_date' => $start,
            'end_date' => $end,
        ];
        $this->updateRow('semesters', $id, $values);
        $this->audit($request, 'academic', 'semester.update', 'semester', $id, $semester, $values);

        return Response::json($this->fetchOne('SELECT * FROM semesters WHERE id = :id', ['id' => $id]));
    }

    public function grades(Request $request): Response
    {
        $rows = $this->fetchAll('SELECT * FROM grade_levels ORDER BY number');

        return Response::json(['items' => $rows]);
    }

    public function createGrade(Request $request): Response
    {
        $number = $this->requiredInt($request, 'number', 'number');
        if ($number < 1 || $number > 12) {
            throw HttpException::validation(['number' => 'validation.invalid']);
        }
        $this->ensureUnique('SELECT id FROM grade_levels WHERE number = :number', ['number' => $number], 'number');
        $id = $this->insert('grade_levels', [
            'number' => $number,
            'name' => $this->inputString($request, 'name') ?: 'Grade ' . $number,
            'name_fa' => $this->inputString($request, 'nameFa'),
            'name_ps' => $this->inputString($request, 'namePs'),
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'grade.create', 'grade_level', $id, null, ['number' => $number]);

        return Response::json($this->fetchOne('SELECT * FROM grade_levels WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateGrade(Request $request, int $id): Response
    {
        $grade = $this->fetchOne('SELECT * FROM grade_levels WHERE id = :id', ['id' => $id]);
        if ($grade === null) {
            throw HttpException::notFound();
        }
        $values = [];
        if ($request->input('number') !== null) {
            $number = $this->requiredInt($request, 'number', 'number');
            $this->ensureUnique('SELECT id FROM grade_levels WHERE number = :number AND id <> :id', ['number' => $number, 'id' => $id], 'number');
            $values['number'] = $number;
        }
        foreach (['name' => 'name', 'nameFa' => 'name_fa', 'namePs' => 'name_ps'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input) ?: '';
            }
        }
        $this->updateRow('grade_levels', $id, $values);
        $this->audit($request, 'academic', 'grade.update', 'grade_level', $id, $grade, $values);

        return Response::json($this->fetchOne('SELECT * FROM grade_levels WHERE id = :id', ['id' => $id]));
    }

    public function sections(Request $request): Response
    {
        $pagination = $this->pagination($request, 50);
        $yearId = $this->queryString($request, 'academicYearId');
        $gradeId = $this->queryString($request, 'gradeLevelId');
        $where = [];
        $params = [];
        if ($yearId !== null) {
            $where[] = 's.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        if ($gradeId !== null) {
            $where[] = 's.grade_level_id = :grade';
            $params['grade'] = (int) $gradeId;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM sections s ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT s.*, g.number AS grade_number, g.name AS grade_name, y.label AS academic_year_label,
                    st.first_name AS homeroom_first_name, st.last_name AS homeroom_last_name,
                    (SELECT COUNT(*) FROM enrollments e WHERE e.section_id = s.id AND e.status = \'active\') AS occupancy
             FROM sections s
             JOIN grade_levels g ON g.id = s.grade_level_id
             JOIN academic_years y ON y.id = s.academic_year_id
             LEFT JOIN staff st ON st.id = s.homeroom_teacher_id
             ' . $whereSql . '
             ORDER BY g.number, s.name LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createSection(Request $request): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $gradeId = $this->requiredInt($request, 'gradeLevelId', 'gradeLevelId');
        $name = $this->requiredString($request, 'name', 'name');
        $capacity = $this->intInput($request, 'capacity', 30) ?? 30;
        $this->requireExists('academic_years', $yearId, 'academicYearId');
        $this->requireExists('grade_levels', $gradeId, 'gradeLevelId');
        $this->ensureUnique(
            'SELECT id FROM sections WHERE academic_year_id = :year AND grade_level_id = :grade AND name = :name',
            ['year' => $yearId, 'grade' => $gradeId, 'name' => $name],
            'name',
        );
        $homeroom = $this->intInput($request, 'homeroomTeacherId');
        if ($homeroom !== null) {
            $teacher = $this->fetchOne('SELECT id, is_teacher FROM staff WHERE id = :id', ['id' => $homeroom]);
            if ($teacher === null || !(bool) $teacher['is_teacher']) {
                throw HttpException::validation(['homeroomTeacherId' => 'validation.invalid']);
            }
        }

        $id = $this->insert('sections', [
            'academic_year_id' => $yearId,
            'grade_level_id' => $gradeId,
            'name' => $name,
            'capacity' => max(1, $capacity),
            'homeroom_teacher_id' => $homeroom,
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'section.create', 'section', $id, null, ['name' => $name]);

        return Response::json($this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateSection(Request $request, int $id): Response
    {
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $id]);
        if ($section === null) {
            throw HttpException::notFound();
        }
        $values = [];
        foreach (['capacity' => 'capacity', 'homeroomTeacherId' => 'homeroom_teacher_id'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $input === 'capacity' ? max(1, (int) $request->input($input)) : ((int) $request->input($input) ?: null);
            }
        }
        if ($request->input('name') !== null) {
            $name = $this->requiredString($request, 'name', 'name');
            $this->ensureUnique(
                'SELECT id FROM sections WHERE academic_year_id = :year AND grade_level_id = :grade AND name = :name AND id <> :id',
                ['year' => $section['academic_year_id'], 'grade' => $section['grade_level_id'], 'name' => $name, 'id' => $id],
                'name',
            );
            $values['name'] = $name;
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('sections', $id, $values);
        $this->audit($request, 'academic', 'section.update', 'section', $id, $section, $values);

        return Response::json($this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $id]));
    }

    public function rooms(Request $request): Response
    {
        $pagination = $this->pagination($request, 50);
        $search = $this->queryString($request, 'search');
        $where = '';
        $params = [];
        if ($search !== null) {
            $where = 'WHERE name LIKE :search OR building LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM rooms ' . $where, $params)['total'];
        $rows = $this->fetchAll('SELECT * FROM rooms ' . $where . ' ORDER BY name LIMIT :limit OFFSET :offset', $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']]);

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createRoom(Request $request): Response
    {
        $name = $this->requiredString($request, 'name', 'name');
        $this->ensureUnique('SELECT id FROM rooms WHERE name = :name', ['name' => $name], 'name');
        $id = $this->insert('rooms', [
            'name' => $name,
            'capacity' => max(1, $this->intInput($request, 'capacity', 30) ?? 30),
            'building' => $this->inputString($request, 'building'),
            'status' => 'active',
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'room.create', 'room', $id, null, ['name' => $name]);

        return Response::json($this->fetchOne('SELECT * FROM rooms WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateRoom(Request $request, int $id): Response
    {
        $room = $this->fetchOne('SELECT * FROM rooms WHERE id = :id', ['id' => $id]);
        if ($room === null) {
            throw HttpException::notFound();
        }
        $values = [];
        if ($request->input('name') !== null) {
            $name = $this->requiredString($request, 'name', 'name');
            $this->ensureUnique('SELECT id FROM rooms WHERE name = :name AND id <> :id', ['name' => $name, 'id' => $id], 'name');
            $values['name'] = $name;
        }
        if ($request->input('capacity') !== null) {
            $values['capacity'] = max(1, (int) $request->input('capacity'));
        }
        if ($request->input('building') !== null) {
            $values['building'] = $this->inputString($request, 'building');
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['active', 'archived'], 'status');
        }
        $this->updateRow('rooms', $id, $values);
        $this->audit($request, 'academic', 'room.update', 'room', $id, $room, $values);

        return Response::json($this->fetchOne('SELECT * FROM rooms WHERE id = :id', ['id' => $id]));
    }

    public function departments(Request $request): Response
    {
        $rows = $this->fetchAll('SELECT d.*, (SELECT COUNT(*) FROM subjects s WHERE s.department_id = d.id AND s.status = \'active\') AS subject_count FROM departments d ORDER BY d.name');

        return Response::json(['items' => $rows]);
    }

    public function createDepartment(Request $request): Response
    {
        $name = $this->requiredString($request, 'name', 'name');
        $this->ensureUnique('SELECT id FROM departments WHERE name = :name', ['name' => $name], 'name');
        $id = $this->insert('departments', [
            'name' => $name,
            'name_fa' => $this->inputString($request, 'nameFa'),
            'name_ps' => $this->inputString($request, 'namePs'),
            'status' => 'active',
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'department.create', 'department', $id, null, ['name' => $name]);

        return Response::json($this->fetchOne('SELECT * FROM departments WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateDepartment(Request $request, int $id): Response
    {
        $department = $this->fetchOne('SELECT * FROM departments WHERE id = :id', ['id' => $id]);
        if ($department === null) {
            throw HttpException::notFound();
        }
        $values = [];
        if ($request->input('name') !== null) {
            $name = $this->requiredString($request, 'name', 'name');
            $this->ensureUnique('SELECT id FROM departments WHERE name = :name AND id <> :id', ['name' => $name, 'id' => $id], 'name');
            $values['name'] = $name;
        }
        foreach (['nameFa' => 'name_fa', 'namePs' => 'name_ps'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['active', 'archived'], 'status');
        }
        $this->updateRow('departments', $id, $values);
        $this->audit($request, 'academic', 'department.update', 'department', $id, $department, $values);

        return Response::json($this->fetchOne('SELECT * FROM departments WHERE id = :id', ['id' => $id]));
    }

    public function subjects(Request $request): Response
    {
        $pagination = $this->pagination($request, 50);
        $search = $this->queryString($request, 'search');
        $where = '';
        $params = [];
        if ($search !== null) {
            $where = 'WHERE s.name LIKE :search OR s.code LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM subjects s ' . $where, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT s.*, d.name AS department_name FROM subjects s JOIN departments d ON d.id = s.department_id ' . $where . '
             ORDER BY s.code LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createSubject(Request $request): Response
    {
        $code = strtoupper($this->requiredString($request, 'code', 'code'));
        $name = $this->requiredString($request, 'name', 'name');
        $departmentId = $this->requiredInt($request, 'departmentId', 'departmentId');
        $this->requireExists('departments', $departmentId, 'departmentId');
        $this->ensureUnique('SELECT id FROM subjects WHERE code = :code', ['code' => $code], 'code');
        $id = $this->insert('subjects', [
            'code' => $code,
            'name' => $name,
            'name_fa' => $this->inputString($request, 'nameFa'),
            'name_ps' => $this->inputString($request, 'namePs'),
            'department_id' => $departmentId,
            'has_exam' => (bool) $request->input('hasExam', true) ? 1 : 0,
            'status' => 'active',
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'subject.create', 'subject', $id, null, ['code' => $code]);

        return Response::json($this->fetchOne('SELECT * FROM subjects WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateSubject(Request $request, int $id): Response
    {
        $subject = $this->fetchOne('SELECT * FROM subjects WHERE id = :id', ['id' => $id]);
        if ($subject === null) {
            throw HttpException::notFound();
        }
        $values = [];
        if ($request->input('code') !== null) {
            $code = strtoupper($this->requiredString($request, 'code', 'code'));
            $this->ensureUnique('SELECT id FROM subjects WHERE code = :code AND id <> :id', ['code' => $code, 'id' => $id], 'code');
            $values['code'] = $code;
        }
        foreach (['name' => 'name', 'nameFa' => 'name_fa', 'namePs' => 'name_ps'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input) ?: $subject[$column];
            }
        }
        if ($request->input('departmentId') !== null) {
            $departmentId = $this->requiredInt($request, 'departmentId', 'departmentId');
            $this->requireExists('departments', $departmentId, 'departmentId');
            $values['department_id'] = $departmentId;
        }
        if ($request->input('hasExam') !== null) {
            $values['has_exam'] = (bool) $request->input('hasExam') ? 1 : 0;
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['active', 'archived'], 'status');
        }
        $this->updateRow('subjects', $id, $values);
        $this->audit($request, 'academic', 'subject.update', 'subject', $id, $subject, $values);

        return Response::json($this->fetchOne('SELECT * FROM subjects WHERE id = :id', ['id' => $id]));
    }

    public function curriculum(Request $request): Response
    {
        $yearId = $this->queryString($request, 'academicYearId');
        $gradeId = $this->queryString($request, 'gradeLevelId');
        $where = [];
        $params = [];
        if ($yearId !== null) {
            $where[] = 'c.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        if ($gradeId !== null) {
            $where[] = 'c.grade_level_id = :grade';
            $params['grade'] = (int) $gradeId;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT c.*, s.code AS subject_code, s.name AS subject_name, g.number AS grade_number, g.name AS grade_name
             FROM curriculum c JOIN subjects s ON s.id = c.subject_id JOIN grade_levels g ON g.id = c.grade_level_id
             ' . $whereSql . ' ORDER BY g.number, s.code',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function createCurriculum(Request $request): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $gradeId = $this->requiredInt($request, 'gradeLevelId', 'gradeLevelId');
        $subjectId = $this->requiredInt($request, 'subjectId', 'subjectId');
        $this->requireExists('academic_years', $yearId, 'academicYearId');
        $this->requireExists('grade_levels', $gradeId, 'gradeLevelId');
        $this->requireExists('subjects', $subjectId, 'subjectId');
        $this->ensureUnique(
            'SELECT id FROM curriculum WHERE academic_year_id = :year AND grade_level_id = :grade AND subject_id = :subject',
            ['year' => $yearId, 'grade' => $gradeId, 'subject' => $subjectId],
            'subjectId',
        );
        $id = $this->insert('curriculum', [
            'academic_year_id' => $yearId,
            'grade_level_id' => $gradeId,
            'subject_id' => $subjectId,
            'weekly_periods' => max(0, $this->intInput($request, 'weeklyPeriods', 4) ?? 4),
            'is_elective' => (bool) $request->input('isElective', false) ? 1 : 0,
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'curriculum.create', 'curriculum', $id, null, ['subjectId' => $subjectId]);

        return Response::json($this->fetchOne('SELECT * FROM curriculum WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateCurriculum(Request $request, int $id): Response
    {
        $entry = $this->fetchOne('SELECT * FROM curriculum WHERE id = :id', ['id' => $id]);
        if ($entry === null) {
            throw HttpException::notFound();
        }
        $values = [];
        if ($request->input('weeklyPeriods') !== null) {
            $values['weekly_periods'] = max(0, (int) $request->input('weeklyPeriods'));
        }
        if ($request->input('isElective') !== null) {
            $values['is_elective'] = (bool) $request->input('isElective') ? 1 : 0;
        }
        $this->updateRow('curriculum', $id, $values);
        $this->audit($request, 'academic', 'curriculum.update', 'curriculum', $id, $entry, $values);

        return Response::json($this->fetchOne('SELECT * FROM curriculum WHERE id = :id', ['id' => $id]));
    }

    public function deleteCurriculum(Request $request, int $id): Response
    {
        $entry = $this->fetchOne('SELECT * FROM curriculum WHERE id = :id', ['id' => $id]);
        if ($entry === null) {
            throw HttpException::notFound();
        }
        $this->execute('DELETE FROM curriculum WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'academic', 'curriculum.delete', 'curriculum', $id, $entry);

        return Response::noContent();
    }

    public function copyCurriculum(Request $request): Response
    {
        $from = $this->requiredInt($request, 'fromAcademicYearId', 'fromAcademicYearId');
        $to = $this->requiredInt($request, 'toAcademicYearId', 'toAcademicYearId');
        if ($from === $to) {
            throw HttpException::validation(['toAcademicYearId' => 'validation.invalid']);
        }
        $this->requireExists('academic_years', $from, 'fromAcademicYearId');
        $this->requireExists('academic_years', $to, 'toAcademicYearId');

        $rows = $this->fetchAll('SELECT * FROM curriculum WHERE academic_year_id = :from', ['from' => $from]);
        $created = 0;
        $this->transaction(function () use ($rows, $to, &$created): void {
            foreach ($rows as $row) {
                $exists = $this->fetchOne(
                    'SELECT id FROM curriculum WHERE academic_year_id = :year AND grade_level_id = :grade AND subject_id = :subject',
                    ['year' => $to, 'grade' => $row['grade_level_id'], 'subject' => $row['subject_id']],
                );
                if ($exists !== null) {
                    continue;
                }
                $this->insert('curriculum', [
                    'academic_year_id' => $to,
                    'grade_level_id' => $row['grade_level_id'],
                    'subject_id' => $row['subject_id'],
                    'weekly_periods' => $row['weekly_periods'],
                    'is_elective' => $row['is_elective'],
                    'created_at' => $this->now(),
                ]);
                $created++;
            }
        });
        $this->audit($request, 'academic', 'curriculum.copy', 'academic_year', $to, null, ['from' => $from, 'created' => $created]);

        return Response::json(['created' => $created]);
    }

    public function holidays(Request $request): Response
    {
        $yearId = $this->queryString($request, 'academicYearId');
        $where = $yearId === null ? '' : 'WHERE academic_year_id = :year';
        $params = $yearId === null ? [] : ['year' => (int) $yearId];
        $rows = $this->fetchAll('SELECT * FROM holidays ' . $where . ' ORDER BY date', $params);

        return Response::json(['items' => $rows]);
    }

    public function createHoliday(Request $request): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $yearId]);
        if ($year === null) {
            throw HttpException::validation(['academicYearId' => 'validation.invalid']);
        }
        $date = $this->dateInput($request, 'date', 'date');
        if ($date < $year['start_date'] || $date > $year['end_date']) {
            throw HttpException::validation(['date' => 'validation.outsideAcademicYear']);
        }
        $this->ensureUnique('SELECT id FROM holidays WHERE academic_year_id = :year AND date = :date', ['year' => $yearId, 'date' => $date], 'date');
        $id = $this->insert('holidays', [
            'academic_year_id' => $yearId,
            'date' => $date,
            'label' => $this->requiredString($request, 'label', 'label'),
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'academic', 'holiday.create', 'holiday', $id, null, ['date' => $date]);

        return Response::json($this->fetchOne('SELECT * FROM holidays WHERE id = :id', ['id' => $id]), 201);
    }

    public function deleteHoliday(Request $request, int $id): Response
    {
        $holiday = $this->fetchOne('SELECT * FROM holidays WHERE id = :id', ['id' => $id]);
        if ($holiday === null) {
            throw HttpException::notFound();
        }
        $this->execute('DELETE FROM holidays WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'academic', 'holiday.delete', 'holiday', $id, $holiday);

        return Response::noContent();
    }

    private function saveSemesters(int $yearId, array $semesters, string $yearStart, string $yearEnd): void
    {
        foreach ([1, 2] as $number) {
            $entry = $semesters[(string) $number] ?? $semesters[$number - 1] ?? null;
            if (!is_array($entry)) {
                throw HttpException::validation(['semesters' => 'academic.twoSemestersRequired']);
            }
            $start = (string) ($entry['startDate'] ?? '');
            $end = (string) ($entry['endDate'] ?? '');
            if (!$this->isDate($start) || !$this->isDate($end)) {
                throw HttpException::validation(['semesters' => 'validation.invalidDate']);
            }
            $this->validateSemesterDates($yearId, $number, $start, $end, ['start_date' => $yearStart, 'end_date' => $yearEnd]);
            $this->insert('semesters', [
                'academic_year_id' => $yearId,
                'number' => $number,
                'name' => (string) ($entry['name'] ?? 'Semester ' . $number),
                'start_date' => $start,
                'end_date' => $end,
                'created_at' => $this->now(),
            ]);
        }
    }

    private function validateSemesterDates(int $yearId, int $number, string $start, string $end, ?array $year, ?int $ignoreId = null): void
    {
        if ($year === null) {
            throw HttpException::notFound();
        }
        if ($start > $end || $start < $year['start_date'] || $end > $year['end_date']) {
            throw HttpException::validation(['startDate' => 'validation.outsideAcademicYear', 'endDate' => 'validation.outsideAcademicYear']);
        }
        $sql = 'SELECT id FROM semesters WHERE academic_year_id = :year AND number <> :number AND start_date <= :end AND end_date >= :start';
        $params = ['year' => $yearId, 'number' => $number, 'start' => $start, 'end' => $end];
        if ($ignoreId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreId;
        }
        if ($this->fetchOne($sql, $params) !== null) {
            throw HttpException::validation(['startDate' => 'academic.semesterOverlap']);
        }
    }

    private function isDate(string $value): bool
    {
        $parsed = \DateTimeImmutable::createFromFormat('Y-m-d', $value);

        return $parsed !== false && $parsed->format('Y-m-d') === $value;
    }

    private function requireExists(string $table, int $id, string $field): void
    {
        if ($this->fetchOne('SELECT id FROM ' . $table . ' WHERE id = :id', ['id' => $id]) === null) {
            throw HttpException::validation([$field => 'validation.invalid']);
        }
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