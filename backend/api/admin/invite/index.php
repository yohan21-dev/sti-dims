<?php
require_once __DIR__ . '/../../../config/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

// ── GET: validate a token (public — used by register page) ────────────
if ($method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if (!$token) fail('token required');

    $hash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        "SELECT role, expires_at, used_at FROM invite_tokens WHERE token_hash = ?"
    );
    $stmt->execute([$hash]);
    $row = $stmt->fetch();

    if (!$row)                       fail('Invalid invite link', 404);
    if ($row['used_at'])             fail('This invite has already been used', 410);
    if (strtotime($row['expires_at']) < time()) fail('This invite link has expired', 410);

    respond(['success' => true, 'role' => $row['role']]);
}

// ── POST ──────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $d = body();

    // If 'username' is present → this is a registration completion
    if (!empty($d['username'])) {
        $token = trim($d['token'] ?? '');
        if (!$token) fail('token required');

        $hash = hash('sha256', $token);
        $stmt = $pdo->prepare(
            "SELECT id, role, expires_at, used_at FROM invite_tokens WHERE token_hash = ?"
        );
        $stmt->execute([$hash]);
        $row = $stmt->fetch();

        if (!$row)                       fail('Invalid invite link', 404);
        if ($row['used_at'])             fail('This invite has already been used', 410);
        if (strtotime($row['expires_at']) < time()) fail('This invite link has expired', 410);

        // Validate inputs
        $username  = trim($d['username'] ?? '');
        $full_name = trim($d['full_name'] ?? '');
        $email     = trim($d['email'] ?? '');
        $password  = $d['password'] ?? '';

        if (!$username || !$full_name || !$email || !$password) fail('All fields are required');
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) fail('Username may only contain letters, numbers, and underscores');
        if (strlen($password) < 8) fail('Password must be at least 8 characters');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Invalid email address');

        // Check uniqueness
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $check->execute([$username, $email]);
        if ($check->fetch()) fail('Username or email already in use', 409);

        $pdo->prepare(
            "INSERT INTO users (username, email, full_name, role, password_hash, is_active)
             VALUES (?, ?, ?, ?, ?, 1)"
        )->execute([
            $username, $email, $full_name, $row['role'],
            password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
        ]);
        $userId = (int)$pdo->lastInsertId();

        // Mark invite as used
        $pdo->prepare("UPDATE invite_tokens SET used_at = NOW(), used_by = ? WHERE token_hash = ?")
            ->execute([$userId, $hash]);

        auditLog($userId, 'auth.register', 'users', $userId);
        respond(['success' => true, 'user_id' => $userId], 201);
    }

    // Otherwise: admin generating a new invite token
    require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
    $authUser = requireAuth();
    requireRole($authUser, 'admin');

    $role        = $d['role'] ?? 'officer';
    $allowedRoles = ['admin', 'officer', 'viewer'];
    if (!in_array($role, $allowedRoles, true)) fail('Invalid role');

    $expiresHrs = max(1, min(168, (int)($d['expires_hours'] ?? 48)));
    $raw        = bin2hex(random_bytes(32));
    $hashValue  = hash('sha256', $raw);

    $pdo->prepare(
        "INSERT INTO invite_tokens (token_hash, role, created_by, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))"
    )->execute([$hashValue, $role, $authUser['sub'], $expiresHrs]);

    auditLog($authUser['sub'], 'admin.invite.create', 'invite_tokens', null, ['role' => $role]);
    respond(['success' => true, 'token' => $raw]);
}

fail('Method not allowed', 405);