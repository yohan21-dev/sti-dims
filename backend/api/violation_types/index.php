<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

// ── GET (any authenticated user) ─────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT id, violation_name, description, severity, default_hours
         FROM violation_types WHERE is_active = 1 ORDER BY severity DESC, violation_name ASC"
    );
    respond(['success' => true, 'data' => $stmt->fetchAll()]);
}

// ── POST (admin only) ─────────────────────────────────────────────────
if ($method === 'POST') {
    requireRole($authUser, 'admin');
    $d = body();
    if (empty($d['violation_name'])) fail('violation_name required');

    $allowed = ['minor', 'moderate', 'major', 'critical'];
    $sev = in_array($d['severity'] ?? '', $allowed, true) ? $d['severity'] : 'minor';

    $stmt = $pdo->prepare(
        "INSERT INTO violation_types (violation_name, description, severity, default_hours)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([
        trim($d['violation_name']),
        $d['description'] ?? null,
        $sev,
        max(0, (int)($d['default_hours'] ?? 0)),
    ]);
    $id = (int)$pdo->lastInsertId();
    auditLog($authUser['sub'], 'admin.violation_type.create', 'violation_types', $id, $d);
    respond(['success' => true, 'id' => $id], 201);
}

// ── PUT (admin only) — update ─────────────────────────────────────────
if ($method === 'PUT') {
    requireRole($authUser, 'admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');

    $d = body();
    $allowed_sev = ['minor', 'moderate', 'major', 'critical'];

    $fields = []; $vals = [];
    if (!empty($d['violation_name'])) { $fields[] = 'violation_name = ?'; $vals[] = trim($d['violation_name']); }
    if (array_key_exists('description', $d)) { $fields[] = 'description = ?'; $vals[] = $d['description']; }
    if (!empty($d['severity']) && in_array($d['severity'], $allowed_sev, true)) {
        $fields[] = 'severity = ?'; $vals[] = $d['severity'];
    }
    if (isset($d['default_hours'])) { $fields[] = 'default_hours = ?'; $vals[] = max(0, (int)$d['default_hours']); }

    if (empty($fields)) fail('Nothing to update');

    $vals[] = $id;
    $pdo->prepare("UPDATE violation_types SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    auditLog($authUser['sub'], 'admin.violation_type.update', 'violation_types', $id, $d);
    respond(['success' => true]);
}

// ── DELETE (admin only) — soft delete ────────────────────────────────
if ($method === 'DELETE') {
    requireRole($authUser, 'admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');

    // Soft delete — keeps existing violation records intact
    $pdo->prepare("UPDATE violation_types SET is_active = 0 WHERE id = ?")->execute([$id]);
    auditLog($authUser['sub'], 'admin.violation_type.delete', 'violation_types', $id);
    respond(['success' => true]);
}

fail('Method not allowed', 405);