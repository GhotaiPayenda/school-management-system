<?php

declare(strict_types=1);

return static function (\PDO $pdo): void {
    $now = gmdate('Y-m-d\TH:i:s\Z');

    $permissions = [
        'dashboard.view' => ['View dashboard', 'See the role-aware dashboard.'],
        'roles.manage' => ['Manage roles', 'Read and change Roles and their Permissions.'],
        'users.manage' => ['Manage users', 'Create, reset, and deactivate User accounts.'],
        'settings.manage' => ['Manage school settings', 'Change school identity, locale, calendar, and policy defaults.'],
        'audit.view' => ['View audit history', 'Read Audit Entries.'],
        'operations.manage' => ['Manage operations', 'Create and restore backups and inspect system health.'],
        'academic.manage' => ['Manage academic structure', 'Manage Academic Years, Grade Levels, Sections, Subjects, and timetables.'],
        'students.manage' => ['Manage students', 'Create and update Student and Guardian records.'],
        'students.view' => ['View students', 'Read Student records and profiles.'],
        'staff.manage' => ['Manage staff', 'Create and update Staff records.'],
        'staff.view' => ['View staff', 'Read Staff records.'],
        'admissions.manage' => ['Manage admissions', 'Process Applicants, Admissions, and Enrollments.'],
        'attendance.manage' => ['Manage attendance', 'Record and correct Attendance Records.'],
        'attendance.view' => ['View attendance', 'Read attendance summaries and history.'],
        'exams.manage' => ['Manage exams and scores', 'Manage Exams, Exam Schedules, and Exam Scores.'],
        'exams.view' => ['View exams and results', 'Read Exam Schedules, scores, and Report Cards.'],
        'finance.manage' => ['Manage finance', 'Manage Fee Structures, Invoices, Payments, and Receipts.'],
        'finance.view' => ['View finance', 'Read Invoices, Payments, and balances.'],
        'library.manage' => ['Manage library', 'Manage Titles, Copies, Loans, and Fines.'],
        'library.view' => ['View library', 'Read the catalog and Loan history.'],
        'announcements.manage' => ['Manage announcements', 'Create, target, publish, and archive Announcements.'],
        'announcements.view' => ['View announcements', 'Read Announcements targeted to the user.'],
        'portal.student' => ['Use student portal', 'Read the signed-in Student\'s timetable, attendance, and results.'],
        'portal.guardian' => ['Use guardian portal', 'Read linked children\'s attendance, results, and fees.'],
    ];

    $permissionStatement = $pdo->prepare(
        'INSERT INTO permissions (slug, name, description, created_at)
         VALUES (:slug, :name, :description, :created_at)
         ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description',
    );

    foreach ($permissions as $slug => [$name, $description]) {
        $permissionStatement->execute([
            'slug' => $slug,
            'name' => $name,
            'description' => $description,
            'created_at' => $now,
        ]);
    }

    $roles = [
        'super-admin' => ['Super Admin', 'Unrestricted school-wide access.'],
        'principal' => ['Principal', 'Whole-school oversight with audited write access.'],
        'registrar' => ['Registrar', 'Academic setup, people records, admissions, and enrollment.'],
        'teacher' => ['Teacher', 'Assigned Sections, attendance, and exam score entry.'],
        'accountant' => ['Accountant', 'Fee structures, invoices, payments, and arrears.'],
        'librarian' => ['Librarian', 'Catalog, copies, loans, and fines.'],
        'student' => ['Student', 'Read-only student portal.'],
        'guardian' => ['Guardian', 'Read-only portal for linked children.'],
    ];

    $roleStatement = $pdo->prepare(
        'INSERT INTO roles (slug, name, description, created_at)
         VALUES (:slug, :name, :description, :created_at)
         ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description',
    );

    foreach ($roles as $slug => [$name, $description]) {
        $roleStatement->execute([
            'slug' => $slug,
            'name' => $name,
            'description' => $description,
            'created_at' => $now,
        ]);
    }

    $roleIds = $pdo->query('SELECT slug, id FROM roles')->fetchAll(\PDO::FETCH_KEY_PAIR);
    $permissionIds = $pdo->query('SELECT slug, id FROM permissions')->fetchAll(\PDO::FETCH_KEY_PAIR);

    $matrix = [
        'super-admin' => array_keys($permissions),
        'principal' => [
            'dashboard.view', 'audit.view', 'students.view', 'staff.view', 'attendance.view',
            'exams.view', 'finance.view', 'library.view', 'announcements.manage', 'announcements.view',
            'settings.manage',
        ],
        'registrar' => [
            'dashboard.view', 'academic.manage', 'students.manage', 'students.view', 'staff.manage',
            'staff.view', 'admissions.manage', 'attendance.view', 'exams.view', 'announcements.view',
        ],
        'teacher' => [
            'dashboard.view', 'attendance.manage', 'attendance.view', 'exams.manage', 'exams.view',
            'students.view', 'announcements.view',
        ],
        'accountant' => [
            'dashboard.view', 'finance.manage', 'finance.view', 'students.view', 'announcements.view',
        ],
        'librarian' => [
            'dashboard.view', 'library.manage', 'library.view', 'students.view', 'staff.view',
            'announcements.view',
        ],
        'student' => [
            'dashboard.view', 'portal.student', 'announcements.view', 'attendance.view', 'exams.view',
            'library.view',
        ],
        'guardian' => [
            'dashboard.view', 'portal.guardian', 'announcements.view', 'attendance.view', 'exams.view',
            'finance.view',
        ],
    ];

    $pdo->exec('DELETE FROM role_permissions');

    $linkStatement = $pdo->prepare(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)',
    );

    foreach ($matrix as $roleSlug => $permissionSlugs) {
        foreach ($permissionSlugs as $permissionSlug) {
            $linkStatement->execute([
                'role_id' => $roleIds[$roleSlug],
                'permission_id' => $permissionIds[$permissionSlug],
            ]);
        }
    }
};
