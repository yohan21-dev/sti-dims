<?php
// Public-ish: any authenticated user can list departments (needed for dropdowns)
// Only admins can create / update / delete
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

// ── GET (any authenticated user) ─────────────────────────────────────
if ($method === 'GET') {
    // Single department
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            "SELECT d.*, u.full_name AS head_name, u.username AS head_username
             FROM departments d
             LEFT JOIN users u ON u.id = d.head_user_id
             WHERE d.id = ?"
        );
        $stmt->execute([(int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) fail('Department not found', 404);
        respond(['success' => true, 'data' => $row]);
    }

    // List — active only by default, pass ?all=1 for admin views
    $onlyActive = empty($_GET['all']) || $authUser['role'] !== 'admin';
    $sql = "SELECT d.id, d.name, d.code, d.description, d.location,
                   d.head_user_id, d.is_active,
                   u.full_name AS head_name
            FROM departments d
            LEFT JOIN users u ON u.id = d.head_user_id"
         . ($onlyActive ? " WHERE d.is_active = 1" : "")
         . " ORDER BY d.name ASC";
    $rows = $pdo->query($sql)->fetchAll();
    respond(['success' => true, 'data' => $rows]);
}

// ── POST (admin only) ─────────────────────────────────────────────────
if ($method === 'POST') {
    requireRole($authUser, 'admin');
    $d = body();
    if (empty($d['name'])) fail('name is required');
    if (empty($d['code'])) fail('code is required');

    $stmt = $pdo->prepare(
        "INSERT INTO departments (name, code, description, location, head_user_id)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        trim($d['name']),
        strtoupper(trim($d['code'])),
        $d['description'] ?? null,
        $d['location']    ?? null,
        !empty($d['head_user_id']) ? (int)$d['head_user_id'] : null,
    ]);
    $id = (int)$pdo->lastInsertId();

    // If a dept head was assigned, make sure their role is dept_head
    if (!empty($d['head_user_id'])) {
        $pdo->prepare("UPDATE users SET role = 'dept_head' WHERE id = ? AND role NOT IN ('admin')")
            ->execute([(int)$d['head_user_id']]);
    }

    auditLog($authUser['sub'], 'admin.department.create', 'departments', $id, $d);
    respond(['success' => true, 'id' => $id], 201);
}

// ── PUT (admin only) — full update ────────────────────────────────────
if ($method === 'PUT') {
    requireRole($authUser, 'admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');

    $d = body();
    $fields = []; $vals = [];

    if (isset($d['name']))        { $fields[] = 'name = ?';        $vals[] = trim($d['name']); }
    if (isset($d['code']))        { $fields[] = 'code = ?';        $vals[] = strtoupper(trim($d['code'])); }
    if (isset($d['description'])) { $fields[] = 'description = ?'; $vals[] = $d['description']; }
    if (isset($d['location']))    { $fields[] = 'location = ?';    $vals[] = $d['location']; }
    if (array_key_exists('head_user_id', $d)) {
        $fields[] = 'head_user_id = ?';
        $vals[]   = $d['head_user_id'] ? (int)$d['head_user_id'] : null;
    }
    if (isset($d['is_active']))   { $fields[] = 'is_active = ?';   $vals[] = $d['is_active'] ? 1 : 0; }

    if (empty($fields)) fail('Nothing to update');
    $vals[] = $id;
    $pdo->prepare("UPDATE departments SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);

    // Update the head's role if changed
    if (array_key_exists('head_user_id', $d) && $d['head_user_id']) {
        $pdo->prepare("UPDATE users SET role = 'dept_head' WHERE id = ? AND role NOT IN ('admin')")
            ->execute([(int)$d['head_user_id']]);
    }

    auditLog($authUser['sub'], 'admin.department.update', 'departments', $id, $d);
    respond(['success' => true]);
}

// ── DELETE (admin only) — soft delete ────────────────────────────────
if ($method === 'DELETE') {
    requireRole($authUser, 'admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');

    $pdo->prepare("UPDATE departments SET is_active = 0, head_user_id = NULL WHERE id = ?")->execute([$id]);
    auditLog($authUser['sub'], 'admin.department.delete', 'departments', $id);
    respond(['success' => true]);
}

fail('Method not allowed', 405);