<?php

declare(strict_types=1);

/**
 * Classes read-model fixtures.
 *
 * Adds a second teacher account, a controlled current-year Section, a
 * deliberately over-capacity Section, a past-year Section, an empty Academic
 * Year, and attendance records with known totals. The output is JSON so the
 * test can address the records it just created.
 */

$container = require dirname(__DIR__, 3) . '/api/bootstrap.php';

/** @var \PDO $pdo */
$pdo = $container->get(PDO::class);
$now = gmdate('Y-m-d\TH:i:s\Z');

$insert = static function (string $table, array $values) use ($pdo): int {
    $columns = array_keys($values);
    $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);
    $statement = $pdo->prepare(
        'INSERT INTO ' . $table . ' (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')',
    );
    $statement->execute($values);

    return (int) $pdo->lastInsertId();
};
$scalar = static function (string $sql, array $params = []) use ($pdo): mixed {
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $value = $statement->fetchColumn();

    return $value === false ? null : $value;
};
$rows = static function (string $sql, array $params = []) use ($pdo): array {
    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return $statement->fetchAll();
};

$currentYear = $rows('SELECT * FROM academic_years WHERE is_current = 1')[0] ?? null;
if ($currentYear === null) {
    fwrite(STDERR, "The current Academic Year is missing.\n");
    exit(1);
}
$currentYearId = (int) $currentYear['id'];

$grade9 = (int) $scalar('SELECT id FROM grade_levels WHERE number = 9');
$grade12 = (int) $scalar('SELECT id FROM grade_levels WHERE number = 12');
$subjectIds = [];
foreach (['MATH', 'DARI', 'ENG'] as $code) {
    $subjectIds[$code] = (int) $scalar('SELECT id FROM subjects WHERE code = :code', ['code' => $code]);
}

$pastYearId = $insert('academic_years', [
    'label' => '2020–2021',
    'start_date' => '2020-03-21',
    'end_date' => '2021-01-20',
    'is_current' => 0,
    'created_at' => $now,
    'updated_at' => $now,
]);
$emptyYearId = $insert('academic_years', [
    'label' => '2018–2019',
    'start_date' => '2018-03-21',
    'end_date' => '2019-01-20',
    'is_current' => 0,
    'created_at' => $now,
    'updated_at' => $now,
]);

$teacherRoleId = (int) $scalar("SELECT id FROM roles WHERE slug = 'teacher'");
$passwordHash = password_hash('Meridian@2026', PASSWORD_DEFAULT);

