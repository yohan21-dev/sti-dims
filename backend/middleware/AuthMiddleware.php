<?php

require_once __DIR__ . '/../config/bootstrap.php';

function requireAuth(): array
{
    $token = $_COOKIE['access_token'] ?? null;
    if (!$token) fail('Unauthenticated', 401);

    try {
        $payload = JWT::verify($token);
    } catch (RuntimeException $e) {
        // Clear stale cookies
        setcookie('access_token', '', ['expires' => 1, 'path' => '/api', 'httponly' => true, 'samesite' => 'Lax', 'secure' => (env('APP_ENV') === 'production')]);
        fail($e->getMessage(), 401);
    }

    // Validate CSRF double-submit for state-changing methods
    $method = $_SERVER['REQUEST_METHOD'];
    if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        $csrfHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $csrfCookie = $_COOKIE['csrf_token'] ?? '';
        if (!$csrfHeader || !$csrfCookie || !hash_equals($csrfCookie, $csrfHeader)) {
            fail('CSRF token mismatch', 403);
        }
    }

    return $payload;
}

function requireRole(array $payload, string ...$roles): void
{
    if (!in_array($payload['role'] ?? '', $roles, true)) {
        fail('Forbidden', 403);
    }
}