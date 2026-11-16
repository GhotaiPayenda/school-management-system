<?php

declare(strict_types=1);

return static function (\PDO $pdo): void {
    $now = gmdate('Y-m-d\TH:i:s\Z');

    $statement = $pdo->prepare(
        'INSERT INTO school_settings
            (id, name, address, phone, email, currency, timezone, default_language, default_theme, teaching_days,
             date_calendar, principal_name, principal_title, invoice_due_day, fine_daily_rate, lost_processing_fee,
             student_loan_limit, student_loan_days, staff_loan_limit, staff_loan_days, per_period_attendance, updated_at)
         VALUES
            (1, :name, :address, :phone, :email, :currency, :timezone, :language, :theme, :teaching_days,
             :calendar, :principal, :principal_title, :due_day, :fine_rate, :lost_fee,
             :student_limit, :student_days, :staff_limit, :staff_days, 0, :updated_at)
         ON CONFLICT(id) DO NOTHING',
    );

    $statement->execute([
        'name' => 'Meridian Academy',
        'address' => 'Street 4, Taimani, Kabul, Afghanistan',
        'phone' => '+93 20 000 0000',
        'email' => 'office@meridian.academy',
        'currency' => 'AFN',
        'timezone' => 'Asia/Kabul',
        'language' => 'en',
        'theme' => 'light',
        'teaching_days' => '[6,0,1,2,3,4]',
        'calendar' => 'gregorian',
        'principal' => 'Dr. Laila Rahman',
        'principal_title' => 'Principal',
        'due_day' => 5,
        'fine_rate' => 5,
        'lost_fee' => 100,
        'student_limit' => 2,
        'student_days' => 14,
        'staff_limit' => 5,
        'staff_days' => 30,
        'updated_at' => $now,
    ]);
};