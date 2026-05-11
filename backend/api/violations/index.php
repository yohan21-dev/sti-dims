<?php
// backend/api/violations/index.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();

// Helper: attach student names from sti_cubao for an array of rows
function attachStudentNames(array $rows): array {
    if (empty($rows)) return $rows;
    $ids = array_unique(array_column($rows, 'student_id'));
    if (empty($ids)) return $rows;

    $in    = implode(',', array_fill(0, count($ids), '?'));
    $cStmt = Database::cubao()->prepare(
        "SELECT id, last_name, first_name FROM students WHERE id IN ($in)"
    );
    $cStmt->execute($ids);
    $map = [];
    foreach ($cStmt->fetchAll() as $s) {
        $map[$s['id']] = $s['last_name'] . ', ' . $s['first_name'];
    }
    foreach ($rows as &$row) {
        $row['student_name'] = $map[$row['student_id']] ?? 'Unknown Student';
    }
    return $rows;
}

// ── GET ──────────────────────────────────────────────────────────────
if ($method === 'GET') {

    // Single violation by ID
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            "SELECT v.*, vt.violation_name, vt.severity,
                    u.full_name AS officer_name,
                    d.id AS deployment_id, d.department, d.hours_required,
                    d.hours_completed, d.status AS deploy_status, d.date_assigned
             FROM violations v
             JOIN violation_types vt ON vt.id = v.violation_type_id
             JOIN users u            ON u.id  = v.reported_by
             LEFT JOIN deployments d ON d.violation_id = v.id
             WHERE v.id = ?"
        );
        $stmt->execute([(int)$_GET['id']]);
        $v = $stmt->fetch();
        if (!$v) fail('Violation not found', 404);

        // Student name
        $sStmt = Database::cubao()->prepare("SELECT last_name, first_name FROM students WHERE id = ?");
        $sStmt->execute([$v['student_id']]);
        $s = $sStmt->fetch();
        $v['student_name'] = $s ? $s['last_name'] . ', ' . $s['first_name'] : 'Unknown Student';

        // Files attached to this violation
        $fStmt = $pdo->prepare("SELECT * FROM student_files WHERE violation_id = ?");
        $fStmt->execute([$v['id']]);
        $v['files'] = $fStmt->fetchAll();

        respond(['success' => true, 'data' => $v]);
    }

    // List by student
    if (!empty($_GET['student_id'])) {
        $stmt = $pdo->prepare(
            "SELECT v.id, v.student_id, v.date_recorded, v.status, v.offense_count,
                    v.officer_notes,
                    vt.violation_name, vt.severity,
                    u.full_name AS officer_name,
                    d.hours_required, d.hours_completed, d.department, d.status AS deploy_status
             FROM violations v
             JOIN violation_types vt ON vt.id = v.violation_type_id
             JOIN users u            ON u.id  = v.reported_by
             LEFT JOIN deployments d ON d.violation_id = v.id
             WHERE v.student_id = ?
             ORDER BY v.date_recorded DESC"
        );
        $stmt->execute([(int)$_GET['student_id']]);
        $rows = $stmt->fetchAll();
        respond(['success' => true, 'data' => attachStudentNames($rows)]);
    }

    // Filter by status
    if (!empty($_GET['status'])) {
        $allowed = ['pending','in_progress','resolved','appealed','dismissed'];
        $status  = in_array($_GET['status'], $allowed, true) ? $_GET['status'] : 'pending';
        $limit   = min(100, (int)($_GET['limit'] ?? 50));
        $stmt    = $pdo->prepare(
            "SELECT v.id, v.student_id, v.date_recorded, v.status, v.offense_count,
                    vt.violation_name, vt.severity, u.full_name AS officer_name
             FROM violations v
             JOIN violation_types vt ON vt.id = v.violation_type_id
             JOIN users u            ON u.id  = v.reported_by
             WHERE v.status = ?
             ORDER BY v.created_at DESC LIMIT ?"
        );
        $stmt->execute([$status, $limit]);
        $rows = $stmt->fetchAll();
        respond(['success' => true, 'data' => attachStudentNames($rows)]);
    }

    // Search by student name / number
    if (!empty($_GET['q'])) {
        $like  = '%' . $_GET['q'] . '%';
        $cDb   = Database::cubao();
        $sStmt = $cDb->prepare(
            "SELECT id FROM students WHERE last_name LIKE ? OR first_name LIKE ? OR student_number LIKE ?"
        );
        $sStmt->execute([$like, $like, $like]);
        $ids = array_column($sStmt->fetchAll(), 'id');
        if (empty($ids)) {
            respond(['success' => true, 'data' => []]);
        }
        $in   = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare(
            "SELECT v.id, v.student_id, v.date_recorded, v.status, v.offense_count,
                    vt.violation_name, vt.severity, u.full_name AS officer_name
             FROM violations v
             JOIN violation_types vt ON vt.id = v.violation_type_id
             JOIN users u            ON u.id  = v.reported_by
             WHERE v.student_id IN ($in)
             ORDER BY v.date_recorded DESC LIMIT 100"
        );
        $stmt->execute($ids);
        $rows = $stmt->fetchAll();
        respond(['success' => true, 'data' => attachStudentNames($rows)]);
    }

    // Recent list (default)
    $limit = min(100, (int)($_GET['limit'] ?? 50));
    $stmt  = $pdo->prepare(
        "SELECT v.id, v.student_id, v.date_recorded, v.status, v.offense_count,
                vt.violation_name, vt.severity, u.full_name AS officer_name
         FROM violations v
         JOIN violation_types vt ON vt.id = v.violation_type_id
         JOIN users u            ON u.id  = v.reported_by
         ORDER BY v.created_at DESC LIMIT ?"
    );
    $stmt->execute([$limit]);
    $rows = $stmt->fetchAll();
    respond(['success' => true, 'data' => attachStudentNames($rows)]);
}

