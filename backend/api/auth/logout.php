<?php
require_once __DIR__ . '/../../config/bootstrap.php';
requireMethod('POST');

$isProd = env('APP_ENV') === 'production';

// Revoke refresh token if present
$refreshToken = $_COOKIE['refresh_token'] ?? null;
if ($refreshToken) {
    $hash = hash('sha256', $refreshToken);
    Database::dims()->prepare("DELETE FROM refresh_tokens WHERE token_hash = ?")->execute([$hash]);
}

// Clear cookies
foreach (['access_token', 'refresh_token'] as $name) {
    setcookie($name, '', [
        'expires'  => 1,
        'path'     => '/api',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => $isProd,
    ]);
}
setcookie('csrf_token', '', ['expires' => 1, 'path' => '/', 'samesite' => 'Lax', 'secure' => $isProd]);

respond(['success' => true]);