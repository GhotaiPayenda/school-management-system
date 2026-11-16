<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use PDO;

final class SettingsController extends Controller
{
    public function __construct(PDO $db, private readonly array $config)
    {
        parent::__construct($db);
    }

    public function show(Request $request): Response
    {
        $settings = $this->fetchOne('SELECT * FROM school_settings WHERE id = 1');

        if ($settings === null) {
            throw HttpException::notFound('settings.notFound', 'School settings are not initialized.');
        }

        $settings['teachingDays'] = json_decode((string) $settings['teaching_days'], true) ?: [6, 0, 1, 2, 3, 4];
        $settings['perPeriodAttendance'] = (bool) $settings['per_period_attendance'];
        $settings['logoUrl'] = $settings['logo_path'] ? '/api/v1/settings/logo' : null;

        return Response::json($settings);
    }

    public function update(Request $request): Response
    {
        $before = $this->fetchOne('SELECT * FROM school_settings WHERE id = 1');
        $fields = [];
        $values = [];

        $textFields = [
            'name', 'address', 'phone', 'email', 'currency', 'timezone',
            'default_language', 'default_theme', 'date_calendar', 'principal_name', 'principal_title',
        ];

        foreach ($textFields as $field) {
            if ($request->input($field) !== null) {
                $values[$field] = trim((string) $request->input($field));
            }
        }

        if (isset($values['name']) && $values['name'] === '') {
            $fields['name'] = 'validation.required';
        }
        if (isset($values['currency']) && !preg_match('/^[A-Z]{3}$/', $values['currency'])) {
            $fields['currency'] = 'validation.invalid';
        }
        if (isset($values['timezone']) && !in_array($values['timezone'], timezone_identifiers_list(), true)) {
            $fields['timezone'] = 'validation.invalid';
        }
        if (isset($values['default_language']) && !in_array($values['default_language'], ['en', 'fa-AF', 'ps-AF'], true)) {
            $fields['default_language'] = 'validation.invalid';
        }
        if (isset($values['default_theme']) && !in_array($values['default_theme'], ['light', 'dark'], true)) {
            $fields['default_theme'] = 'validation.invalid';
        }
        if (isset($values['date_calendar']) && !in_array($values['date_calendar'], ['gregorian', 'solar_hijri'], true)) {
            $fields['date_calendar'] = 'validation.invalid';
        }

        if ($request->input('teaching_days') !== null) {
            $days = $request->input('teaching_days');
            if (!is_array($days) || $days === []) {
                $fields['teaching_days'] = 'validation.required';
            } else {
                $days = array_values(array_unique(array_map('intval', $days)));
                sort($days);
                if (array_diff($days, range(0, 6)) !== []) {
                    $fields['teaching_days'] = 'validation.invalid';
                }
                $values['teaching_days'] = json_encode($days);
            }
        }

        foreach (['invoice_due_day', 'student_loan_limit', 'student_loan_days', 'staff_loan_limit', 'staff_loan_days'] as $field) {
            if ($request->input($field) !== null) {
                $values[$field] = max(0, (int) $request->input($field));
            }
        }

        foreach (['fine_daily_rate', 'lost_processing_fee'] as $field) {
            if ($request->input($field) !== null) {
                $values[$field] = max(0, (float) $request->input($field));
            }
        }

        if ($request->input('per_period_attendance') !== null) {
            $values['per_period_attendance'] = $request->input('per_period_attendance') ? 1 : 0;
        }

        if ($fields !== []) {
            throw HttpException::validation($fields);
        }

        if ($request->input('logo_data') !== null) {
            $values['logo_path'] = $this->storeLogo((string) $request->input('logo_data'));
        }

        if ($request->input('remove_logo') === true) {
            $values['logo_path'] = null;
        }

        if ($values !== []) {
            $values['updated_at'] = $this->now();
            $this->updateRow('school_settings', 1, $values);
            $this->audit($request, 'settings', 'settings.update', 'school_settings', 1, $before, $values);
        }

        return $this->show($request);
    }

    public function logo(Request $request): Response
    {
        $settings = $this->fetchOne('SELECT logo_path FROM school_settings WHERE id = 1');
        $path = $settings['logo_path'] ?? null;

        if ($path === null || !is_file($path)) {
            throw HttpException::notFound('settings.logoNotFound', 'No school logo is configured.');
        }

        $mime = mime_content_type($path) ?: 'application/octet-stream';
        $body = file_get_contents($path);

        return new Response(200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ], $body === false ? '' : $body);
    }

    public function summary(Request $request): Response
    {
        $settings = $this->fetchOne(
            'SELECT name, logo_path, address, phone, email, currency, timezone, default_language, default_theme,
                    principal_name, principal_title
             FROM school_settings WHERE id = 1',
        );

        if ($settings === null) {
            $settings = [
                'name' => 'Meridian Academy',
                'logo_path' => null,
                'currency' => 'AFN',
                'timezone' => 'Asia/Kabul',
                'default_language' => 'en',
                'default_theme' => 'light',
            ];
        }

        // Printed documents reuse this summary for their identity header.
        $settings['logoUrl'] = $settings['logo_path'] ? '/api/v1/settings/logo' : null;

        return Response::json($settings);
    }

    private function storeLogo(string $data): string
    {
        if (!preg_match('/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+\/=\s]+)$/', $data, $matches)) {
            throw HttpException::validation(['logo_data' => 'validation.invalid']);
        }

        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]) ?? '', true);
        if ($binary === false || strlen($binary) > 2 * 1024 * 1024) {
            throw HttpException::validation(['logo_data' => 'validation.fileTooLarge']);
        }

        $extension = match ($matches[1]) {
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => 'gif',
        };

        $directory = $this->config['storage']['path'] . '/branding';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException('Unable to create branding storage directory.');
        }

        $path = $directory . '/logo.' . $extension;
        file_put_contents($path, $binary);

        return $path;
    }
}