// ── POST (record new violation) ───────────────────────────────────────
if ($method === 'POST') {
    $d        = body();
    $required = ['student_id', 'violation_type_id', 'date_recorded'];
    foreach ($required as $f) {
        if (empty($d[$f])) fail("$f is required");
    }

    // Auto-calculate offense count for this student
    $ocStmt = $pdo->prepare("SELECT COUNT(*) FROM violations WHERE student_id = ?");
    $ocStmt->execute([(int)$d['student_id']]);
    $offenseCount = (int)$ocStmt->fetchColumn() + 1;

    $stmt = $pdo->prepare(
        "INSERT INTO violations
            (student_id, violation_type_id, date_recorded, reported_by, officer_notes, status, offense_count)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)"
    );
    $stmt->execute([
        (int)$d['student_id'],
        (int)$d['violation_type_id'],
        $d['date_recorded'],
        $authUser['sub'],
        $d['officer_notes'] ?? null,
        $offenseCount,
    ]);
    $violationId = (int)$pdo->lastInsertId();

    // Optionally auto-create a deployment
    if (!empty($d['deploy'])) {
        $dp = $d['deploy'];
        $pdo->prepare(
            "INSERT INTO deployments (violation_id, department, supervisor_name, hours_required, date_assigned)
             VALUES (?, ?, ?, ?, ?)"
        )->execute([
            $violationId,
            $dp['department']      ?? 'TBD',
            $dp['supervisor_name'] ?? null,
            (float)($dp['hours_required'] ?? 0),
            $dp['date_assigned']   ?? date('Y-m-d'),
        ]);
    }

    auditLog($authUser['sub'], 'violation.create', 'violations', $violationId, $d);
    respond(['success' => true, 'id' => $violationId], 201);
}

// ── PATCH (update status / notes) ────────────────────────────────────
if ($method === 'PATCH') {
    $d  = body();
    $id = (int)($_GET['id'] ?? $d['id'] ?? 0);
    if (!$id) fail('id required');

    $allowed = ['pending','in_progress','resolved','appealed','dismissed'];
    $status  = $d['status'] ?? null;
    if ($status && !in_array($status, $allowed, true)) fail('Invalid status');

    $fields = []; $vals = [];
    if ($status)              { $fields[] = 'status = ?';        $vals[] = $status; }
    if (isset($d['officer_notes'])) { $fields[] = 'officer_notes = ?'; $vals[] = $d['officer_notes']; }
    if (empty($fields))       fail('Nothing to update');

    $vals[] = $id;
    $pdo->prepare("UPDATE violations SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    auditLog($authUser['sub'], 'violation.update', 'violations', $id, $d);
    respond(['success' => true]);
}

// ── DELETE (admin only) ───────────────────────────────────────────────
if ($method === 'DELETE') {
    requireRole($authUser, 'admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');
    $pdo->prepare("DELETE FROM violations WHERE id = ?")->execute([$id]);
    auditLog($authUser['sub'], 'violation.delete', 'violations', $id);
    respond(['success' => true]);
}

fail('Method not allowed', 405);