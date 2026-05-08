<?php
// backend/api/violation_types/index.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT id, violation_name, description, severity, default_hours
         FROM violation_types WHERE is_active = 1 ORDER BY severity DESC, violation_name ASC"
    );
    respond(['success' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    requireRole($authUser, 'admin');
    $d = body();
    if (empty($d['violation_name'])) fail('violation_name required');
    $stmt = $pdo->prepare(
        "INSERT INTO violation_types (violation_name, description, severity, default_hours)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([
        $d['violation_name'],
        $d['description'] ?? null,
        $d['severity'] ?? 'minor',
        (int)($d['default_hours'] ?? 0),
    ]);
    respond(['success' => true, 'id' => (int)$pdo->lastInsertId()], 201);
}

fail('Method not allowed', 405);