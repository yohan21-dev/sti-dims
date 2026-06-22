<?php
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
$authUser = requireAuth();
requireRole($authUser, 'admin');

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

// ── GET all users ─────────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT id, username, email, full_name, role, avatar_url,
                is_active, created_at, last_login_at
         FROM users
         ORDER BY is_active DESC, created_at DESC"
    );
    respond(['success' => true, 'data' => $stmt->fetchAll()]);
}

// ── PATCH update user ─────────────────────────────────────────────────
if ($method === 'PATCH') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');

    // Prevent admin from deactivating/demoting themselves
    if ($id === (int)$authUser['sub']) {
        $d = body();
        if (isset($d['is_active']) && !$d['is_active']) {
            fail('You cannot deactivate your own account');
        }
        if (isset($d['role']) && $d['role'] !== 'admin') {
            fail('You cannot change your own role');
        }
    }

    $d = body();
    $allowed = ['full_name', 'email', 'role', 'is_active', 'avatar_url', 'department_id'];
    $fields = []; $vals = [];

    foreach ($allowed as $f) {
        if (array_key_exists($f, $d)) {
            $fields[] = "$f = ?";
            $vals[]   = $d[$f];
        }
    }

    // Handle password reset
    if (!empty($d['password'])) {
        if (strlen($d['password']) < 8) fail('Password must be at least 8 characters');
        $fields[] = 'password_hash = ?';
        $vals[]   = password_hash($d['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($fields)) fail('Nothing to update');

    $vals[] = $id;
    $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    auditLog($authUser['sub'], 'admin.user.update', 'users', $id, array_keys(array_filter($d)));
    respond(['success' => true]);
}

// ── DELETE user ───────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');
    if ($id === (int)$authUser['sub']) fail('You cannot delete your own account');

    // Revoke all refresh tokens first
    $pdo->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
    auditLog($authUser['sub'], 'admin.user.delete', 'users', $id);
    respond(['success' => true]);
}

fail('Method not allowed', 405);