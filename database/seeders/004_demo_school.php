<?php

declare(strict_types=1);

/**
 * Deterministic demonstration data for the single-tenant school.
 *
 * The academic year is anchored to the date the seeder first runs so the
 * dashboard, current invoices, and attendance always have live data.
 */
return static function (\PDO $pdo): void {
    $now = gmdate('Y-m-d\TH:i:s\Z');
    $today = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $startYear = (int) $today->format('Y');
    if ($today->format('Y-m-d') < $startYear . '-03-21') {
        $startYear--;
    }
    $yearStart = $startYear . '-03-21';
    $yearEnd = ($startYear + 1) . '-01-20';
    $semesterOneStart = $yearStart;
    $semesterOneEnd = $startYear . '-08-31';
    $semesterTwoStart = $startYear . '-09-01';
    $semesterTwoEnd = $yearEnd;
    $yearLabel = $startYear . '–' . ($startYear + 1);

    $insert = static function (string $table, array $data) use ($pdo): int {
        $columns = array_keys($data);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);
        $statement = $pdo->prepare(
            'INSERT INTO ' . $table . ' (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')',
        );
        $statement->execute($data);

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
    $roleId = static function (string $slug) use ($scalar): int {
        return (int) $scalar('SELECT id FROM roles WHERE slug = :slug', ['slug' => $slug]);
    };

    $adminId = (int) $scalar('SELECT id FROM users WHERE email = :email', ['email' => 'admin@meridian.academy']);
    if ($adminId === 0) {
        throw new RuntimeException('The Super Admin must exist before demo data can be seeded.');
    }

    $passwordHash = password_hash('Meridian@2026', PASSWORD_DEFAULT);
    $createUser = static function (string $name, string $email, string $roleSlug) use ($pdo, $insert, $roleId, $passwordHash, $now): int {
        $existing = (int) ($pdo->query('SELECT id FROM users WHERE email = ' . $pdo->quote($email))->fetchColumn() ?: 0);
        if ($existing > 0) {
            return $existing;
        }

        return $insert('users', [
            'name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash,
            'role_id' => $roleId($roleSlug),
            'status' => 'active',
            'must_change_password' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    };

    // Academic year and semesters.
    $yearId = $insert('academic_years', [
        'label' => $yearLabel,
        'start_date' => $yearStart,
        'end_date' => $yearEnd,
        'is_current' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $semesterOneId = $insert('semesters', [
        'academic_year_id' => $yearId,
        'number' => 1,
        'name' => 'Spring Semester',
        'start_date' => $semesterOneStart,
        'end_date' => $semesterOneEnd,
        'created_at' => $now,
    ]);
    $semesterTwoId = $insert('semesters', [
        'academic_year_id' => $yearId,
        'number' => 2,
        'name' => 'Autumn Semester',
        'start_date' => $semesterTwoStart,
        'end_date' => $semesterTwoEnd,
        'created_at' => $now,
    ]);

    // Grade levels with Dari and Pashto labels.
    $faDigits = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۱۰', '۱۱', '۱۲'];
    $gradeIds = [];
    for ($number = 1; $number <= 12; $number++) {
        $gradeIds[$number] = $insert('grade_levels', [
            'number' => $number,
            'name' => 'Grade ' . $number,
            'name_fa' => 'صنف ' . $faDigits[$number - 1],
            'name_ps' => 'صنف ' . $faDigits[$number - 1],
            'created_at' => $now,
        ]);
    }

    // Rooms and departments.
    $roomIds = [];
    for ($number = 1; $number <= 14; $number++) {
        $roomIds[] = $insert('rooms', [
            'name' => 'Room ' . str_pad((string) $number, 2, '0', STR_PAD_LEFT),
            'capacity' => $number <= 6 ? 36 : 30,
            'building' => $number <= 8 ? 'Main Building' : 'Annex',
            'status' => 'active',
            'created_at' => $now,
        ]);
    }

    $departmentIds = [];
    foreach ([
        'languages' => ['Languages', 'زبان‌ها', 'ژبې'],
        'mathematics' => ['Mathematics', 'ریاضی', 'ریاضی'],
        'sciences' => ['Sciences', 'علوم', 'علوم'],
        'social' => ['Social Studies', 'مطالعات اجتماعی', 'ټولنیزې زده‌کړې'],
        'islamic' => ['Islamic Studies', 'مطالعات اسلامی', 'اسلامي زده‌کړې'],
        'arts' => ['Arts & Physical Education', 'هنر و تربیت بدنی', 'هنر او ورزش'],
        'technology' => ['Technology', 'فناوری', 'ټکنالوژي'],
    ] as $key => [$name, $nameFa, $namePs]) {
        $departmentIds[$key] = $insert('departments', [
            'name' => $name,
            'name_fa' => $nameFa,
            'name_ps' => $namePs,
            'status' => 'active',
            'created_at' => $now,
        ]);
    }

    $subjectDefinitions = [
        ['MATH', 'Mathematics', 'ریاضی', 'ریاضی', 'mathematics', 5],
        ['DARI', 'Dari', 'دری', 'دري', 'languages', 5],
        ['PASHTO', 'Pashto', 'پشتو', 'پښتو', 'languages', 4],
        ['ENG', 'English', 'انگلیسی', 'انګلیسي', 'languages', 5],
        ['SCI', 'Science', 'علوم', 'علوم', 'sciences', 4],
        ['ISL', 'Islamic Studies', 'مطالعات اسلامی', 'اسلامي زده‌کړې', 'islamic', 3],
        ['SOC', 'Social Studies', 'مطالعات اجتماعی', 'ټولنیزې زده‌کړې', 'social', 3],
        ['ICT', 'Computer Science', 'علوم کمپیوټر', 'کمپیوټر ساینس', 'technology', 2],
        ['PE', 'Physical Education', 'تربیت بدنی', 'ورزش', 'arts', 2],
        ['ART', 'Art', 'هنر', 'هنر', 'arts', 2],
    ];
    $subjectIds = [];
    $subjectRows = [];
    foreach ($subjectDefinitions as [$code, $name, $nameFa, $namePs, $department, $periods]) {
        $id = $insert('subjects', [
            'code' => $code,
            'name' => $name,
            'name_fa' => $nameFa,
            'name_ps' => $namePs,
            'department_id' => $departmentIds[$department],
            'has_exam' => 1,
            'status' => 'active',
            'created_at' => $now,
        ]);
        $subjectIds[$code] = $id;
        $subjectRows[] = ['id' => $id, 'code' => $code, 'name' => $name, 'nameFa' => $nameFa, 'namePs' => $namePs, 'periods' => $periods];
    }

    // Staff: four operational leaders and ten teachers.
    $staffDefinitions = [
        ['Laila', 'Rahman', 'female', 'M.Ed. Educational Leadership', 'School Leadership', 0],
        ['Omid', 'Karimi', 'male', 'B.A. Public Administration', 'Registrar', 0],
        ['Farzana', 'Noori', 'female', 'B.Acc. Accounting', 'Finance', 0],
        ['Samiullah', 'Hashimi', 'male', 'M.LIS Library Science', 'Library', 0],
        ['Ahmad', 'Zaki', 'male', 'B.Sc. Mathematics', 'Mathematics', 1],
        ['Mariam', 'Safi', 'female', 'B.A. Dari Literature', 'Dari', 1],
        ['Nasir', 'Hotak', 'male', 'B.A. Pashto Literature', 'Pashto', 1],
        ['Sahar', 'Amini', 'female', 'B.A. English Language', 'English', 1],
        ['Bilal', 'Rahimi', 'male', 'B.Sc. Biology', 'Science', 1],
        ['Zahra', 'Faizi', 'female', 'B.A. Islamic Studies', 'Islamic Studies', 1],
        ['Yousuf', 'Stanikzai', 'male', 'B.A. History', 'Social Studies', 1],
        ['Rana', 'Sadat', 'female', 'B.Sc. Computer Science', 'Computer Science', 1],
        ['Hamid', 'Wardak', 'male', 'B.Sc. Sports Science', 'Physical Education', 1],
        ['Nilofar', 'Azizi', 'female', 'B.A. Fine Arts', 'Art', 1],
    ];
    $staffIds = [];
    foreach ($staffDefinitions as $index => [$first, $last, $gender, $qualification, $specialization, $isTeacher]) {
        $staffIds[] = $insert('staff', [
            'employee_number' => 'EMP-' . $startYear . '-' . str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
            'first_name' => $first,
            'last_name' => $last,
            'gender' => $gender,
            'date_of_birth' => ($startYear - 30 - ($index % 12)) . '-0' . (($index % 8) + 1) . '-1' . (($index % 8) + 1),
            'phone' => '+93 70 ' . str_pad((string) (1000000 + $index * 7919), 7, '0', STR_PAD_LEFT),
            'email' => strtolower($first . '.' . $last) . '@meridian.academy',
            'address' => 'Kabul, Afghanistan',
            'qualification' => $qualification,
            'specialization' => $specialization,
            'hire_date' => ($startYear - 4 + ($index % 4)) . '-08-15',
            'is_teacher' => $isTeacher,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    $teacherIds = array_slice($staffIds, 4);

    // Demo role accounts. They are separate from the test fixture accounts.
    $principalUserId = $createUser('Laila Rahman', 'principal.demo@meridian.academy', 'principal');
    $registrarUserId = $createUser('Omid Karimi', 'registrar.demo@meridian.academy', 'registrar');
    $accountantUserId = $createUser('Farzana Noori', 'accountant.demo@meridian.academy', 'accountant');
    $librarianUserId = $createUser('Samiullah Hashimi', 'librarian.demo@meridian.academy', 'librarian');
    $teacherUserId = $createUser('Ahmad Zaki', 'teacher.demo@meridian.academy', 'teacher');
    $pdo->prepare('UPDATE staff SET user_id = :user WHERE id = :staff')->execute(['user' => $principalUserId, 'staff' => $staffIds[0]]);
    $pdo->prepare('UPDATE staff SET user_id = :user WHERE id = :staff')->execute(['user' => $registrarUserId, 'staff' => $staffIds[1]]);
    $pdo->prepare('UPDATE staff SET user_id = :user WHERE id = :staff')->execute(['user' => $accountantUserId, 'staff' => $staffIds[2]]);
    $pdo->prepare('UPDATE staff SET user_id = :user WHERE id = :staff')->execute(['user' => $librarianUserId, 'staff' => $staffIds[3]]);
    $pdo->prepare('UPDATE staff SET user_id = :user WHERE id = :staff')->execute(['user' => $teacherUserId, 'staff' => $teacherIds[0]]);

    // Sections A and B for every grade.
    $sectionIds = [];
    foreach ($gradeIds as $gradeNumber => $gradeId) {
        for ($sectionIndex = 0; $sectionIndex < 2; $sectionIndex++) {
            $sectionName = $sectionIndex === 0 ? 'A' : 'B';
            $sectionIds[$gradeNumber][$sectionName] = $insert('sections', [
                'academic_year_id' => $yearId,
                'grade_level_id' => $gradeId,
                'name' => $sectionName,
                'capacity' => 30,
                'homeroom_teacher_id' => $teacherIds[($gradeNumber + $sectionIndex) % count($teacherIds)],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    // Curriculum for all grades.
    foreach ($gradeIds as $gradeId) {
        foreach ($subjectRows as $subject) {
            $insert('curriculum', [
                'academic_year_id' => $yearId,
                'grade_level_id' => $gradeId,
                'subject_id' => $subject['id'],
                'weekly_periods' => $subject['periods'],
                'is_elective' => 0,
                'created_at' => $now,
            ]);
        }
    }

    // Daily period grids for every section.
    $periodLayout = [
        [1, 'period', 'Period 1', '08:00', '08:45'],
        [2, 'period', 'Period 2', '08:50', '09:35'],
        [3, 'period', 'Period 3', '09:40', '10:25'],
        [4, 'break', 'Morning Break', '10:25', '10:50'],
        [5, 'period', 'Period 4', '10:50', '11:35'],
        [6, 'period', 'Period 5', '11:40', '12:25'],
        [7, 'period', 'Period 6', '12:30', '13:15'],
    ];
    $periodIds = [];
    foreach ($sectionIds as $gradeSections) {
        foreach ($gradeSections as $sectionId) {
            foreach ($periodLayout as [$sort, $kind, $label, $start, $end]) {
                $periodIds[$sectionId][] = $insert('periods', [
                    'section_id' => $sectionId,
                    'sort_order' => $sort,
                    'kind' => $kind,
                    'label' => $label,
                    'start_time' => $start,
                    'end_time' => $end,
                    'created_at' => $now,
                ]);
            }
        }
    }

    // Teaching assignments for every section/subject.
    $assignments = [];
    foreach ($sectionIds as $gradeSections) {
        foreach ($gradeSections as $sectionId) {
            foreach ($subjectRows as $index => $subject) {
                $assignmentId = $insert('teaching_assignments', [
                    'teacher_staff_id' => $teacherIds[$index % count($teacherIds)],
                    'subject_id' => $subject['id'],
                    'section_id' => $sectionId,
                    'academic_year_id' => $yearId,
                    'created_at' => $now,
                ]);
                $assignments[$sectionId][$subject['id']] = $assignmentId;
            }
        }
    }

    // A complete timetable for the first section so the grid is demonstrable.
    $firstSectionId = $sectionIds[1]['A'];
    $teachingPeriods = array_values(array_filter($periodIds[$firstSectionId], static function (int $periodId) use ($pdo): bool {
        $statement = $pdo->prepare('SELECT kind FROM periods WHERE id = :id');
        $statement->execute(['id' => $periodId]);

        return $statement->fetchColumn() === 'period';
    }));
    $teachingDays = [6, 0, 1, 2, 3, 4];
    foreach ($teachingDays as $dayIndex => $day) {
        foreach ($teachingPeriods as $periodIndex => $periodId) {
            $subject = $subjectRows[($dayIndex * count($teachingPeriods) + $periodIndex) % count($subjectRows)];
            $insert('lessons', [
                'section_id' => $firstSectionId,
                'period_id' => $periodId,
                'teaching_assignment_id' => $assignments[$firstSectionId][$subject['id']],
                'day_of_week' => $day,
                'room_id' => $roomIds[($dayIndex + $periodIndex) % count($roomIds)],
                'created_at' => $now,
            ]);
        }
    }

    // Holidays.
    $holidayDates = [];
    foreach ([
        [$startYear . '-03-21', 'Nowruz'],
        [$startYear . '-04-18', 'Eid al-Fitr Observance'],
        [$startYear . '-06-05', 'Eid al-Adha Observance'],
        [$startYear . '-08-19', 'Independence Day'],
    ] as [$date, $label]) {
        $insert('holidays', [
            'academic_year_id' => $yearId,
            'date' => $date,
            'label' => $label,
            'created_at' => $now,
        ]);
        $holidayDates[$date] = true;
    }

    // Students and their primary guardians.
    $firstNames = [
        'Aisha', 'Farid', 'Zahra', 'Omid', 'Maryam', 'Sami', 'Laila', 'Hamid', 'Sara', 'Yousuf',
        'Nadia', 'Ali', 'Roya', 'Bilal', 'Hina', 'Karim', 'Sahar', 'Jamal', 'Fatima', 'Nasir',
        'Shabnam', 'Aziz', 'Parwana', 'Wali', 'Nilofar', 'Rahim', 'Mina', 'Tariq', 'Sadaf', 'Rafiq',
    ];
    $lastNames = [
        'Ahmadi', 'Safi', 'Rahimi', 'Noori', 'Karimi', 'Hotak', 'Amini', 'Faizi', 'Sadat', 'Wardak',
        'Azizi', 'Stanikzai', 'Hashimi', 'Rahman', 'Yousufi', 'Sultani', 'Mansoori', 'Popal', 'Barakzai', 'Kakar',
        'Alizai', 'Gulzai', 'Shinwari', 'Niazi', 'Durrani', 'Lodhi', 'Achakzai', 'Zazai', 'Mangal', 'Paktiawal',
    ];
    $guardianFirstNames = ['Abdul', 'Shaima', 'Mohammad', 'Nargis', 'Rahim', 'Freshta', 'Sayed', 'Latifa', 'Javid', 'Marina'];
    $studentIds = [];
    $guardianIds = [];
    $studentCounter = 0;
    foreach ($sectionIds as $gradeNumber => $gradeSections) {
        foreach ($gradeSections as $sectionName => $sectionId) {
            for ($position = 1; $position <= 6; $position++) {
                $studentCounter++;
                $first = $firstNames[($studentCounter - 1) % count($firstNames)];
                $last = $lastNames[($studentCounter * 3) % count($lastNames)];
                $gender = $position % 2 === 0 ? 'male' : 'female';
                $birthYear = $startYear - (5 + (int) $gradeNumber);
                $studentId = $insert('students', [
                    'admission_number' => 'STU-' . $startYear . '-' . str_pad((string) $studentCounter, 4, '0', STR_PAD_LEFT),
                    'first_name' => $first,
                    'last_name' => $last,
                    'gender' => $gender,
                    'date_of_birth' => $birthYear . '-0' . (($position % 8) + 1) . '-1' . (($studentCounter % 8) + 1),
                    'phone' => '+93 78 ' . str_pad((string) (2000000 + $studentCounter * 101), 7, '0', STR_PAD_LEFT),
                    'address' => 'District ' . (($studentCounter % 10) + 1) . ', Kabul',
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $studentIds[] = $studentId;
                $guardianId = $insert('guardians', [
                    'first_name' => $guardianFirstNames[$studentCounter % count($guardianFirstNames)],
                    'last_name' => $last,
                    'phone' => '+93 79 ' . str_pad((string) (3000000 + $studentCounter * 137), 7, '0', STR_PAD_LEFT),
                    'email' => 'guardian' . $studentCounter . '@example.af',
                    'address' => 'District ' . (($studentCounter % 10) + 1) . ', Kabul',
                    'occupation' => $studentCounter % 3 === 0 ? 'Teacher' : ($studentCounter % 3 === 1 ? 'Trader' : 'Civil servant'),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $guardianIds[] = $guardianId;
                $insert('student_guardians', [
                    'student_id' => $studentId,
                    'guardian_id' => $guardianId,
                    'relationship' => $gender === 'male' ? 'father' : 'mother',
                    'is_primary' => 1,
                    'created_at' => $now,
                ]);
                $insert('enrollments', [
                    'student_id' => $studentId,
                    'section_id' => $sectionId,
                    'academic_year_id' => $yearId,
                    'status' => 'active',
                    'started_at' => $yearStart . 'T08:00:00Z',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    // Sibling links within each section, recorded both ways.
    foreach ($sectionIds as $gradeSections) {
        foreach ($gradeSections as $sectionId) {
            $sectionStudents = array_map(
                static fn (array $row): int => (int) $row['student_id'],
                $rows('SELECT student_id FROM enrollments WHERE section_id = :section AND status = \'active\' ORDER BY id LIMIT 2', ['section' => $sectionId]),
            );
            if (count($sectionStudents) === 2) {
                $insert('siblings', ['student_id' => $sectionStudents[0], 'sibling_id' => $sectionStudents[1], 'created_at' => $now]);
                $insert('siblings', ['student_id' => $sectionStudents[1], 'sibling_id' => $sectionStudents[0], 'created_at' => $now]);
            }
        }
    }

    // Portal demo accounts linked to the first student and first guardian.
    $studentUserId = $createUser('Aisha Ahmadi', 'student.demo@meridian.academy', 'student');
    $guardianUserId = $createUser('Abdul Ahmadi', 'guardian.demo@meridian.academy', 'guardian');
    $pdo->prepare('UPDATE students SET user_id = :user WHERE id = :student')->execute(['user' => $studentUserId, 'student' => $studentIds[0]]);
    $pdo->prepare('UPDATE guardians SET user_id = :user WHERE id = :guardian')->execute(['user' => $guardianUserId, 'guardian' => $guardianIds[0]]);

    // Daily attendance for the previous fourteen calendar days.
    $attendanceRecorder = $teacherUserId;
    $cursor = $today->setTime(0, 0, 0);
    for ($dayOffset = 0; $dayOffset < 14; $dayOffset++) {
        $date = $cursor->modify('-' . $dayOffset . ' days');
        $dateString = $date->format('Y-m-d');
        if ((int) $date->format('w') === 5 || isset($holidayDates[$dateString]) || $dateString < $yearStart || $dateString > $yearEnd) {
            continue;
        }
        foreach ($studentIds as $index => $studentId) {
            $enrollment = $rows('SELECT section_id FROM enrollments WHERE student_id = :student AND status = \'active\' LIMIT 1', ['student' => $studentId]);
            if ($enrollment === []) {
                continue;
            }
            $value = ($studentId * 13 + (int) $date->format('z')) % 100;
            $status = $value < 86 ? 'present' : ($value < 94 ? 'absent' : ($value < 98 ? 'late' : 'excused'));
            $insert('attendance_records', [
                'student_id' => $studentId,
                'section_id' => (int) $enrollment[0]['section_id'],
                'date' => $dateString,
                'period_id' => null,
                'status' => $status,
                'reason' => in_array($status, ['absent', 'excused'], true) ? 'Family circumstance' : null,
                'recorded_by' => $attendanceRecorder,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    // One First Exam (/40) and one Final Exam (/60) per Subject.
    $examIds = [];
    foreach ($subjectRows as $subject) {
        $examIds[$subject['id']]['first'] = $insert('exams', [
            'subject_id' => $subject['id'],
            'academic_year_id' => $yearId,
            'semester_id' => $semesterOneId,
            'type' => 'first',
            'max_score' => 40,
            'marking_deadline' => $semesterOneEnd,
            'created_at' => $now,
        ]);
        $examIds[$subject['id']]['final'] = $insert('exams', [
            'subject_id' => $subject['id'],
            'academic_year_id' => $yearId,
            'semester_id' => $semesterTwoId,
            'type' => 'final',
            'max_score' => 60,
            'marking_deadline' => $semesterTwoEnd,
            'created_at' => $now,
        ]);
    }

    // Schedules for the first section.
    foreach ($subjectRows as $index => $subject) {
        foreach (['first' => $semesterOneStart, 'final' => $semesterTwoStart] as $type => $semesterStart) {
            $date = (new DateTimeImmutable($semesterStart))->modify('+' . (40 + $index * 2) . ' days')->format('Y-m-d');
            $insert('exam_schedules', [
                'exam_id' => $examIds[$subject['id']][$type],
                'section_id' => $firstSectionId,
                'date' => $date,
                'start_time' => $type === 'first' ? '09:00' : '10:00',
                'duration_minutes' => 90,
                'room_id' => $roomIds[$index % count($roomIds)],
                'created_at' => $now,
            ]);
        }
    }

    // Published scores for every student, with a small retention cohort.
    $lowCohort = [];
    foreach ($studentIds as $studentIndex => $studentId) {
        $isLow = $studentId % 17 === 0;
        if ($isLow) {
            $lowCohort[$studentId] = true;
        }
        foreach ($subjectRows as $subjectIndex => $subject) {
            $firstScore = $isLow
                ? 5 + (($studentId + $subjectIndex) % 12)
                : 24 + (($studentId * 3 + $subjectIndex * 5) % 17);
            $finalScore = $isLow
                ? 10 + (($studentId + $subjectIndex * 2) % 15)
                : 38 + (($studentId * 7 + $subjectIndex * 3) % 23);
            $insert('exam_scores', [
                'exam_id' => $examIds[$subject['id']]['first'],
                'student_id' => $studentId,
                'score' => min(40, $firstScore),
                'is_absent' => 0,
                'is_draft' => 0,
                'published_at' => $now,
                'published_by' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $insert('exam_scores', [
                'exam_id' => $examIds[$subject['id']]['final'],
                'student_id' => $studentId,
                'score' => min(60, $finalScore),
                'is_absent' => 0,
                'is_draft' => 0,
                'published_at' => $now,
                'published_by' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            if ($isLow && $subjectIndex < 4) {
                $supplementaryScore = $subjectIndex % 2 === 0 ? 44 : 31;
                $insert('supplementary_exams', [
                    'student_id' => $studentId,
                    'subject_id' => $subject['id'],
                    'academic_year_id' => $yearId,
                    'score' => $supplementaryScore,
                    'capped_score' => min(40, $supplementaryScore),
                    'passed' => $supplementaryScore >= 40 ? 1 : 0,
                    'entered_by' => $adminId,
                    'created_at' => $now,
                ]);
            }
        }
    }

    // Report cards for the first two sections (published and draft examples).
    $letter = static function (float $score): string {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 40) return 'D';

        return 'F';
    };
    foreach ([1 => 'published', 2 => 'draft'] as $gradeNumber => $status) {
        $sectionId = $sectionIds[$gradeNumber]['A'];
        $sectionStudents = $rows(
            'SELECT st.id, st.admission_number, st.first_name, st.last_name, sec.name AS section_name, g.number AS grade_number,
                    g.name AS grade_name, e.id AS enrollment_id
             FROM enrollments e JOIN students st ON st.id = e.student_id JOIN sections sec ON sec.id = e.section_id
             JOIN grade_levels g ON g.id = sec.grade_level_id
             WHERE e.section_id = :section AND e.status = \'active\' ORDER BY st.last_name, st.first_name',
            ['section' => $sectionId],
        );
        $resultsByStudent = [];
        foreach ($sectionStudents as $student) {
            $subjects = [];
            $scores = [];
            foreach ($subjectRows as $subject) {
                $firstScore = (int) ($scalar(
                    'SELECT score FROM exam_scores WHERE exam_id = :exam AND student_id = :student',
                    ['exam' => $examIds[$subject['id']]['first'], 'student' => $student['id']],
                ) ?? 0);
                $finalScore = (int) ($scalar(
                    'SELECT score FROM exam_scores WHERE exam_id = :exam AND student_id = :student',
                    ['exam' => $examIds[$subject['id']]['final'], 'student' => $student['id']],
                ) ?? 0);
                $supplementary = $scalar(
                    'SELECT score FROM supplementary_exams WHERE student_id = :student AND subject_id = :subject AND academic_year_id = :year',
                    ['student' => $student['id'], 'subject' => $subject['id'], 'year' => $yearId],
                );
                $raw = $firstScore + $finalScore;
                $effective = $supplementary === null ? $raw : max($raw, min(40, (int) $supplementary));
                $subjects[] = [
                    'subjectId' => $subject['id'],
                    'code' => $subject['code'],
                    'name' => $subject['name'],
                    'nameFa' => $subject['nameFa'],
                    'namePs' => $subject['namePs'],
                    'firstExam' => ['score' => $firstScore, 'maxScore' => 40],
                    'finalExam' => ['score' => $finalScore, 'maxScore' => 60],
                    'rawScore' => $raw,
                    'supplementaryScore' => $supplementary === null ? null : (int) $supplementary,
                    'score' => $effective,
                    'letterGrade' => $letter((float) $effective),
                    'passed' => $effective >= 40,
                    'retention' => $raw < 40 && ($supplementary === null || (int) $supplementary < 40),
                ];
                $scores[] = $effective;
            }
            $average = round(array_sum($scores) / max(1, count($scores)), 1);
            $attendanceRows = $rows(
                'SELECT status, COUNT(*) AS total FROM attendance_records WHERE student_id = :student AND date BETWEEN :start AND :end GROUP BY status',
                ['student' => $student['id'], 'start' => $yearStart, 'end' => $yearEnd],
            );
            $attendance = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
            foreach ($attendanceRows as $row) {
                $attendance[$row['status']] = (int) $row['total'];
            }
            $attendanceTotal = array_sum($attendance);
            $resultsByStudent[(int) $student['id']] = [
                'student' => $student,
                'subjects' => $subjects,
                'average' => $average,
                'letter' => $letter($average),
                'attendance' => [
                    'counts' => $attendance,
                    'total' => $attendanceTotal,
                    'rate' => $attendanceTotal === 0 ? null : round((($attendance['present'] + $attendance['late']) / $attendanceTotal) * 100, 1),
                ],
            ];
        }
        uasort($resultsByStudent, static fn (array $a, array $b): int => $b['average'] <=> $a['average']);
        $rank = 1;
        foreach ($resultsByStudent as $studentId => $result) {
            $snapshot = [
                'school' => [
                    'name' => 'Meridian Academy',
                    'address' => 'Street 4, Taimani, Kabul, Afghanistan',
                    'phone' => '+93 20 000 0000',
                    'email' => 'office@meridian.academy',
                    'principalName' => 'Dr. Laila Rahman',
                    'principalTitle' => 'Principal',
                ],
                'student' => [
                    'id' => $studentId,
                    'admissionNumber' => $result['student']['admission_number'],
                    'firstName' => $result['student']['first_name'],
                    'lastName' => $result['student']['last_name'],
                ],
                'enrollment' => [
                    'section_id' => $sectionId,
                    'section_name' => $result['student']['section_name'],
                    'grade_number' => $result['student']['grade_number'],
                    'grade_name' => $result['student']['grade_name'],
                ],
                'academicYear' => ['id' => $yearId, 'label' => $yearLabel],
                'semester' => null,
                'type' => 'annual',
                'results' => ['subjects' => $result['subjects'], 'average' => $result['average'], 'letterGrade' => $result['letter'], 'retentionSubjects' => []],
                'average' => $result['average'],
                'letterGrade' => $result['letter'],
                'outcome' => $result['average'] >= 40 ? 'promoted' : 'retention',
                'rank' => $rank,
                'sectionSize' => count($resultsByStudent),
                'attendance' => $result['attendance'],
                'generatedAt' => $now,
            ];
            $insert('report_cards', [
                'student_id' => $studentId,
                'academic_year_id' => $yearId,
                'semester_id' => null,
                'type' => 'annual',
                'version' => 1,
                'status' => $status,
                'snapshot_json' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                'remark' => $rank === 1 ? 'Top of section.' : null,
                'principal_name' => $status === 'published' ? 'Dr. Laila Rahman' : null,
                'published_at' => $status === 'published' ? $now : null,
                'published_by' => $status === 'published' ? $adminId : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $rank++;
        }
    }

    // Fee structures by grade.
    $feeStructures = [];
    foreach ($gradeIds as $gradeNumber => $gradeId) {
        $structureId = $insert('fee_structures', [
            'academic_year_id' => $yearId,
            'grade_level_id' => $gradeId,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $feeStructures[$gradeId] = $structureId;
        $components = [
            ['monthly', 'Tuition', 'شهریه', 'د فیس', 4200 + $gradeNumber * 200, null],
            ['monthly', 'Transport', 'ترانسپورت', 'ترانسپورت', 700, null],
            ['one_time', 'Registration', 'ثبت‌نام', 'نوم لیکنه', 1500, null],
            ['one_time', 'Stationery', 'لوازم تحریر', 'قرطاسیه', 500, null],
            ['per_semester', 'Books — Semester 1', 'کتاب‌های سمستر ۱', 'د لومړي سمستر کتابونه', 1200, 1],
            ['per_semester', 'Books — Semester 2', 'کتاب‌های سمستر ۲', 'د دویم سمستر کتابونه', 1400, 2],
        ];
        foreach ($components as [$kind, $name, $nameFa, $namePs, $amount, $semesterNumber]) {
            $insert('fee_components', [
                'fee_structure_id' => $structureId,
                'kind' => $kind,
                'name' => $name,
                'name_fa' => $nameFa,
                'name_ps' => $namePs,
                'amount' => $amount,
                'semester_number' => $semesterNumber,
                'created_at' => $now,
            ]);
        }
    }

    // Invoices for the current and two preceding months.
    $periods = [];
    $periodCursor = $today->setDate((int) $today->format('Y'), (int) $today->format('n'), 1);
    for ($offset = 2; $offset >= 0; $offset--) {
        $periodDate = $periodCursor->modify('-' . $offset . ' months');
        $period = $periodDate->format('Y-m');
        if ($period . '-01' >= $yearStart && $period . '-01' <= $yearEnd) {
            $periods[] = $period;
        }
    }
    $invoiceCounters = [];
    $receiptCounter = 1;
    $semesterMonthByNumber = [
        1 => substr($semesterOneStart, 0, 7),
        2 => substr($semesterTwoStart, 0, 7),
    ];
    foreach ($studentIds as $studentIndex => $studentId) {
        $enrollment = $rows(
            'SELECT e.section_id, sec.grade_level_id FROM enrollments e JOIN sections sec ON sec.id = e.section_id
             WHERE e.student_id = :student AND e.status = \'active\' LIMIT 1',
            ['student' => $studentId],
        );
        if ($enrollment === []) {
            continue;
        }
        $gradeId = (int) $enrollment[0]['grade_level_id'];
        $components = $rows('SELECT * FROM fee_components WHERE fee_structure_id = :id ORDER BY id', ['id' => $feeStructures[$gradeId]]);
        foreach ($periods as $periodIndex => $period) {
            $items = [];
            $subtotal = 0.0;
            $periodSemester = null;
            $billingDate = $period . '-01';
            if ($billingDate >= $semesterOneStart && $billingDate <= $semesterOneEnd) {
                $periodSemester = 1;
            } elseif ($billingDate >= $semesterTwoStart && $billingDate <= $semesterTwoEnd) {
                $periodSemester = 2;
            }
            foreach ($components as $component) {
                if ($component['kind'] === 'per_semester') {
                    if ((int) $component['semester_number'] !== $periodSemester || $period !== $semesterMonthByNumber[(int) $component['semester_number']]) {
                        continue;
                    }
                }
                if ($component['kind'] === 'one_time' && $periodIndex !== 0) {
                    continue;
                }
                $items[] = $component;
                $subtotal += (float) $component['amount'];
            }
            if ($items === []) {
                continue;
            }
            $invoiceCounters[$period] = ($invoiceCounters[$period] ?? 0) + 1;
            $invoiceNumber = 'INV-' . str_replace('-', '', $period) . '-' . str_pad((string) $invoiceCounters[$period], 4, '0', STR_PAD_LEFT);
            $discountTotal = 0.0;
            $isScholarship = $studentIndex % 13 === 0 && $periodIndex === count($periods) - 1;
            if ($isScholarship) {
                $discountTotal = round($subtotal * 0.5, 2);
            }
            $total = max(0, round($subtotal - $discountTotal, 2));
            $statusPattern = $studentIndex % 5;
            $isCurrent = $periodIndex === count($periods) - 1;
            $paid = 0.0;
            $status = 'issued';
            if (!$isCurrent) {
                if ($studentIndex % 7 === 0) {
                    $status = 'issued';
                } else {
                    $paid = $total;
                    $status = 'paid';
                }
            } else {
                if ($statusPattern === 0 || $statusPattern === 3) {
                    $paid = $total;
                    $status = 'paid';
                } elseif ($statusPattern === 1) {
                    $paid = round($total * 0.5, 2);
                    $status = 'partially_paid';
                }
            }
            $dueDate = $period . '-05';
            $invoiceId = $insert('invoices', [
                'student_id' => $studentId,
                'academic_year_id' => $yearId,
                'billing_period' => $period,
                'invoice_number' => $invoiceNumber,
                'status' => $status,
                'issue_date' => $period . '-01T09:00:00Z',
                'due_date' => $dueDate,
                'subtotal' => round($subtotal, 2),
                'discount_total' => $discountTotal,
                'total' => $total,
                'paid_total' => $paid,
                'balance' => round($total - $paid, 2),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            foreach ($items as $item) {
                $insert('invoice_items', [
                    'invoice_id' => $invoiceId,
                    'kind' => $item['kind'],
                    'description' => $item['name'],
                    'description_fa' => $item['name_fa'],
                    'description_ps' => $item['name_ps'],
                    'amount' => (float) $item['amount'],
                    'quantity' => 1,
                    'metadata' => $item['kind'] === 'per_semester' ? (string) $item['semester_number'] : null,
                ]);
            }
            if ($discountTotal > 0) {
                $insert('discounts', [
                    'invoice_id' => $invoiceId,
                    'student_id' => $studentId,
                    'type' => 'percentage',
                    'reason' => 'scholarship',
                    'value' => 50,
                    'amount' => $discountTotal,
                    'note' => 'Merit scholarship',
                    'created_by' => $adminId,
                    'created_at' => $now,
                ]);
            }
            if ($paid > 0) {
                $insert('payments', [
                    'invoice_id' => $invoiceId,
                    'student_id' => $studentId,
                    'amount' => $paid,
                    'method' => ['cash', 'bank_transfer', 'mobile_money'][$studentIndex % 3],
                    'paid_at' => $period . '-0' . (($studentIndex % 7) + 1) . 'T11:30:00Z',
                    'receipt_number' => 'RCPT-' . str_replace('-', '', $period) . '-' . str_pad((string) $receiptCounter, 4, '0', STR_PAD_LEFT),
                    'idempotency_key' => 'demo-invoice-' . $invoiceId,
                    'recorded_by' => $accountantUserId,
                    'created_at' => $now,
                ]);
                $receiptCounter++;
            }
        }
    }

    // Library catalog, copies, and loans.
    $titleDefinitions = [
        ['The Kite Runner', 'Khaled Hosseini', 'Fiction', 'Riverhead Books'],
        ['A Thousand Splendid Suns', 'Khaled Hosseini', 'Fiction', 'Riverhead Books'],
        ['Afghanistan: A Cultural History', 'Willem Vogelsang', 'History', 'Interlink Books'],
        ['The Bookseller of Kabul', 'Åsne Seierstad', 'Biography', 'Little, Brown'],
        ['Algebra Foundations', 'R. K. Sharma', 'Mathematics', 'Meridian Press'],
        ['Physics for Secondary Schools', 'Nadia Amiri', 'Science', 'Kabul Academic'],
        ['Dari Grammar in Practice', 'Mariam Safi', 'Language', 'Meridian Press'],
        ['Pashto Prose and Poetry', 'Nasir Hotak', 'Literature', 'Kabul Academic'],
        ['World History for Young Readers', 'Yousuf Stanikzai', 'History', 'Meridian Press'],
        ['Computer Skills for Everyone', 'Rana Sadat', 'Technology', 'Kabul Academic'],
        ['Islamic Ethics', 'Zahra Faizi', 'Religion', 'Meridian Press'],
        ['Art and Imagination', 'Nilofar Azizi', 'Arts', 'Kabul Academic'],
    ];
    $copyIds = [];
    $accession = 1;
    foreach ($titleDefinitions as [$title, $author, $category, $publisher]) {
        $titleId = $insert('library_titles', [
            'title' => $title,
            'author' => $author,
            'isbn' => '978-9936-' . str_pad((string) $accession, 4, '0', STR_PAD_LEFT),
            'category' => $category,
            'publisher' => $publisher,
            'description' => 'Demonstration catalog title for ' . $category . '.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        for ($copy = 0; $copy < 2; $copy++) {
            $copyIds[] = $insert('library_copies', [
                'title_id' => $titleId,
                'accession_number' => 'LIB-' . str_pad((string) $accession, 4, '0', STR_PAD_LEFT),
                'barcode' => 'LIB-' . str_pad((string) $accession, 4, '0', STR_PAD_LEFT),
                'status' => 'available',
                'replacement_cost' => 800 + ($titleId % 5) * 150,
                'condition_note' => 'Good condition',
                'created_at' => $now,
            ]);
            $accession++;
        }
    }
    foreach (array_slice($studentIds, 0, 18) as $index => $studentId) {
        $copyId = $copyIds[$index];
        $issuedAt = $today->modify('-' . (18 + $index * 2) . ' days')->format('Y-m-d\TH:i:s\Z');
        $dueAt = $today->modify('-' . (4 + $index * 2) . ' days')->format('Y-m-d\TH:i:s\Z');
        $isReturned = $index % 2 === 0;
        $returnedAt = $isReturned ? $today->modify('-' . ($index % 3) . ' days')->format('Y-m-d\TH:i:s\Z') : null;
        $loanStatus = $isReturned ? 'returned' : 'open';
        $loanId = $insert('loans', [
            'copy_id' => $copyId,
            'borrower_type' => 'student',
            'borrower_id' => $studentId,
            'issued_at' => $issuedAt,
            'due_at' => $dueAt,
            'returned_at' => $returnedAt,
            'renewal_count' => 0,
            'status' => $loanStatus,
            'issued_by' => $librarianUserId,
            'created_at' => $now,
        ]);
        if ($isReturned) {
            $pdo->prepare('UPDATE library_copies SET status = \'available\' WHERE id = :id')->execute(['id' => $copyId]);
            if ($index % 4 === 0) {
                $insert('fines', [
                    'loan_id' => $loanId,
                    'amount' => 25.0,
                    'reason' => 'late',
                    'settled' => 0,
                    'created_at' => $now,
                ]);
            }
        } else {
            $pdo->prepare('UPDATE library_copies SET status = \'on_loan\' WHERE id = :id')->execute(['id' => $copyId]);
        }
    }

    // Announcements across audiences.
    $announcementIds = [];
    $announcementIds[] = $insert('announcements', [
        'title' => 'Welcome to the ' . $yearLabel . ' academic year',
        'body' => 'Classes begin on ' . $yearStart . '. Please review the timetable and bring stationery on the first day.',
        'target_type' => 'all',
        'target_value' => null,
        'status' => 'published',
        'published_at' => $yearStart . 'T06:00:00Z',
        'created_by' => $adminId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $announcementIds[] = $insert('announcements', [
        'title' => 'Score entry window is open',
        'body' => 'Teachers can enter First Exam scores until the end of the month. Publish only after moderation.',
        'target_type' => 'role',
        'target_value' => 'teacher',
        'status' => 'published',
        'published_at' => $now,
        'created_by' => $adminId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $announcementIds[] = $insert('announcements', [
        'title' => 'Grade 10 science fair',
        'body' => 'The Grade 10 science fair will be held in the main hall. Families are welcome.',
        'target_type' => 'grade',
        'target_value' => '10',
        'status' => 'published',
        'published_at' => $now,
        'created_by' => $adminId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $announcementIds[] = $insert('announcements', [
        'title' => 'Grade 1A family meeting',
        'body' => 'A short family meeting follows the morning assembly on Thursday.',
        'target_type' => 'section',
        'target_value' => (string) $firstSectionId,
        'status' => 'published',
        'published_at' => $now,
        'created_by' => $adminId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $insert('announcements', [
        'title' => 'Winter break planning',
        'body' => 'Draft note for the leadership team. Not yet published.',
        'target_type' => 'role',
        'target_value' => 'principal',
        'status' => 'draft',
        'published_at' => null,
        'created_by' => $adminId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    foreach ([$studentUserId, $guardianUserId, $teacherUserId] as $userId) {
        $insert('announcement_reads', [
            'announcement_id' => $announcementIds[0],
            'user_id' => $userId,
            'read_at' => $now,
        ]);
    }

    // A small admissions pipeline.
    foreach ([
        ['Sahar', 'Noori', 1, 'applicant'],
        ['Ramin', 'Safi', 7, 'applicant'],
        ['Huma', 'Rahimi', 10, 'applicant'],
        ['Jawad', 'Hotak', 4, 'rejected'],
        ['Marwa', 'Amini', 6, 'applicant'],
        ['Elias', 'Faizi', 9, 'withdrawn'],
    ] as $index => [$first, $last, $grade, $status]) {
        $insert('applicants', [
            'first_name' => $first,
            'last_name' => $last,
            'date_of_birth' => ($startYear - 6 - $grade) . '-05-1' . (($index % 8) + 1),
            'gender' => $index % 2 === 0 ? 'female' : 'male',
            'guardian_name' => 'Guardian ' . $last,
            'phone' => '+93 77 ' . str_pad((string) (4000000 + $index * 313), 7, '0', STR_PAD_LEFT),
            'desired_grade_level_id' => $gradeIds[$grade],
            'status' => $status,
            'notes' => 'Demo admissions record.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    // Recent audit activity.
    foreach ([
        ['student.create', 'people', 'student', 'Created a new student record.'],
        ['invoice.generate', 'finance', 'academic_year', 'Generated monthly invoices.'],
        ['payment.create', 'finance', 'payment', 'Recorded a fee payment.'],
        ['scores.publish', 'exams', 'exam', 'Published First Exam scores.'],
        ['report_card.publish', 'exams', 'report_card', 'Published annual report cards.'],
        ['loan.issue', 'library', 'loan', 'Issued a library copy.'],
        ['announcement.publish', 'announcements', 'announcement', 'Published an announcement.'],
    ] as $index => [$action, $module, $entityType, $reason]) {
        $insert('audit_entries', [
            'actor_user_id' => $adminId,
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => (string) ($index + 1),
            'reason' => $reason,
            'before_json' => null,
            'after_json' => json_encode(['demo' => true]),
            'ip' => '127.0.0.1',
            'user_agent' => 'Demo seeder',
            'created_at' => $now,
        ]);
    }
};