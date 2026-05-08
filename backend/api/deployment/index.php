<?php
// backend/api/deployment/index.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

if ($method === 'GET') {
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            "SELECT d.*, v.student_id, v.date_recorded, vt.violation_name
             FROM deployments d
             JOIN violations v ON v.id = d.violation_id
             JOIN violation_types vt ON vt.id = v.violation_type_id
             WHERE d.id = ?"
        );
        $stmt->execute([(int)$_GET['id']]);
        $dep = $stmt->fetch();
        if (!$dep) fail('Deployment not found', 404);

        $logStmt = $pdo->prepare(
            "SELECT sl.*, u.full_name AS verified_by_name
             FROM service_logs sl LEFT JOIN users u ON u.id = sl.verified_by
             WHERE sl.deployment_id = ? ORDER BY sl.log_date DESC"
        );
        $logStmt->execute([$dep['id']]);
        $dep['logs'] = $logStmt->fetchAll();
        respond(['success' => true, 'data' => $dep]);
    }

    if (!empty($_GET['student_id'])) {
        $stmt = $pdo->prepare(
            "SELECT d.*, vt.violation_name, v.date_recorded
             FROM deployments d
             JOIN violations v ON v.id = d.violation_id
             JOIN violation_types vt ON vt.id = v.violation_type_id
             WHERE v.student_id = ?
             ORDER BY d.date_assigned DESC"
        );
        $stmt->execute([(int)$_GET['student_id']]);
        respond(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    $stmt = $pdo->prepare(
        "SELECT d.id, d.department, d.hours_required, d.hours_completed,
                d.date_assigned, d.date_completed, d.status,
                v.student_id, vt.violation_name
         FROM deployments d
         JOIN violations v ON v.id = d.violation_id
         JOIN violation_types vt ON vt.id = v.violation_type_id
         ORDER BY d.date_assigned DESC LIMIT 50"
    );
    $stmt->execute();
    respond(['success' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $d = body();
    if (empty($d['violation_id'])) fail('violation_id required');
    $stmt = $pdo->prepare(
        "INSERT INTO deployments (violation_id, department, supervisor_name, hours_required, date_assigned, notes)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        (int)$d['violation_id'],
        $d['department'] ?? 'TBD',
        $d['supervisor_name'] ?? null,
        (float)($d['hours_required'] ?? 0),
        $d['date_assigned'] ?? date('Y-m-d'),
        $d['notes'] ?? null,
    ]);
    $id = (int)$pdo->lastInsertId();
    auditLog($authUser['sub'], 'deployment.create', 'deployments', $id, $d);
    respond(['success' => true, 'id' => $id], 201);
}

if ($method === 'PATCH') {
    $d  = body();
    $id = (int)($_GET['id'] ?? $d['id'] ?? 0);
    if (!$id) fail('id required');

    $fields = []; $vals = [];
    foreach (['department','supervisor_name','hours_required','hours_completed','date_completed','status','notes'] as $f) {
        if (array_key_exists($f, $d)) { $fields[] = "$f = ?"; $vals[] = $d[$f]; }
    }
    if (empty($fields)) fail('Nothing to update');

    // Auto-set date_completed
    if (($d['status'] ?? '') === 'completed' && !isset($d['date_completed'])) {
        $fields[] = 'date_completed = CURDATE()';
    }

    $vals[] = $id;
    $pdo->prepare("UPDATE deployments SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    auditLog($authUser['sub'], 'deployment.update', 'deployments', $id, $d);
    respond(['success' => true]);
}

// Log a service session
if ($method === 'PUT') {
    $d = body();
    if (empty($d['deployment_id'])) fail('deployment_id required');

    $stmt = $pdo->prepare(
        "INSERT INTO service_logs (deployment_id, log_date, time_in, time_out, verified_by, remarks)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        (int)$d['deployment_id'],
        $d['log_date'] ?? date('Y-m-d'),
        $d['time_in'] ?? null,
        $d['time_out'] ?? null,
        $d['verified'] ? $authUser['sub'] : null,
        $d['remarks'] ?? null,
    ]);

    // Recalculate hours_completed
    $pdo->prepare(
        "UPDATE deployments d
         SET hours_completed = (
             SELECT COALESCE(SUM(hours_rendered), 0) FROM service_logs WHERE deployment_id = d.id
         )
         WHERE d.id = ?"
    )->execute([(int)$d['deployment_id']]);

    respond(['success' => true, 'log_id' => (int)$pdo->lastInsertId()]);
}

fail('Method not allowed', 405);