$createTeacher = static function (string $firstName, string $lastName, string $email, string $employeeNumber) use (
    $pdo,
    $insert,
    $teacherRoleId,
    $passwordHash,
    $now,
): int {
    $userId = $insert('users', [
        'name' => $firstName . ' ' . $lastName,
        'email' => $email,
        'password_hash' => $passwordHash,
        'role_id' => $teacherRoleId,
        'status' => 'active',
        'must_change_password' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $staffId = $insert('staff', [
        'employee_number' => $employeeNumber,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'is_teacher' => 1,
        'status' => 'active',
        'user_id' => $userId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return $staffId;
};

$teacherTwo = $createTeacher('Wahid', 'Sultani', 'classes.teacher@meridian.academy', 'EMP-CLASS-T2');
$teacherThree = $createTeacher('Zarmina', 'Kakar', 'classes.other@meridian.academy', 'EMP-CLASS-T3');

$sectionC = $insert('sections', [
    'academic_year_id' => $currentYearId,
    'grade_level_id' => $grade9,
    'name' => 'C',
    'capacity' => 3,
    'homeroom_teacher_id' => $teacherTwo,
    'created_at' => $now,
    'updated_at' => $now,
]);
$sectionD = $insert('sections', [
    'academic_year_id' => $currentYearId,
    'grade_level_id' => $grade9,
    'name' => 'D',
    'capacity' => 1,
    'homeroom_teacher_id' => $teacherThree,
    'created_at' => $now,
    'updated_at' => $now,
]);
$sectionZ = $insert('sections', [
    'academic_year_id' => $pastYearId,
    'grade_level_id' => $grade12,
    'name' => 'Z',
    'capacity' => 2,
    'homeroom_teacher_id' => $teacherTwo,
    'created_at' => $now,
    'updated_at' => $now,
]);
$sectionZCurrent = $insert('sections', [
    'academic_year_id' => $currentYearId,
    'grade_level_id' => $grade12,
    'name' => 'Z',
    'capacity' => 5,
    'created_at' => $now,
    'updated_at' => $now,
]);

$periodOne = $insert('periods', [
    'section_id' => $sectionC,
    'sort_order' => 1,
    'kind' => 'period',
    'label' => 'Period 1',
    'start_time' => '08:00',
    'end_time' => '08:45',
    'created_at' => $now,
]);
$periodTwo = $insert('periods', [
    'section_id' => $sectionC,
    'sort_order' => 2,
    'kind' => 'period',
    'label' => 'Period 2',
    'start_time' => '08:50',
    'end_time' => '09:35',
    'created_at' => $now,
]);

// A controlled current-year curriculum: three Subjects with one gap.
$pdo->prepare('DELETE FROM curriculum WHERE academic_year_id = :year AND grade_level_id = :grade')
    ->execute(['year' => $currentYearId, 'grade' => $grade9]);
foreach (['MATH', 'DARI', 'ENG'] as $code) {
    $insert('curriculum', [
        'academic_year_id' => $currentYearId,
        'grade_level_id' => $grade9,
        'subject_id' => $subjectIds[$code],
        'weekly_periods' => 4,
        'is_elective' => 0,
        'created_at' => $now,
    ]);
}
$insert('curriculum', [
    'academic_year_id' => $pastYearId,
    'grade_level_id' => $grade12,
    'subject_id' => $subjectIds['MATH'],
    'weekly_periods' => 4,
    'is_elective' => 0,
    'created_at' => $now,
]);
$insert('curriculum', [
    'academic_year_id' => $pastYearId,
    'grade_level_id' => $grade12,
    'subject_id' => $subjectIds['DARI'],
    'weekly_periods' => 4,
    'is_elective' => 0,
    'created_at' => $now,
]);

// Section C teaches Maths and Dari but leaves English unassigned.
$mathAssignmentC = null;
foreach (['MATH', 'DARI'] as $code) {
    $assignmentId = $insert('teaching_assignments', [
        'teacher_staff_id' => $teacherTwo,
        'subject_id' => $subjectIds[$code],
        'section_id' => $sectionC,
        'academic_year_id' => $currentYearId,
        'created_at' => $now,
    ]);
    if ($code === 'MATH') {
        $mathAssignmentC = $assignmentId;
    }
}
$insert('lessons', [
    'section_id' => $sectionC,
    'period_id' => $periodOne,
    'teaching_assignment_id' => $mathAssignmentC,
    'day_of_week' => 0,
    'room_id' => null,
    'created_at' => $now,
]);
$insert('teaching_assignments', [
    'teacher_staff_id' => $teacherThree,
    'subject_id' => $subjectIds['MATH'],
    'section_id' => $sectionD,
    'academic_year_id' => $currentYearId,
    'created_at' => $now,
]);

$createStudent = static function (string $admissionNumber, string $firstName, string $lastName) use ($insert, $now): int {
    return $insert('students', [
        'admission_number' => $admissionNumber,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
};
$createEnrollment = static function (int $studentId, int $sectionId, int $yearId, string $status, ?string $endedAt = null) use ($insert, $now): int {
    return $insert('enrollments', [
        'student_id' => $studentId,
        'section_id' => $sectionId,
        'academic_year_id' => $yearId,
        'status' => $status,
        'started_at' => '2026-03-21',
        'ended_at' => $endedAt,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
};

$studentC1 = $createStudent('CLS-C-001', 'Baseer', 'Ahmadi');
$studentC2 = $createStudent('CLS-C-002', 'Nadia', 'Safi');
$studentC3 = $createStudent('CLS-C-003', 'Omid', 'Noori');
$studentC4 = $createStudent('CLS-C-004', 'Sara', 'Karimi');
foreach ([$studentC1, $studentC2, $studentC3] as $studentId) {
    $createEnrollment($studentId, $sectionC, $currentYearId, 'active');
}
$createEnrollment($studentC4, $sectionC, $currentYearId, 'withdrawn', '2026-06-01');

$studentD1 = $createStudent('CLS-D-001', 'Farid', 'Rahimi');
$studentD2 = $createStudent('CLS-D-002', 'Mina', 'Faizi');
$createEnrollment($studentD1, $sectionD, $currentYearId, 'active');
$createEnrollment($studentD2, $sectionD, $currentYearId, 'active');

$studentZ1 = $createStudent('CLS-Z-001', 'Jamal', 'Wardak');
$createEnrollment($studentZ1, $sectionZ, $pastYearId, 'active');

$adminId = (int) $scalar("SELECT id FROM users WHERE email = 'admin@meridian.academy'");
$recordAttendance = static function (int $studentId, int $sectionId, string $date, string $status, ?int $periodId = null) use ($insert, $adminId, $now): void {
    $insert('attendance_records', [
        'student_id' => $studentId,
        'section_id' => $sectionId,
        'date' => $date,
        'period_id' => $periodId,
        'status' => $status,
        'recorded_by' => $adminId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
};

// Daily records: present + late + absent => 2 of 3 credited.
$recordAttendance($studentC1, $sectionC, '2026-04-01', 'present');
$recordAttendance($studentC2, $sectionC, '2026-04-01', 'late');
$recordAttendance($studentC3, $sectionC, '2026-04-01', 'absent');
// Per-period records collapse to absent, late, excused => 1 of 3 credited.
$recordAttendance($studentC1, $sectionC, '2026-04-02', 'absent', $periodOne);
$recordAttendance($studentC1, $sectionC, '2026-04-02', 'present', $periodTwo);
$recordAttendance($studentC2, $sectionC, '2026-04-02', 'late', $periodOne);
$recordAttendance($studentC2, $sectionC, '2026-04-02', 'present', $periodTwo);
$recordAttendance($studentC3, $sectionC, '2026-04-02', 'excused', $periodOne);
$recordAttendance($studentC3, $sectionC, '2026-04-02', 'present', $periodTwo);
// Past-year Section: one present => 100%.
$recordAttendance($studentZ1, $sectionZ, '2020-04-01', 'present');

echo json_encode([
    'currentYearId' => $currentYearId,
    'currentYearLabel' => $currentYear['label'],
    'pastYearId' => $pastYearId,
    'emptyYearId' => $emptyYearId,
    'grade9Id' => $grade9,
    'grade12Id' => $grade12,
    'sectionC' => $sectionC,
    'sectionD' => $sectionD,
    'sectionZ' => $sectionZ,
    'sectionZCurrent' => $sectionZCurrent,
    'periodOne' => $periodOne,
    'teacherTwoEmail' => 'classes.teacher@meridian.academy',
    'teacherThreeEmail' => 'classes.other@meridian.academy',
    'teacherPassword' => 'Meridian@2026',
], JSON_UNESCAPED_UNICODE);
