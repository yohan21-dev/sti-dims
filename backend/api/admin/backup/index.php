<?php
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
$authUser = requireAuth();
requireRole($authUser, 'admin');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') fail('GET only', 405);

$format = strtolower($_GET['format'] ?? 'json'); // json | csv
$scope  = $_GET['scope'] ?? 'all'; // all | violations | deployments | students | users

$pdo  = Database::dims();
$cPdo = Database::cubao();

$data = [];

// ── Students (from cubao DB, enriched with violation counts) ──────────
if ($scope === 'all' || $scope === 'students') {
    $stmt = $cPdo->query(
        "SELECT id, student_number, last_name, first_name, program, section FROM students ORDER BY last_name"
    );
    $students = $stmt->fetchAll();

    // Attach violation counts
    if (!empty($students)) {
        $ids = array_column($students, 'id');
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $vcStmt = $pdo->prepare(
            "SELECT student_id, COUNT(*) as total,
                    SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending
             FROM violations WHERE student_id IN ($in) GROUP BY student_id"
        );
        $vcStmt->execute($ids);
        $vcMap = [];
        foreach ($vcStmt->fetchAll() as $vc) {
            $vcMap[$vc['student_id']] = $vc;
        }
        foreach ($students as &$s) {
            $s['violations_total']    = (int)($vcMap[$s['id']]['total']    ?? 0);
            $s['violations_resolved'] = (int)($vcMap[$s['id']]['resolved'] ?? 0);
            $s['violations_pending']  = (int)($vcMap[$s['id']]['pending']  ?? 0);
        }
    }
    $data['students'] = $students;
}

// ── Violations ────────────────────────────────────────────────────────
if ($scope === 'all' || $scope === 'violations') {
    $rows = $pdo->query(
        "SELECT v.id, v.student_id, v.date_recorded, v.status, v.offense_count,
                v.officer_notes, v.created_at,
                vt.violation_name, vt.severity,
                u.full_name AS officer_name, u.username AS officer_username
         FROM violations v
         JOIN violation_types vt ON vt.id = v.violation_type_id
         JOIN users u            ON u.id  = v.reported_by
         ORDER BY v.date_recorded DESC"
    )->fetchAll();

    // Attach student names
    if (!empty($rows)) {
        $ids   = array_unique(array_column($rows, 'student_id'));
        $in    = implode(',', array_fill(0, count($ids), '?'));
        $sStmt = $cPdo->prepare("SELECT id, student_number, last_name, first_name FROM students WHERE id IN ($in)");
        $sStmt->execute($ids);
        $nameMap = [];
        foreach ($sStmt->fetchAll() as $s) {
            $nameMap[$s['id']] = [
                'name'           => $s['last_name'] . ', ' . $s['first_name'],
                'student_number' => $s['student_number'],
            ];
        }
        foreach ($rows as &$row) {
            $row['student_name']   = $nameMap[$row['student_id']]['name']           ?? 'Unknown';
            $row['student_number'] = $nameMap[$row['student_id']]['student_number'] ?? '';
        }
    }
    $data['violations'] = $rows;
}

// ── Deployments ───────────────────────────────────────────────────────
if ($scope === 'all' || $scope === 'deployments') {
    $rows = $pdo->query(
        "SELECT d.id, d.department, d.supervisor_name, d.hours_required,
                d.hours_completed, d.date_assigned, d.date_completed, d.status, d.notes,
                v.student_id, vt.violation_name, v.date_recorded AS violation_date
         FROM deployments d
         JOIN violations v ON v.id = d.violation_id
         JOIN violation_types vt ON vt.id = v.violation_type_id
         ORDER BY d.date_assigned DESC"
    )->fetchAll();

    if (!empty($rows)) {
        $ids   = array_unique(array_column($rows, 'student_id'));
        $in    = implode(',', array_fill(0, count($ids), '?'));
        $sStmt = $cPdo->prepare("SELECT id, student_number, last_name, first_name FROM students WHERE id IN ($in)");
        $sStmt->execute($ids);
        $nameMap = [];
        foreach ($sStmt->fetchAll() as $s) {
            $nameMap[$s['id']] = $s['last_name'] . ', ' . $s['first_name'];
            $numMap[$s['id']]  = $s['student_number'];
        }
        foreach ($rows as &$row) {
            $row['student_name']   = $nameMap[$row['student_id']] ?? 'Unknown';
            $row['student_number'] = $numMap[$row['student_id']]  ?? '';
        }
    }
    $data['deployments'] = $rows;
}

// ── Users (no password hashes) ────────────────────────────────────────
if ($scope === 'all' || $scope === 'users') {
    $data['users'] = $pdo->query(
        "SELECT id, username, email, full_name, role, is_active, created_at, last_login_at FROM users ORDER BY created_at"
    )->fetchAll();
}

// ── Violation Types ───────────────────────────────────────────────────
if ($scope === 'all') {
    $data['violation_types'] = $pdo->query(
        "SELECT id, violation_name, description, severity, default_hours, is_active FROM violation_types ORDER BY severity, violation_name"
    )->fetchAll();
    $data['exported_at'] = date('Y-m-d H:i:s');
    $data['exported_by'] = $authUser['username'] ?? $authUser['sub'];
}

auditLog($authUser['sub'], 'admin.backup.export', null, null, ['scope' => $scope, 'format' => $format]);

// ── Output ────────────────────────────────────────────────────────────
$ts = date('Ymd_His');

if ($format === 'csv') {
    // For CSV, export one table at a time; if scope=all, zip is ideal but we'll export the primary requested table
    $tableKey = ($scope === 'all') ? 'violations' : $scope;
    $rows     = $data[$tableKey] ?? [];

    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"sti_dims_{$tableKey}_{$ts}.csv\"");
    header('Cache-Control: no-cache');

    if (!empty($rows)) {
        $out = fopen('php://output', 'w');
        fputcsv($out, array_keys($rows[0])); // header row
        foreach ($rows as $row) {
            fputcsv($out, $row);
        }
        fclose($out);
    }
    exit;
}

// JSON (default)
header('Content-Type: application/json; charset=utf-8');
header("Content-Disposition: attachment; filename=\"sti_dims_backup_{$scope}_{$ts}.json\"");
header('Cache-Control: no-cache');
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
exit;