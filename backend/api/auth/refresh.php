<?php
require_once __DIR__ . '/../../config/bootstrap.php';
requireMethod('POST');

$refreshToken = $_COOKIE['refresh_token'] ?? null;
if (!$refreshToken) fail('No refresh token', 401);

$hash = hash('sha256', $refreshToken);
$pdo  = Database::dims();

$stmt = $pdo->prepare(
    "SELECT rt.*, u.username, u.role, u.full_name, u.email, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.expires_at > NOW()"
);
$stmt->execute([$hash]);
$row = $stmt->fetch();

if (!$row || !$row['is_active']) {
    fail('Invalid or expired refresh token', 401);
}

// Rotate: delete old token, issue new pair
$pdo->prepare("DELETE FROM refresh_tokens WHERE token_hash = ?")->execute([$hash]);

$accessTTL  = (int) env('JWT_ACCESS_TTL',  900);
$refreshTTL = (int) env('JWT_REFRESH_TTL', 604800);
$isProd     = env('APP_ENV') === 'production';

$accessToken = JWT::generate([
    'sub'      => $row['user_id'],
    'username' => $row['username'],
    'role'     => $row['role'],
    'name'     => $row['full_name'],
], $accessTTL);

$newRefresh = bin2hex(random_bytes(40));
$newHash    = hash('sha256', $newRefresh);

$pdo->prepare(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))"
)->execute([$row['user_id'], $newHash, $refreshTTL]);

$cookieBase = ['path' => '/api', 'httponly' => true, 'samesite' => 'Lax', 'secure' => $isProd];
setcookie('access_token', $accessToken, array_merge($cookieBase, ['expires' => time() + $accessTTL]));
setcookie('refresh_token', $newRefresh,  array_merge($cookieBase, ['expires' => time() + $refreshTTL, 'path' => '/api/auth/refresh']));

$csrfToken = bin2hex(random_bytes(32));
setcookie('csrf_token', $csrfToken, ['expires' => time() + $accessTTL, 'path' => '/', 'httponly' => false, 'samesite' => 'Lax', 'secure' => $isProd]);

respond(['success' => true, 'expires_in' => $accessTTL]);