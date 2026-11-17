<?php

declare(strict_types=1);

namespace Meridian\Api\Support;

use PDO;

/**
 * The read model shared by the Timetable screen and the Classes class record.
 * Keeping it in one place means both surfaces always render the same grid.
 */
final class TimetableGrid
{
    /**
     * @return array{periods: list<array<string, mixed>>, lessons: array<int, array<int, array<string, mixed>>>, teachingDays: list<int>}
     */
    public static function forSection(PDO $db, int $sectionId): array
    {
        $periods = self::rows(
            $db,
            'SELECT * FROM periods WHERE section_id = :id ORDER BY sort_order',
            ['id' => $sectionId],
        );

        $lessons = self::rows(
            $db,
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
            $grid[(int) $lesson['period_id']][(int) $lesson['day_of_week']] = $lesson;
        }

        return [
            'periods' => $periods,
            'lessons' => $grid,
            'teachingDays' => self::teachingDays($db),
        ];
    }

    /**
     * @return list<int>
     */
    public static function teachingDays(PDO $db): array
    {
        $statement = $db->prepare('SELECT teaching_days FROM school_settings WHERE id = 1');
        $statement->execute();
        $value = $statement->fetchColumn();
        $days = json_decode((string) ($value === false ? '[6,0,1,2,3,4]' : $value), true);

        return is_array($days) ? array_values(array_map('intval', $days)) : [6, 0, 1, 2, 3, 4];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    private static function rows(PDO $db, string $sql, array $params): array
    {
        $statement = $db->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }
}
