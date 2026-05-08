<?php

require_once __DIR__ . '/../../config/bootstrap.php';
requireMethod('POST');

// ── Rate limiting (simple in-memory via APCu or file-based) ──
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateKey = 'login_' . md5($ip);
$maxAttempts = (int) env('RATE_LIMIT_LOGIN', 10);

if (function_exists('apcu_fetch')) {
    $attempts = apcu_fetch($rateKey) ?: 0;
    if ($attempts >= $maxAttempts) {
        fail('Too many login attempts. Try again in 1 minute.', 429);
    }
}

$data = body();
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if (!$username || !$password) fail('Username and password are required');

$pdo  = Database::dims();
$stmt = $pdo->prepare("SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1");
$stmt->execute([$username, $username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    if (function_exists('apcu_store')) {
        apcu_store($rateKey, ($attempts ?? 0) + 1, 60);
    }
    fail('Invalid credentials', 401);
}

// Reset rate limit on success
if (function_exists('apcu_delete')) apcu_delete($rateKey);

// ── Update last login ──
$pdo->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?")->execute([$user['id']]);

// ── Issue tokens ──
$accessTTL  = (int) env('JWT_ACCESS_TTL',  900);
$refreshTTL = (int) env('JWT_REFRESH_TTL', 604800);
$isProd     = env('APP_ENV') === 'production';

$accessToken = JWT::generate([
    'sub'      => $user['id'],
    'username' => $user['username'],
    'role'     => $user['role'],
    'name'     => $user['full_name'],
], $accessTTL);

$refreshToken = bin2hex(random_bytes(40));
$refreshHash  = hash('sha256', $refreshToken);

// Store refresh token
$pdo->prepare(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))"
)->execute([$user['id'], $refreshHash, $refreshTTL]);

// ── Set HttpOnly cookies ──
$cookieBase = [
    'path'     => '/api',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => $isProd,
];

setcookie('access_token', $accessToken, array_merge($cookieBase, [
    'expires' => time() + $accessTTL,
]));

setcookie('refresh_token', $refreshToken, array_merge($cookieBase, [
    'expires' => time() + $refreshTTL,
    'path'    => '/api/auth/refresh',
]));

// ── CSRF token (readable by JS, not HttpOnly) ──
$csrfToken = bin2hex(random_bytes(32));
setcookie('csrf_token', $csrfToken, [
    'expires'  => time() + $accessTTL,
    'path'     => '/',
    'httponly' => false,
    'samesite' => 'Lax',
    'secure'   => $isProd,
]);

auditLog($user['id'], 'auth.login', 'users', $user['id']);

respond([
    'success' => true,
    'user'    => [
        'id'        => $user['id'],
        'username'  => $user['username'],
        'full_name' => $user['full_name'],
        'role'      => $user['role'],
        'email'     => $user['email'],
    ],
    'expires_in' => $accessTTL,
]);