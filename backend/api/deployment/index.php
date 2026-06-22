<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = Database::dims();
$role   = $authUser['role'] ?? '';

// ── Helper: enrich rows with student names ────────────────────────────
function attachStudentNamesToDeployments(array $rows): array {
    if (empty($rows)) return $rows;
    $ids = array_unique(array_filter(array_column($rows, 'student_id')));
    if (empty($ids)) return $rows;
    $in = implode(',', array_fill(0, count($ids), '?'));
    $stmt = Database::cubao()->prepare(
        "SELECT id, student_number, last_name, first_name, program, section FROM students WHERE id IN ($in)"
    );
    $stmt->execute($ids);
    $map = [];
    foreach ($stmt->fetchAll() as $s) {
        $map[$s['id']] = $s;
    }
    foreach ($rows as &$row) {
        $s = $map[$row['student_id']] ?? null;
        $row['student_name']    = $s ? $s['last_name'] . ', ' . $s['first_name'] : 'Unknown';
        $row['student_number']  = $s['student_number'] ?? '';
        $row['student_program'] = $s['program'] ?? '';
        $row['student_section'] = $s['section'] ?? '';
    }
    return $rows;
}

// ── GET ───────────────────────────────────────────────────────────────
if ($method === 'GET') {

    // Single deployment with logs
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            "SELECT d.*, v.student_id, v.date_recorded, vt.violation_name,
                    dept.name AS department_name, dept.code AS department_code
             FROM deployments d
             JOIN violations v      ON v.id  = d.violation_id
             JOIN violation_types vt ON vt.id = v.violation_type_id
             LEFT JOIN departments dept ON dept.id = d.department_id
             WHERE d.id = ?"
        );
        $stmt->execute([(int)$_GET['id']]);
        $dep = $stmt->fetch();
        if (!$dep) fail('Deployment not found', 404);

        // Dept heads can only see deployments assigned to their department
        if ($role === 'dept_head') {
            $myDept = getDeptHeadDepartment($pdo, (int)$authUser['sub']);
            if (!$myDept || (int)$dep['department_id'] !== (int)$myDept['id']) {
                fail('Forbidden', 403);
            }
        }

        $logStmt = $pdo->prepare(
            "SELECT sl.*, u.full_name AS verified_by_name
             FROM service_logs sl LEFT JOIN users u ON u.id = sl.verified_by
             WHERE sl.deployment_id = ? ORDER BY sl.log_date DESC"
        );
        $logStmt->execute([$dep['id']]);
        $dep['logs'] = $logStmt->fetchAll();

        $rows = attachStudentNamesToDeployments([$dep]);
        respond(['success' => true, 'data' => $rows[0]]);
    }

    // By student
    if (!empty($_GET['student_id'])) {
        $stmt = $pdo->prepare(
            "SELECT d.*, vt.violation_name, v.date_recorded,
                    dept.name AS department_name, dept.code AS department_code
             FROM deployments d
             JOIN violations v      ON v.id  = d.violation_id
             JOIN violation_types vt ON vt.id = v.violation_type_id
             LEFT JOIN departments dept ON dept.id = d.department_id
             WHERE v.student_id = ?
             ORDER BY d.date_assigned DESC"
        );
        $stmt->execute([(int)$_GET['student_id']]);
        respond(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ── Dept-head queue: only deployments assigned to their department ──
    if ($role === 'dept_head') {
        $myDept = getDeptHeadDepartment($pdo, (int)$authUser['sub']);
        if (!$myDept) fail('No department assigned to your account', 403);

        $status = $_GET['status'] ?? '';
        $allowed = ['pending','ongoing','completed','cancelled'];
        $whereStatus = ($status && in_array($status, $allowed, true)) ? "AND d.status = '$status'" : '';

        $stmt = $pdo->prepare(
            "SELECT d.id, d.department, d.department_id, d.hours_required, d.hours_completed,
                    d.date_assigned, d.date_completed, d.status, d.supervisor_name, d.notes,
                    v.student_id, vt.violation_name, v.date_recorded AS violation_date,
                    dept.name AS department_name, dept.code AS department_code
             FROM deployments d
             JOIN violations v      ON v.id  = d.violation_id
             JOIN violation_types vt ON vt.id = v.violation_type_id
             LEFT JOIN departments dept ON dept.id = d.department_id
             WHERE d.department_id = ? $whereStatus
             ORDER BY d.status ASC, d.date_assigned DESC"
        );
        $stmt->execute([(int)$myDept['id']]);
        $rows = $stmt->fetchAll();
        respond([
            'success'    => true,
            'data'       => attachStudentNamesToDeployments($rows),
            'department' => $myDept,
        ]);
    }

    // ── Admin / Officer: full list ────────────────────────────────────
    $whereStatus = '';
    $params = [];
    if (!empty($_GET['status'])) {
        $whereStatus = 'WHERE d.status = ?';
        $params[] = $_GET['status'];
    }

    $stmt = $pdo->prepare(
        "SELECT d.id, d.department, d.department_id, d.hours_required, d.hours_completed,
                d.date_assigned, d.date_completed, d.status, d.supervisor_name,
                v.student_id, vt.violation_name,
                dept.name AS department_name, dept.code AS department_code
         FROM deployments d
         JOIN violations v      ON v.id  = d.violation_id
         JOIN violation_types vt ON vt.id = v.violation_type_id
         LEFT JOIN departments dept ON dept.id = d.department_id
         $whereStatus
         ORDER BY d.date_assigned DESC LIMIT 50"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    respond(['success' => true, 'data' => attachStudentNamesToDeployments($rows)]);
}

// ── POST (admin / officer only) ───────────────────────────────────────
if ($method === 'POST') {
    if (!in_array($role, ['admin', 'officer'], true)) fail('Forbidden', 403);

    $d = body();
    if (empty($d['violation_id'])) fail('violation_id required');

    $stmt = $pdo->prepare(
        "INSERT INTO deployments (violation_id, department, department_id, supervisor_name, hours_required, date_assigned, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        (int)$d['violation_id'],
        $d['department']    ?? 'TBD',
        !empty($d['department_id']) ? (int)$d['department_id'] : null,
        $d['supervisor_name'] ?? null,
        (float)($d['hours_required'] ?? 0),
        $d['date_assigned'] ?? date('Y-m-d'),
        $d['notes']         ?? null,
    ]);
    $id = (int)$pdo->lastInsertId();
    auditLog($authUser['sub'], 'deployment.create', 'deployments', $id, $d);
    respond(['success' => true, 'id' => $id], 201);
}

// ── PATCH (admin / officer can update anything; dept_head can ack status) ──
if ($method === 'PATCH') {
    $d  = body();
    $id = (int)($_GET['id'] ?? $d['id'] ?? 0);
    if (!$id) fail('id required');

    // Dept heads: only allowed to flip status to ongoing/completed on their dept's deployments
    if ($role === 'dept_head') {
        $myDept = getDeptHeadDepartment($pdo, (int)$authUser['sub']);
        $check = $pdo->prepare("SELECT department_id FROM deployments WHERE id = ?");
        $check->execute([$id]);
        $dep = $check->fetch();
        if (!$dep || !$myDept || (int)$dep['department_id'] !== (int)$myDept['id']) {
            fail('Forbidden', 403);
        }
        $allowed = ['ongoing', 'completed'];
        if (!empty($d['status']) && !in_array($d['status'], $allowed, true)) {
            fail('Dept heads can only set status to ongoing or completed', 403);
        }
        // Dept heads may only update status
        $d = array_intersect_key($d, array_flip(['status']));
    } else {
        if (!in_array($role, ['admin', 'officer'], true)) fail('Forbidden', 403);
    }

    $fields = []; $vals = [];
    foreach (['department','department_id','supervisor_name','hours_required','hours_completed','date_completed','status','notes'] as $f) {
        if (array_key_exists($f, $d)) { $fields[] = "$f = ?"; $vals[] = $d[$f]; }
    }
    if (empty($fields)) fail('Nothing to update');

    if (($d['status'] ?? '') === 'completed' && !isset($d['date_completed'])) {
        $fields[] = 'date_completed = CURDATE()';
    }

    $vals[] = $id;
    $pdo->prepare("UPDATE deployments SET " . implode(', ', $fields) . " WHERE id = ?")->execute($vals);
    auditLog($authUser['sub'], 'deployment.update', 'deployments', $id, $d);
    respond(['success' => true]);
}

// ── PUT — log a service session (dept_head, officer, admin) ──────────
if ($method === 'PUT') {
    $d = body();
    if (empty($d['deployment_id'])) fail('deployment_id required');

    $depId = (int)$d['deployment_id'];

    // Dept heads can only log hours for their own department
    if ($role === 'dept_head') {
        $myDept = getDeptHeadDepartment($pdo, (int)$authUser['sub']);
        $check  = $pdo->prepare("SELECT department_id FROM deployments WHERE id = ?");
        $check->execute([$depId]);
        $dep = $check->fetch();
        if (!$dep || !$myDept || (int)$dep['department_id'] !== (int)$myDept['id']) {
            fail('Forbidden', 403);
        }
    } elseif (!in_array($role, ['admin', 'officer'], true)) {
        fail('Forbidden', 403);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO service_logs (deployment_id, log_date, time_in, time_out, verified_by, remarks)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $depId,
        $d['log_date']  ?? date('Y-m-d'),
        $d['time_in']   ?? null,
        $d['time_out']  ?? null,
        // dept_head always verifies; others only if they tick the checkbox
        ($role === 'dept_head' || !empty($d['verified'])) ? $authUser['sub'] : null,
        $d['remarks']   ?? null,
    ]);

    // Recalculate hours_completed
    $pdo->prepare(
        "UPDATE deployments d
         SET hours_completed = (
             SELECT COALESCE(SUM(hours_rendered), 0) FROM service_logs WHERE deployment_id = d.id
         )
         WHERE d.id = ?"
    )->execute([$depId]);

    // Auto-complete deployment when hours are met
    $pdo->prepare(
        "UPDATE deployments
         SET status = 'completed', date_completed = CURDATE()
         WHERE id = ? AND hours_completed >= hours_required AND status = 'ongoing'"
    )->execute([$depId]);

    respond(['success' => true, 'log_id' => (int)$pdo->lastInsertId()]);
}

fail('Method not allowed', 405);

// ── Utility ───────────────────────────────────────────────────────────
function getDeptHeadDepartment(PDO $pdo, int $userId): ?array {
    $stmt = $pdo->prepare(
        "SELECT d.id, d.name, d.code, d.location
         FROM departments d
         JOIN users u ON u.department_id = d.id
         WHERE u.id = ? AND d.is_active = 1
         LIMIT 1"
    );
    $stmt->execute([$userId]);
    return $stmt->fetch() ?: null;
}