<?php

declare(strict_types=1);

namespace Meridian\Api\Support;

use Meridian\Api\Core\Response;

final class Csv
{
    /**
     * @param list<string> $headers
     * @param iterable<array<int|string, mixed>> $rows
     */
    public static function response(array $headers, iterable $rows, string $filename): Response
    {
        $stream = fopen('php://temp', 'r+');
        fputcsv($stream, array_map([self::class, 'safe'], $headers));

        foreach ($rows as $row) {
            fputcsv($stream, array_map([self::class, 'safe'], array_values($row)));
        }

        rewind($stream);
        $body = stream_get_contents($stream);
        fclose($stream);

        return new Response(200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . addslashes($filename) . '"',
        ], $body === false ? '' : $body);
    }

    public static function safe(mixed $value): string
    {
        $text = (string) ($value ?? '');

        if ($text !== '' && str_contains("=+-@\t\r", $text[0])) {
            return "'" . $text;
        }

        return $text;
    }
}