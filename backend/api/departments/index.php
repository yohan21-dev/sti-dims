<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

// ── GET (any authenticated user) ─────────────────────────────────────
if ($method === 'GET') {
    // Single department
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT d.* FROM departments d WHERE d.id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) fail('Department not found', 404);

        $hStmt = $pdo->prepare(
            "SELECT id, full_name, username, email FROM users
             WHERE department_id = ? AND role = 'dept_head' AND is_active = 1
             ORDER BY full_name ASC"
        );
        $hStmt->execute([$row['id']]);
        $row['heads'] = $hStmt->fetchAll();
        respond(['success' => true, 'data' => $row]);
    }

    // List — active only by default, pass ?all=1 for admin views
    $onlyActive = empty($_GET['all']) || $authUser['role'] !== 'admin';
    $sql = "SELECT d.id, d.name, d.code, d.description, d.location,
                   d.is_active,
                   COUNT(u.id) AS head_count,
                   GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR ', ') AS head_names
            FROM departments d
            LEFT JOIN users u ON u.department_id = d.id AND u.role = 'dept_head' AND u.is_active = 1"
         . ($onlyActive ? " WHERE d.is_active = 1" : "")
         . " GROUP BY d.id ORDER BY d.name ASC";
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
        "INSERT INTO departments (name, code, description, location)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([
        trim($d['name']),
        strtoupper(trim($d['code'])),
        $d['description'] ?? null,
        $d['location']    ?? null,
    ]);
    $id = (int)$pdo->lastInsertId();

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
    if (isset($d['is_active']))   { $fields[] = 'is_active = ?';   $vals[] = $d['is_active'] ? 1 : 0; }

    if (empty($fields)) fail('Nothing to update');
    $vals[] = $id;
    $pdo->prepare("UPDATE departments SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);

    auditLog($authUser['sub'], 'admin.department.update', 'departments', $id, $d);
    respond(['success' => true]);
}

// ── DELETE (admin only) — soft delete ────────────────────────────────
if ($method === 'DELETE') {
    requireRole($authUser, 'admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');

    // Unassign all dept heads from this department before deactivating
    $pdo->prepare("UPDATE users SET department_id = NULL WHERE department_id = ?")
        ->execute([$id]);
    $pdo->prepare("UPDATE departments SET is_active = 0 WHERE id = ?")
        ->execute([$id]);

    auditLog($authUser['sub'], 'admin.department.delete', 'departments', $id);
    respond(['success' => true]);
}

fail('Method not allowed', 405);