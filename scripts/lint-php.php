<?php

declare(strict_types=1);

/**
 * Runs `php -l` over every PHP file in the repository.
 */

$root = dirname(__DIR__);
$targets = ['api', 'database', 'scripts', 'tests'];
$files = [];

foreach ($targets as $target) {
    $directory = $root . DIRECTORY_SEPARATOR . $target;

    if (!is_dir($directory)) {
        continue;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
    );

    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'php') {
            $files[] = $file->getPathname();
        }
    }
}

sort($files, SORT_STRING);

$failures = 0;

foreach ($files as $file) {
    $output = [];
    $exitCode = 0;
    exec(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($file) . ' 2>&1', $output, $exitCode);

    if ($exitCode !== 0) {
        $failures++;
        fwrite(STDERR, implode("\n", $output) . "\n");
    }
}

$count = count($files);

if ($failures > 0) {
    fwrite(STDERR, "PHP lint failed for {$failures} of {$count} files.\n");
    exit(1);
}

echo "PHP lint passed for {$count} files.\n";
