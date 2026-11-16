<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Support\Csv;
use PDO;

final class PeopleController extends Controller
{
    public function __construct(PDO $db, private readonly array $config)
    {
        parent::__construct($db);
    }

    public function students(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $search = $this->queryString($request, 'search');
        $status = $this->queryString($request, 'status');
        $yearId = $this->queryString($request, 'academicYearId');
        $sectionId = $this->queryString($request, 'sectionId');
        $gradeId = $this->queryString($request, 'gradeLevelId');
        $where = [];
        $params = [];

        if ($search !== null) {
            $where[] = '(st.first_name LIKE :search OR st.last_name LIKE :search OR st.admission_number LIKE :search OR st.phone LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        if ($status !== null) {
            $where[] = 'st.status = :status';
            $params['status'] = $status;
        }
        if ($yearId !== null) {
            $where[] = 'e.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        if ($sectionId !== null) {
            $where[] = 'e.section_id = :section';
            $params['section'] = (int) $sectionId;
        }
        if ($gradeId !== null) {
            $where[] = 'sec.grade_level_id = :grade';
            $params['grade'] = (int) $gradeId;
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM students st
                 LEFT JOIN enrollments e ON e.student_id = st.id AND e.status = \'active\'
                 LEFT JOIN sections sec ON sec.id = e.section_id
                 LEFT JOIN grade_levels g ON g.id = sec.grade_level_id';
        $total = (int) $this->fetchOne('SELECT COUNT(DISTINCT st.id) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT st.*, e.id AS enrollment_id, e.section_id, e.academic_year_id,
                    sec.name AS section_name, g.number AS grade_number, g.name AS grade_name,
                    y.label AS academic_year_label
             ' . $base . '
             LEFT JOIN academic_years y ON y.id = e.academic_year_id
             ' . $whereSql . '
             ORDER BY st.last_name, st.first_name, st.id LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function showStudent(Request $request, int $id): Response
    {
        $student = $this->student($id);
        $student['guardians'] = $this->fetchAll(
            'SELECT g.*, sg.relationship, sg.is_primary FROM student_guardians sg
             JOIN guardians g ON g.id = sg.guardian_id WHERE sg.student_id = :id ORDER BY sg.is_primary DESC, g.last_name',
            ['id' => $id],
        );
        $student['enrollments'] = $this->fetchAll(
            'SELECT e.*, sec.name AS section_name, g.number AS grade_number, g.name AS grade_name, y.label AS academic_year_label
             FROM enrollments e JOIN sections sec ON sec.id = e.section_id JOIN grade_levels g ON g.id = sec.grade_level_id
             JOIN academic_years y ON y.id = e.academic_year_id WHERE e.student_id = :id ORDER BY e.started_at DESC',
            ['id' => $id],
        );
        $student['siblings'] = $this->fetchAll(
            'SELECT st.id, st.admission_number, st.first_name, st.last_name FROM siblings s
             JOIN students st ON st.id = s.sibling_id WHERE s.student_id = :id ORDER BY st.first_name',
            ['id' => $id],
        );
        $student['documents'] = $this->fetchAll(
            'SELECT id, original_name, mime_type, size, created_at FROM documents WHERE entity_type = \'student\' AND entity_id = :id ORDER BY created_at DESC',
            ['id' => $id],
        );
        $student['attendance'] = $this->fetchAll(
            'SELECT status, COUNT(*) AS total FROM attendance_records WHERE student_id = :id GROUP BY status',
            ['id' => $id],
        );
        $student['invoices'] = $this->fetchAll(
            'SELECT id, billing_period, invoice_number, status, total, paid_total, balance, due_date
             FROM invoices WHERE student_id = :id ORDER BY billing_period DESC LIMIT 12',
            ['id' => $id],
        );
        $student['user'] = $student['user_id'] === null ? null : $this->fetchOne(
            'SELECT id, name, email, status FROM users WHERE id = :id',
            ['id' => $student['user_id']],
        );

        return Response::json($student);
    }

    public function createStudent(Request $request): Response
    {
        $firstName = $this->requiredString($request, 'firstName', 'firstName');
        $lastName = $this->requiredString($request, 'lastName', 'lastName');
        $admissionNumber = $this->inputString($request, 'admissionNumber') ?: $this->nextAdmissionNumber();
        $this->ensureUnique('SELECT id FROM students WHERE admission_number = :number', ['number' => $admissionNumber], 'admissionNumber');

        $studentId = $this->transaction(function () use ($request, $firstName, $lastName, $admissionNumber): int {
            $id = $this->insert('students', [
                'admission_number' => $admissionNumber,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name_fa' => $this->inputString($request, 'nameFa'),
                'name_ps' => $this->inputString($request, 'namePs'),
                'gender' => $this->inputString($request, 'gender'),
                'date_of_birth' => $this->dateInput($request, 'dateOfBirth', 'dateOfBirth', false),
                'phone' => $this->inputString($request, 'phone'),
                'address' => $this->inputString($request, 'address'),
                'photo_path' => $this->storeDataUrl((string) $request->input('photoData', '')),
                'status' => 'active',
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);

            $guardian = $request->input('guardian');
            if (is_array($guardian)) {
                $this->createGuardianForStudent($id, $guardian, true);
            }

            $sectionId = $this->intInput($request, 'sectionId');
            if ($sectionId !== null) {
                $this->enroll($id, $sectionId, 'active');
            }

            return $id;
        });

        $this->audit($request, 'people', 'student.create', 'student', $studentId, null, ['admissionNumber' => $admissionNumber]);

        return $this->showStudent($request, $studentId)->withHeader('X-Resource-Id', (string) $studentId);
    }

    public function updateStudent(Request $request, int $id): Response
    {
        $student = $this->student($id);
        $values = [];
        foreach ([
            'firstName' => 'first_name', 'lastName' => 'last_name', 'nameFa' => 'name_fa', 'namePs' => 'name_ps',
            'gender' => 'gender', 'phone' => 'phone', 'address' => 'address',
        ] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if (isset($values['first_name']) && $values['first_name'] === null) {
            throw HttpException::validation(['firstName' => 'validation.required']);
        }
        if (isset($values['last_name']) && $values['last_name'] === null) {
            throw HttpException::validation(['lastName' => 'validation.required']);
        }
        if ($request->input('dateOfBirth') !== null) {
            $values['date_of_birth'] = $this->dateInput($request, 'dateOfBirth', 'dateOfBirth', false);
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['active', 'archived', 'graduated', 'withdrawn'], 'status');
        }
        if ($request->input('photoData') !== null) {
            $values['photo_path'] = $this->storeDataUrl((string) $request->input('photoData'));
        }
        if ($request->input('admissionNumber') !== null) {
            $admission = $this->requiredString($request, 'admissionNumber', 'admissionNumber');
            $this->ensureUnique('SELECT id FROM students WHERE admission_number = :number AND id <> :id', ['number' => $admission, 'id' => $id], 'admissionNumber');
            $values['admission_number'] = $admission;
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('students', $id, $values);
        $this->audit($request, 'people', 'student.update', 'student', $id, $student, $values);

        return $this->showStudent($request, $id);
    }

    public function addGuardian(Request $request, int $studentId): Response
    {
        $this->student($studentId);
        $guardianId = $this->intInput($request, 'guardianId');
        $primary = (bool) $request->input('isPrimary', false);

        if ($guardianId === null) {
            $guardianId = $this->createGuardianForStudent($studentId, $request->body ?? [], $primary);
        } else {
            if ($this->fetchOne('SELECT id FROM guardians WHERE id = :id', ['id' => $guardianId]) === null) {
                throw HttpException::validation(['guardianId' => 'validation.invalid']);
            }
            $this->linkGuardian($studentId, $guardianId, (string) ($request->input('relationship') ?? 'guardian'), $primary);
        }
        $this->audit($request, 'people', 'guardian.link', 'student', $studentId, null, ['guardianId' => $guardianId]);

        return Response::json($this->fetchOne('SELECT g.*, sg.relationship, sg.is_primary FROM guardians g JOIN student_guardians sg ON sg.guardian_id = g.id WHERE g.id = :id AND sg.student_id = :student', ['id' => $guardianId, 'student' => $studentId]), 201);
    }

    public function removeGuardian(Request $request, int $studentId, int $guardianId): Response
    {
        $link = $this->fetchOne('SELECT * FROM student_guardians WHERE student_id = :student AND guardian_id = :guardian', ['student' => $studentId, 'guardian' => $guardianId]);
        if ($link === null) {
            throw HttpException::notFound();
        }
        $this->execute('DELETE FROM student_guardians WHERE student_id = :student AND guardian_id = :guardian', ['student' => $studentId, 'guardian' => $guardianId]);
        $this->audit($request, 'people', 'guardian.unlink', 'student', $studentId, $link);

        return Response::noContent();
    }

    public function addSibling(Request $request, int $studentId): Response
    {
        $siblingId = $this->requiredInt($request, 'siblingId', 'siblingId');
        if ($siblingId === $studentId) {
            throw HttpException::validation(['siblingId' => 'validation.invalid']);
        }
        $this->student($studentId);
        $this->student($siblingId);
        foreach ([[$studentId, $siblingId], [$siblingId, $studentId]] as [$a, $b]) {
            $exists = $this->fetchOne('SELECT 1 FROM siblings WHERE student_id = :a AND sibling_id = :b', ['a' => $a, 'b' => $b]);
            if ($exists === null) {
                $this->insert('siblings', ['student_id' => $a, 'sibling_id' => $b, 'created_at' => $this->now()]);
            }
        }
        $this->audit($request, 'people', 'sibling.link', 'student', $studentId, null, ['siblingId' => $siblingId]);

        return Response::json(['studentId' => $studentId, 'siblingId' => $siblingId], 201);
    }

    public function staff(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $search = $this->queryString($request, 'search');
        $status = $this->queryString($request, 'status');
        $where = [];
        $params = [];
        if ($search !== null) {
            $where[] = '(first_name LIKE :search OR last_name LIKE :search OR employee_number LIKE :search OR specialization LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        if ($status !== null) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM staff ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll('SELECT * FROM staff ' . $whereSql . ' ORDER BY last_name, first_name LIMIT :limit OFFSET :offset', $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']]);

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function showStaff(Request $request, int $id): Response
    {
        $staff = $this->fetchOne('SELECT * FROM staff WHERE id = :id', ['id' => $id]);
        if ($staff === null) {
            throw HttpException::notFound('people.staffNotFound', 'Staff member not found.');
        }
        $staff['assignments'] = $this->fetchAll(
            'SELECT a.*, s.name AS subject_name, s.code AS subject_code, sec.name AS section_name, g.number AS grade_number
             FROM teaching_assignments a JOIN subjects s ON s.id = a.subject_id JOIN sections sec ON sec.id = a.section_id
             JOIN grade_levels g ON g.id = sec.grade_level_id WHERE a.teacher_staff_id = :id ORDER BY g.number, sec.name',
            ['id' => $id],
        );
        $staff['documents'] = $this->fetchAll('SELECT id, original_name, mime_type, size, created_at FROM documents WHERE entity_type = \'staff\' AND entity_id = :id', ['id' => $id]);
        $staff['user'] = $staff['user_id'] === null ? null : $this->fetchOne('SELECT id, name, email, status FROM users WHERE id = :id', ['id' => $staff['user_id']]);

        return Response::json($staff);
    }

    public function createStaff(Request $request): Response
    {
        $employeeNumber = $this->inputString($request, 'employeeNumber') ?: $this->nextEmployeeNumber();
        $this->ensureUnique('SELECT id FROM staff WHERE employee_number = :number', ['number' => $employeeNumber], 'employeeNumber');
        $id = $this->insert('staff', [
            'employee_number' => $employeeNumber,
            'first_name' => $this->requiredString($request, 'firstName', 'firstName'),
            'last_name' => $this->requiredString($request, 'lastName', 'lastName'),
            'name_fa' => $this->inputString($request, 'nameFa'),
            'name_ps' => $this->inputString($request, 'namePs'),
            'gender' => $this->inputString($request, 'gender'),
            'date_of_birth' => $this->dateInput($request, 'dateOfBirth', 'dateOfBirth', false),
            'phone' => $this->inputString($request, 'phone'),
            'email' => $this->inputString($request, 'email'),
            'address' => $this->inputString($request, 'address'),
            'qualification' => $this->inputString($request, 'qualification'),
            'specialization' => $this->inputString($request, 'specialization'),
            'hire_date' => $this->dateInput($request, 'hireDate', 'hireDate', false),
            'photo_path' => $this->storeDataUrl((string) $request->input('photoData', '')),
            'is_teacher' => (bool) $request->input('isTeacher', false) ? 1 : 0,
            'status' => 'active',
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->audit($request, 'people', 'staff.create', 'staff', $id, null, ['employeeNumber' => $employeeNumber]);

        return $this->showStaff($request, $id);
    }

    public function updateStaff(Request $request, int $id): Response
    {
        $staff = $this->fetchOne('SELECT * FROM staff WHERE id = :id', ['id' => $id]);
        if ($staff === null) {
            throw HttpException::notFound('people.staffNotFound', 'Staff member not found.');
        }
        $values = [];
        foreach ([
            'firstName' => 'first_name', 'lastName' => 'last_name', 'nameFa' => 'name_fa', 'namePs' => 'name_ps',
            'gender' => 'gender', 'phone' => 'phone', 'email' => 'email', 'address' => 'address',
            'qualification' => 'qualification', 'specialization' => 'specialization',
        ] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if ($request->input('dateOfBirth') !== null) {
            $values['date_of_birth'] = $this->dateInput($request, 'dateOfBirth', 'dateOfBirth', false);
        }
        if ($request->input('hireDate') !== null) {
            $values['hire_date'] = $this->dateInput($request, 'hireDate', 'hireDate', false);
        }
        if ($request->input('isTeacher') !== null) {
            $values['is_teacher'] = (bool) $request->input('isTeacher') ? 1 : 0;
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['active', 'archived'], 'status');
        }
        if ($request->input('employeeNumber') !== null) {
            $number = $this->requiredString($request, 'employeeNumber', 'employeeNumber');
            $this->ensureUnique('SELECT id FROM staff WHERE employee_number = :number AND id <> :id', ['number' => $number, 'id' => $id], 'employeeNumber');
            $values['employee_number'] = $number;
        }
        if ($request->input('photoData') !== null) {
            $values['photo_path'] = $this->storeDataUrl((string) $request->input('photoData'));
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('staff', $id, $values);
        $this->audit($request, 'people', 'staff.update', 'staff', $id, $staff, $values);

        return $this->showStaff($request, $id);
    }

    public function guardians(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $search = $this->queryString($request, 'search');
        $where = '';
        $params = [];
        if ($search !== null) {
            $where = 'WHERE g.first_name LIKE :search OR g.last_name LIKE :search OR g.phone LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM guardians g ' . $where, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT g.*, (SELECT COUNT(*) FROM student_guardians sg WHERE sg.guardian_id = g.id) AS child_count
             FROM guardians g ' . $where . ' ORDER BY g.last_name, g.first_name LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createGuardian(Request $request): Response
    {
        $id = $this->insert('guardians', [
            'first_name' => $this->requiredString($request, 'firstName', 'firstName'),
            'last_name' => $this->requiredString($request, 'lastName', 'lastName'),
            'phone' => $this->inputString($request, 'phone'),
            'email' => $this->inputString($request, 'email'),
            'address' => $this->inputString($request, 'address'),
            'occupation' => $this->inputString($request, 'occupation'),
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->audit($request, 'people', 'guardian.create', 'guardian', $id, null, ['name' => $request->input('firstName')]);
        $studentId = $this->intInput($request, 'studentId');
        if ($studentId !== null) {
            $this->linkGuardian($studentId, $id, (string) ($request->input('relationship') ?? 'guardian'), (bool) $request->input('isPrimary', false));
        }

        return Response::json($this->fetchOne('SELECT * FROM guardians WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateGuardian(Request $request, int $id): Response
    {
        $guardian = $this->fetchOne('SELECT * FROM guardians WHERE id = :id', ['id' => $id]);
        if ($guardian === null) {
            throw HttpException::notFound();
        }
        $values = [];
        foreach (['firstName' => 'first_name', 'lastName' => 'last_name', 'phone' => 'phone', 'email' => 'email', 'address' => 'address', 'occupation' => 'occupation'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('guardians', $id, $values);
        $this->audit($request, 'people', 'guardian.update', 'guardian', $id, $guardian, $values);

        return Response::json($this->fetchOne('SELECT * FROM guardians WHERE id = :id', ['id' => $id]));
    }

    public function applicants(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $status = $this->queryString($request, 'status');
        $search = $this->queryString($request, 'search');
        $where = [];
        $params = [];
        if ($status !== null) {
            $where[] = 'a.status = :status';
            $params['status'] = $status;
        }
        if ($search !== null) {
            $where[] = '(a.first_name LIKE :search OR a.last_name LIKE :search OR a.guardian_name LIKE :search OR a.phone LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM applicants a ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT a.*, g.number AS desired_grade_number, g.name AS desired_grade_name
             FROM applicants a LEFT JOIN grade_levels g ON g.id = a.desired_grade_level_id ' . $whereSql . '
             ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createApplicant(Request $request): Response
    {
        $id = $this->insert('applicants', [
            'first_name' => $this->requiredString($request, 'firstName', 'firstName'),
            'last_name' => $this->requiredString($request, 'lastName', 'lastName'),
            'date_of_birth' => $this->dateInput($request, 'dateOfBirth', 'dateOfBirth', false),
            'gender' => $this->inputString($request, 'gender'),
            'guardian_name' => $this->inputString($request, 'guardianName'),
            'phone' => $this->inputString($request, 'phone'),
            'desired_grade_level_id' => $this->intInput($request, 'desiredGradeLevelId'),
            'status' => 'applicant',
            'notes' => $this->inputString($request, 'notes'),
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->audit($request, 'admissions', 'applicant.create', 'applicant', $id, null, ['name' => $request->input('firstName') . ' ' . $request->input('lastName')]);

        return Response::json($this->fetchOne('SELECT * FROM applicants WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateApplicant(Request $request, int $id): Response
    {
        $applicant = $this->fetchOne('SELECT * FROM applicants WHERE id = :id', ['id' => $id]);
        if ($applicant === null) {
            throw HttpException::notFound();
        }
        $values = [];
        foreach (['firstName' => 'first_name', 'lastName' => 'last_name', 'gender' => 'gender', 'guardianName' => 'guardian_name', 'phone' => 'phone', 'notes' => 'notes'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if ($request->input('dateOfBirth') !== null) {
            $values['date_of_birth'] = $this->dateInput($request, 'dateOfBirth', 'dateOfBirth', false);
        }
        if ($request->input('desiredGradeLevelId') !== null) {
            $values['desired_grade_level_id'] = $this->intInput($request, 'desiredGradeLevelId');
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['applicant', 'admitted', 'rejected', 'withdrawn'], 'status');
            if ($values['status'] !== 'applicant') {
                $values['decision_at'] = $this->now();
            }
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('applicants', $id, $values);
        $this->audit($request, 'admissions', 'applicant.update', 'applicant', $id, $applicant, $values);

        return Response::json($this->fetchOne('SELECT * FROM applicants WHERE id = :id', ['id' => $id]));
    }

    public function admitApplicant(Request $request, int $id): Response
    {
        $applicant = $this->fetchOne('SELECT * FROM applicants WHERE id = :id', ['id' => $id]);
        if ($applicant === null) {
            throw HttpException::notFound();
        }
        if ($applicant['status'] === 'admitted') {
            throw HttpException::validation(['status' => 'admissions.alreadyAdmitted']);
        }

        $studentId = $this->transaction(function () use ($request, $applicant): int {
            $admissionNumber = $this->inputString($request, 'admissionNumber') ?: $this->nextAdmissionNumber();
            $this->ensureUnique('SELECT id FROM students WHERE admission_number = :number', ['number' => $admissionNumber], 'admissionNumber');
            $studentId = $this->insert('students', [
                'admission_number' => $admissionNumber,
                'first_name' => $applicant['first_name'],
                'last_name' => $applicant['last_name'],
                'gender' => $applicant['gender'],
                'date_of_birth' => $applicant['date_of_birth'],
                'phone' => $applicant['phone'],
                'status' => 'active',
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);

            if ($applicant['guardian_name']) {
                $parts = preg_split('/\s+/', trim((string) $applicant['guardian_name'])) ?: [];
                $guardianId = $this->insert('guardians', [
                    'first_name' => $parts[0] ?? 'Guardian',
                    'last_name' => count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : $applicant['last_name'],
                    'phone' => $applicant['phone'],
                    'created_at' => $this->now(),
                    'updated_at' => $this->now(),
                ]);
                $this->linkGuardian($studentId, $guardianId, 'guardian', true);
            }

            $sectionId = $this->intInput($request, 'sectionId');
            if ($sectionId !== null) {
                $this->enroll($studentId, $sectionId, 'active');
            }

            $this->execute(
                'UPDATE applicants SET status = \'admitted\', admitted_student_id = :student, decision_at = :at, updated_at = :at WHERE id = :id',
                ['student' => $studentId, 'at' => $this->now(), 'id' => $applicant['id']],
            );

            return $studentId;
        });

        $this->audit($request, 'admissions', 'applicant.admit', 'applicant', $id, $applicant, ['studentId' => $studentId]);

        return Response::json(['studentId' => $studentId, 'applicantId' => $id]);
    }

    public function enrollments(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $yearId = $this->queryString($request, 'academicYearId');
        $sectionId = $this->queryString($request, 'sectionId');
        $status = $this->queryString($request, 'status');
        $where = [];
        $params = [];
        foreach (['academicYearId' => 'e.academic_year_id', 'sectionId' => 'e.section_id'] as $key => $column) {
            $value = $this->queryString($request, $key);
            if ($value !== null) {
                $where[] = $column . ' = :' . $key;
                $params[$key] = (int) $value;
            }
        }
        if ($status !== null) {
            $where[] = 'e.status = :status';
            $params['status'] = $status;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM enrollments e JOIN students st ON st.id = e.student_id JOIN sections sec ON sec.id = e.section_id
                 JOIN grade_levels g ON g.id = sec.grade_level_id JOIN academic_years y ON y.id = e.academic_year_id';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT e.*, st.admission_number, st.first_name, st.last_name, sec.name AS section_name, g.number AS grade_number, g.name AS grade_name, y.label AS academic_year_label
             ' . $base . ' ' . $whereSql . ' ORDER BY y.start_date DESC, g.number, sec.name, st.last_name LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createEnrollment(Request $request): Response
    {
        $studentId = $this->requiredInt($request, 'studentId', 'studentId');
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $this->student($studentId);
        $existing = $this->fetchOne(
            'SELECT id FROM enrollments WHERE student_id = :student AND section_id = :section AND status = \'active\'',
            ['student' => $studentId, 'section' => $sectionId],
        );
        if ($existing !== null) {
            throw HttpException::validation(['studentId' => 'people.alreadyEnrolled']);
        }
        $id = $this->enroll($studentId, $sectionId, 'active');
        $this->audit($request, 'admissions', 'enrollment.create', 'enrollment', $id, null, ['studentId' => $studentId, 'sectionId' => $sectionId]);

        return Response::json($this->fetchOne('SELECT * FROM enrollments WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateEnrollment(Request $request, int $id): Response
    {
        $enrollment = $this->fetchOne('SELECT * FROM enrollments WHERE id = :id', ['id' => $id]);
        if ($enrollment === null) {
            throw HttpException::notFound();
        }
        $values = [];
        if ($request->input('status') !== null) {
            $status = $this->ensureOneOf($request, 'status', ['active', 'transferred', 'withdrawn', 'graduated'], 'status');
            $values['status'] = $status;
            if ($status !== 'active') {
                $values['ended_at'] = $this->now();
            }
        }
        if ($request->input('sectionId') !== null) {
            $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
            $section = $this->section($sectionId);
            if ((int) $section['academic_year_id'] !== (int) $enrollment['academic_year_id']) {
                throw HttpException::validation(['sectionId' => 'validation.invalid']);
            }
            $values['section_id'] = $sectionId;
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('enrollments', $id, $values);
        $this->audit($request, 'admissions', 'enrollment.update', 'enrollment', $id, $enrollment, $values);

        return Response::json($this->fetchOne('SELECT * FROM enrollments WHERE id = :id', ['id' => $id]));
    }

    public function transferEnrollment(Request $request, int $id): Response
    {
        $enrollment = $this->fetchOne('SELECT * FROM enrollments WHERE id = :id', ['id' => $id]);
        if ($enrollment === null) {
            throw HttpException::notFound();
        }
        $sectionId = $this->requiredInt($request, 'sectionId', 'sectionId');
        $section = $this->section($sectionId);
        if ((int) $section['academic_year_id'] !== (int) $enrollment['academic_year_id']) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }
        $newId = $this->transaction(function () use ($enrollment, $sectionId): int {
            $this->execute('UPDATE enrollments SET status = \'transferred\', ended_at = :at, updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $enrollment['id']]);
            $this->assertSectionCapacity($sectionId);

            return $this->insert('enrollments', [
                'student_id' => $enrollment['student_id'],
                'section_id' => $sectionId,
                'academic_year_id' => $enrollment['academic_year_id'],
                'status' => 'active',
                'started_at' => $this->now(),
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);
        });
        $this->audit($request, 'admissions', 'enrollment.transfer', 'enrollment', $id, $enrollment, ['newEnrollmentId' => $newId, 'sectionId' => $sectionId]);

        return Response::json($this->fetchOne('SELECT * FROM enrollments WHERE id = :id', ['id' => $newId]), 201);
    }

    public function promote(Request $request): Response
    {
        $studentIds = $request->input('studentIds');
        if (!is_array($studentIds) || $studentIds === []) {
            throw HttpException::validation(['studentIds' => 'validation.required']);
        }
        $outcome = $this->ensureOneOf($request, 'outcome', ['promoted', 'retained', 'graduated'], 'outcome');
        $sectionId = $this->intInput($request, 'toSectionId');
        $yearId = $this->intInput($request, 'academicYearId');
        if ($outcome !== 'graduated' && $sectionId === null) {
            throw HttpException::validation(['toSectionId' => 'validation.required']);
        }
        $section = $sectionId === null ? null : $this->section($sectionId);
        if ($section !== null) {
            $yearId = (int) $section['academic_year_id'];
        }
        if ($yearId === null) {
            throw HttpException::validation(['academicYearId' => 'validation.required']);
        }

        $created = 0;
        $processed = 0;
        $this->transaction(function () use ($studentIds, $outcome, $sectionId, $yearId, &$created, &$processed): void {
            foreach ($studentIds as $studentId) {
                $studentId = (int) $studentId;
                $student = $this->fetchOne('SELECT * FROM students WHERE id = :id', ['id' => $studentId]);
                if ($student === null) {
                    continue;
                }
                $current = $this->fetchOne('SELECT * FROM enrollments WHERE student_id = :student AND status = \'active\' ORDER BY started_at DESC LIMIT 1', ['student' => $studentId]);
                if ($outcome === 'graduated') {
                    if ($current !== null) {
                        $this->execute('UPDATE enrollments SET status = \'graduated\', ended_at = :at, updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $current['id']]);
                    }
                    $this->execute('UPDATE students SET status = \'graduated\', updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $studentId]);
                } else {
                    if ($current !== null) {
                        $this->execute('UPDATE enrollments SET status = \'transferred\', ended_at = :at, updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $current['id']]);
                    }
                    if ($sectionId !== null) {
                        $this->assertSectionCapacity((int) $sectionId);
                        $newId = $this->insert('enrollments', [
                            'student_id' => $studentId,
                            'section_id' => (int) $sectionId,
                            'academic_year_id' => $yearId,
                            'status' => 'active',
                            'started_at' => $this->now(),
                            'created_at' => $this->now(),
                            'updated_at' => $this->now(),
                        ]);
                        $created++;
                        $this->insert('promotions', [
                            'student_id' => $studentId,
                            'from_enrollment_id' => $current['id'] ?? null,
                            'to_enrollment_id' => $newId,
                            'academic_year_id' => $yearId,
                            'outcome' => $outcome,
                            'notes' => $this->inputString($request, 'notes'),
                            'actor_user_id' => $this->user($request)->id,
                            'created_at' => $this->now(),
                        ]);
                    }
                }
                $processed++;
            }
        });
        $this->audit($request, 'admissions', 'promotion.run', 'academic_year', $yearId, null, ['outcome' => $outcome, 'processed' => $processed]);

        return Response::json(['processed' => $processed, 'enrollmentsCreated' => $created]);
    }

    public function exportStudents(Request $request): Response
    {
        $rows = $this->fetchAll(
            'SELECT st.admission_number, st.first_name, st.last_name, st.name_fa, st.name_ps, st.gender,
                    st.date_of_birth, st.phone, st.address, st.status, g.number AS grade_number, sec.name AS section_name,
                    y.label AS academic_year
             FROM students st
             LEFT JOIN enrollments e ON e.student_id = st.id AND e.status = \'active\'
             LEFT JOIN sections sec ON sec.id = e.section_id
             LEFT JOIN grade_levels g ON g.id = sec.grade_level_id
             LEFT JOIN academic_years y ON y.id = e.academic_year_id
             ORDER BY st.last_name, st.first_name',
        );

        return Csv::response(
            ['admission_number', 'first_name', 'last_name', 'name_fa', 'name_ps', 'gender', 'date_of_birth', 'phone', 'address', 'status', 'grade', 'section', 'academic_year'],
            $rows,
            'students.csv',
        );
    }

    public function importStudents(Request $request): Response
    {
        $text = (string) $request->input('csv', '');
        if (trim($text) === '') {
            throw HttpException::validation(['csv' => 'validation.required']);
        }
        $lines = preg_split('/\r\n|\n|\r/', trim($text)) ?: [];
        $headers = str_getcsv(array_shift($lines) ?: '');
        $headers = array_map(static fn (string $header): string => strtolower(trim($header)), $headers);
        $required = ['first_name', 'last_name'];
        foreach ($required as $column) {
            if (!in_array($column, $headers, true)) {
                throw HttpException::validation(['csv' => 'csv.missingHeader']);
            }
        }
        $created = 0;
        $skipped = [];
        foreach ($lines as $index => $line) {
            if (trim($line) === '') {
                continue;
            }
            $values = array_combine($headers, array_pad(str_getcsv($line), count($headers), ''));
            if ($values === false || trim((string) ($values['first_name'] ?? '')) === '' || trim((string) ($values['last_name'] ?? '')) === '') {
                $skipped[] = ['line' => $index + 2, 'reason' => 'validation.required'];
                continue;
            }
            $admission = trim((string) ($values['admission_number'] ?? '')) ?: $this->nextAdmissionNumber();
            if ($this->fetchOne('SELECT id FROM students WHERE admission_number = :number', ['number' => $admission]) !== null) {
                $skipped[] = ['line' => $index + 2, 'reason' => 'validation.duplicate'];
                continue;
            }
            $id = $this->insert('students', [
                'admission_number' => $admission,
                'first_name' => trim((string) $values['first_name']),
                'last_name' => trim((string) $values['last_name']),
                'name_fa' => trim((string) ($values['name_fa'] ?? '')) ?: null,
                'name_ps' => trim((string) ($values['name_ps'] ?? '')) ?: null,
                'gender' => trim((string) ($values['gender'] ?? '')) ?: null,
                'date_of_birth' => trim((string) ($values['date_of_birth'] ?? '')) ?: null,
                'phone' => trim((string) ($values['phone'] ?? '')) ?: null,
                'address' => trim((string) ($values['address'] ?? '')) ?: null,
                'status' => 'active',
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);
            $sectionId = null;
            if (!empty($values['section_id']) && is_numeric($values['section_id'])) {
                $sectionId = (int) $values['section_id'];
            }
            if ($sectionId !== null) {
                try {
                    $this->enroll($id, $sectionId, 'active');
                } catch (\Throwable) {
                    // The student is still created even if the section is invalid.
                }
            }
            $created++;
        }
        $this->audit($request, 'people', 'student.import', 'student', null, null, ['created' => $created, 'skipped' => count($skipped)]);

        return Response::json(['created' => $created, 'skipped' => $skipped]);
    }

    public function exportStaff(Request $request): Response
    {
        $rows = $this->fetchAll(
            'SELECT employee_number, first_name, last_name, gender, date_of_birth, phone, email, qualification, specialization,
                    hire_date, is_teacher, status FROM staff ORDER BY last_name, first_name',
        );

        return Csv::response(
            ['employee_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'email', 'qualification', 'specialization', 'hire_date', 'is_teacher', 'status'],
            $rows,
            'staff.csv',
        );
    }

    public function uploadDocument(Request $request): Response
    {
        $entityType = $this->ensureOneOf($request, 'entityType', ['student', 'staff', 'applicant', 'guardian'], 'entityType');
        $entityId = $this->requiredInt($request, 'entityId', 'entityId');
        $this->requireEntity($entityType, $entityId);
        $data = (string) $request->input('dataUrl', '');
        if (!preg_match('/^data:([A-Za-z0-9.+\/-]+);base64,([A-Za-z0-9+\/=\s]+)$/', $data, $matches)) {
            throw HttpException::validation(['dataUrl' => 'validation.invalid']);
        }
        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]) ?? '', true);
        if ($binary === false || strlen($binary) > 10 * 1024 * 1024) {
            throw HttpException::validation(['dataUrl' => 'validation.fileTooLarge']);
        }
        $mime = $matches[1];
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!in_array($mime, $allowed, true)) {
            throw HttpException::validation(['dataUrl' => 'validation.fileType']);
        }
        $extension = match ($mime) {
            'application/pdf' => 'pdf',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
        $directory = $this->config['storage']['path'] . '/documents';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException('Unable to create document storage.');
        }
        $stored = bin2hex(random_bytes(16)) . '.' . $extension;
        file_put_contents($directory . '/' . $stored, $binary);
        $id = $this->insert('documents', [
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'original_name' => $this->inputString($request, 'fileName') ?: ('document.' . $extension),
            'stored_name' => $stored,
            'mime_type' => $mime,
            'size' => strlen($binary),
            'uploaded_by' => $this->user($request)->id,
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'people', 'document.upload', $entityType, $entityId, null, ['documentId' => $id]);

        return Response::json($this->fetchOne('SELECT id, original_name, mime_type, size, created_at FROM documents WHERE id = :id', ['id' => $id]), 201);
    }

    public function downloadDocument(Request $request, int $id): Response
    {
        $document = $this->fetchOne('SELECT * FROM documents WHERE id = :id', ['id' => $id]);
        if ($document === null) {
            throw HttpException::notFound();
        }
        $path = $this->config['storage']['path'] . '/documents/' . $document['stored_name'];
        if (!is_file($path)) {
            throw HttpException::notFound();
        }
        $body = file_get_contents($path);

        return new Response(200, [
            'Content-Type' => (string) $document['mime_type'],
            'Content-Disposition' => 'attachment; filename="' . addslashes((string) $document['original_name']) . '"',
        ], $body === false ? '' : $body);
    }

    public function deleteDocument(Request $request, int $id): Response
    {
        $document = $this->fetchOne('SELECT * FROM documents WHERE id = :id', ['id' => $id]);
        if ($document === null) {
            throw HttpException::notFound();
        }
        $path = $this->config['storage']['path'] . '/documents/' . $document['stored_name'];
        if (is_file($path)) {
            @unlink($path);
        }
        $this->execute('DELETE FROM documents WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'people', 'document.delete', $document['entity_type'], $document['entity_id'], $document);

        return Response::noContent();
    }

    public function createAccount(Request $request, string $entityType, int $entityId): Response
    {
        $allowed = ['student', 'staff', 'guardian'];
        if (!in_array($entityType, $allowed, true)) {
            throw HttpException::notFound();
        }
        $this->requireEntity($entityType, $entityId);
        $table = $entityType === 'staff' ? 'staff' : ($entityType === 'student' ? 'students' : 'guardians');
        $entity = $this->fetchOne('SELECT * FROM ' . $table . ' WHERE id = :id', ['id' => $entityId]);
        if (!empty($entity['user_id'])) {
            throw HttpException::validation(['email' => 'people.accountExists']);
        }
        $email = strtolower($this->requiredString($request, 'email', 'email'));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw HttpException::validation(['email' => 'validation.email']);
        }
        $this->ensureUnique('SELECT id FROM users WHERE email = :email', ['email' => $email], 'email');
        $roleSlug = (string) ($request->input('roleSlug') ?? ($entityType === 'staff' ? 'teacher' : $entityType));
        if (!in_array($roleSlug, ['teacher', 'student', 'guardian'], true)) {
            throw HttpException::validation(['roleSlug' => 'validation.invalid']);
        }
        $roleId = $this->fetchOne('SELECT id FROM roles WHERE slug = :slug', ['slug' => $roleSlug]);
        if ($roleId === null) {
            throw HttpException::validation(['roleSlug' => 'validation.invalid']);
        }
        $password = (string) ($request->input('password') ?? bin2hex(random_bytes(6)));
        if (strlen($password) < 8) {
            throw HttpException::validation(['password' => 'auth.passwordTooShort']);
        }
        $name = trim(($entity['first_name'] ?? '') . ' ' . ($entity['last_name'] ?? ''));
        $id = $this->transaction(function () use ($name, $email, $password, $roleId, $table, $entityId): int {
            $userId = $this->insert('users', [
                'name' => $name,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'role_id' => (int) $roleId['id'],
                'status' => 'active',
                'must_change_password' => 1,
                'created_at' => $this->now(),
                'updated_at' => $this->now(),
            ]);
            $this->updateRow($table, $entityId, ['user_id' => $userId]);

            return $userId;
        });
        $this->audit($request, 'people', 'account.create', $entityType, $entityId, null, ['userId' => $id]);

        return Response::json(['userId' => $id, 'email' => $email], 201);
    }

    private function student(int $id): array
    {
        $student = $this->fetchOne('SELECT * FROM students WHERE id = :id', ['id' => $id]);
        if ($student === null) {
            throw HttpException::notFound('people.studentNotFound', 'Student not found.');
        }

        return $student;
    }

    private function section(int $id): array
    {
        $section = $this->fetchOne('SELECT * FROM sections WHERE id = :id', ['id' => $id]);
        if ($section === null) {
            throw HttpException::validation(['sectionId' => 'validation.invalid']);
        }

        return $section;
    }

    private function enroll(int $studentId, int $sectionId, string $status): int
    {
        $section = $this->section($sectionId);
        $active = $this->fetchOne(
            'SELECT id FROM enrollments WHERE student_id = :student AND academic_year_id = :year AND status = \'active\'',
            ['student' => $studentId, 'year' => $section['academic_year_id']],
        );
        if ($active !== null) {
            throw HttpException::validation(['studentId' => 'people.alreadyEnrolled']);
        }
        $this->assertSectionCapacity($sectionId);

        return $this->insert('enrollments', [
            'student_id' => $studentId,
            'section_id' => $sectionId,
            'academic_year_id' => (int) $section['academic_year_id'],
            'status' => $status,
            'started_at' => $this->now(),
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
    }

    private function assertSectionCapacity(int $sectionId): void
    {
        $section = $this->section($sectionId);
        $count = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM enrollments WHERE section_id = :id AND status = \'active\'', ['id' => $sectionId])['total'];
        if ($count >= (int) $section['capacity']) {
            throw HttpException::validation(['sectionId' => 'academic.sectionFull']);
        }
    }

    private function createGuardianForStudent(int $studentId, array $data, bool $primary): int
    {
        $guardianId = $this->insert('guardians', [
            'first_name' => trim((string) ($data['firstName'] ?? '')) ?: 'Guardian',
            'last_name' => trim((string) ($data['lastName'] ?? '')) ?: 'Guardian',
            'phone' => trim((string) ($data['phone'] ?? '')) ?: null,
            'email' => trim((string) ($data['email'] ?? '')) ?: null,
            'address' => trim((string) ($data['address'] ?? '')) ?: null,
            'occupation' => trim((string) ($data['occupation'] ?? '')) ?: null,
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->linkGuardian($studentId, $guardianId, (string) ($data['relationship'] ?? 'guardian'), $primary);

        return $guardianId;
    }

    private function linkGuardian(int $studentId, int $guardianId, string $relationship, bool $primary): void
    {
        if ($primary) {
            $this->execute('UPDATE student_guardians SET is_primary = 0 WHERE student_id = :student', ['student' => $studentId]);
        }
        $this->execute(
            'INSERT INTO student_guardians (student_id, guardian_id, relationship, is_primary, created_at)
             VALUES (:student, :guardian, :relationship, :primary, :created_at)
             ON CONFLICT(student_id, guardian_id) DO UPDATE SET relationship = excluded.relationship, is_primary = excluded.is_primary',
            [
                'student' => $studentId,
                'guardian' => $guardianId,
                'relationship' => $relationship,
                'primary' => $primary ? 1 : 0,
                'created_at' => $this->now(),
            ],
        );
    }

    private function nextAdmissionNumber(): string
    {
        $year = (int) gmdate('Y');
        $count = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM students')['total'] + 1;

        return sprintf('STU-%d-%04d', $year, $count);
    }

    private function nextEmployeeNumber(): string
    {
        $year = (int) gmdate('Y');
        $count = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM staff')['total'] + 1;

        return sprintf('EMP-%d-%04d', $year, $count);
    }

    private function requireEntity(string $entityType, int $entityId): void
    {
        $table = match ($entityType) {
            'student' => 'students',
            'staff' => 'staff',
            'applicant' => 'applicants',
            'guardian' => 'guardians',
        };
        if ($this->fetchOne('SELECT id FROM ' . $table . ' WHERE id = :id', ['id' => $entityId]) === null) {
            throw HttpException::validation(['entityId' => 'validation.invalid']);
        }
    }

    private function storeDataUrl(string $data): ?string
    {
        if ($data === '') {
            return null;
        }
        if (!preg_match('/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+\/=\s]+)$/', $data, $matches)) {
            throw HttpException::validation(['photoData' => 'validation.invalid']);
        }
        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]) ?? '', true);
        if ($binary === false || strlen($binary) > 2 * 1024 * 1024) {
            throw HttpException::validation(['photoData' => 'validation.fileTooLarge']);
        }
        $extension = match ($matches[1]) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
        $directory = $this->config['storage']['path'] . '/photos';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException('Unable to create photo storage.');
        }
        $stored = bin2hex(random_bytes(16)) . '.' . $extension;
        file_put_contents($directory . '/' . $stored, $binary);

        return $stored;
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