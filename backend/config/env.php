<?php
// Minimal .env loader — no external dependencies needed

function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        throw new RuntimeException(".env file not found at: $path");
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        // Strip inline comments
        $value = trim(explode('#', $value, 2)[0]);
        // Strip surrounding quotes
        $value = trim($value, '"\'');

        if (!isset($_ENV[$key])) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

function env(string $key, mixed $default = null): mixed
{
    $value = $_ENV[$key] ?? getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}