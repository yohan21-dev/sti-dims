<?php

require_once __DIR__ . '/../../config/bootstrap.php';
requireMethod('GET', 'POST');

$pdo = Database::dims();

// ── GET: validate token so the frontend can show the form early ───────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $raw  = trim($_GET['token'] ?? '');
    if (!$raw) fail('token required');

    $row = _fetchToken($pdo, $raw);

    if (!$row) {
        fail('This reset link is invalid or has expired.', 410);
    }

    // Return a masked email hint (e.g. j***@sti-cubao.edu.ph) so the
    // user knows which account they are resetting without leaking the address.
    $email = $row['email'];
    [$local, $domain] = explode('@', $email, 2);
    $hint  = substr($local, 0, 1) . str_repeat('*', max(2, strlen($local) - 1)) . '@' . $domain;

    respond(['success' => true, 'email_hint' => $hint]);
}

// ── POST: consume token and change the password ───────────────────────
$d        = body();
$raw      = trim($d['token']    ?? '');
$password = $d['password'] ?? '';

if (!$raw)         fail('token required');
if (!$password)    fail('password required');
if (strlen($password) < 8) fail('Password must be at least 8 characters');

$row = _fetchToken($pdo, $raw);

if (!$row) {
    fail('This reset link is invalid or has expired.', 410);
}

// Update password
$pdo->prepare(
    "UPDATE users SET password_hash = ? WHERE id = ?"
)->execute([
    password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
    $row['user_id'],
]);

// Invalidate ALL sessions (revoke refresh tokens) to force re-login everywhere
$pdo->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$row['user_id']]);

// Mark token as used
$pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE id = ?")->execute([$row['id']]);

auditLog($row['user_id'], 'auth.password_reset', 'users', $row['user_id']);

respond(['success' => true]);

// ── Shared helper ─────────────────────────────────────────────────────
function _fetchToken(PDO $pdo, string $raw): array|false
{
    $hash = hash('sha256', $raw);

    $stmt = $pdo->prepare(
        "SELECT pr.id, pr.user_id, u.email, u.is_active
         FROM password_resets pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.token_hash = ?
           AND pr.used_at IS NULL
           AND pr.expires_at > NOW()
         LIMIT 1"
    );
    $stmt->execute([$hash]);
    $row = $stmt->fetch();

    // Also reject if the linked account has been deactivated
    if (!$row || !$row['is_active']) return false;

    return $row;
}