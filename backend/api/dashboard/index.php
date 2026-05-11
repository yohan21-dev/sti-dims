<?php
// backend/api/dashboard/index.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
requireAuth();

$pdo  = Database::dims();
$cPdo = Database::cubao();

// ── Violations this month ────────────────────────────────────────────
$thisMonth = (int)$pdo->query(
    "SELECT COUNT(*) FROM violations
     WHERE MONTH(date_recorded) = MONTH(CURDATE())
       AND YEAR(date_recorded)  = YEAR(CURDATE())"
)->fetchColumn();

// ── By status ────────────────────────────────────────────────────────
$byStatus = $pdo->query(
    "SELECT status, COUNT(*) AS count FROM violations GROUP BY status"
)->fetchAll();

// ── By severity ──────────────────────────────────────────────────────
$bySeverity = $pdo->query(
    "SELECT vt.severity, COUNT(v.id) AS count
     FROM violations v
     JOIN violation_types vt ON vt.id = v.violation_type_id
     GROUP BY vt.severity
     ORDER BY FIELD(vt.severity,'critical','major','moderate','minor')"
)->fetchAll();

// ── 30-day trend ─────────────────────────────────────────────────────
$trend = $pdo->query(
    "SELECT DATE(date_recorded) AS day, COUNT(*) AS count
     FROM violations
     WHERE date_recorded >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY day ORDER BY day ASC"
)->fetchAll();

// ── Top violation types ───────────────────────────────────────────────
$topTypes = $pdo->query(
    "SELECT vt.violation_name, COUNT(v.id) AS count
     FROM violations v
     JOIN violation_types vt ON vt.id = v.violation_type_id
     GROUP BY vt.id, vt.violation_name
     ORDER BY count DESC LIMIT 5"
)->fetchAll();

// ── Pending deployments ───────────────────────────────────────────────
$pendingDeploy = (int)$pdo->query(
    "SELECT COUNT(*) FROM deployments WHERE status IN ('pending','ongoing')"
)->fetchColumn();

// ── Repeat offenders (3+ violations) with student names ──────────────
$repeatRows = $pdo->query(
    "SELECT student_id, COUNT(*) AS total
     FROM violations
     GROUP BY student_id
     HAVING total >= 3
     ORDER BY total DESC LIMIT 10"
)->fetchAll();

// Resolve student names from sti_cubao
$repeatOffenders = [];
if (!empty($repeatRows)) {
    $ids   = array_column($repeatRows, 'student_id');
    $in    = implode(',', array_fill(0, count($ids), '?'));
    $sStmt = $cPdo->prepare(
        "SELECT id, student_number, last_name, first_name FROM students WHERE id IN ($in)"
    );
    $sStmt->execute($ids);
    $nameMap = [];
    foreach ($sStmt->fetchAll() as $s) {
        $nameMap[$s['id']] = [
            'name'           => $s['last_name'] . ', ' . $s['first_name'],
            'student_number' => $s['student_number'],
        ];
    }
    foreach ($repeatRows as $r) {
        $info = $nameMap[$r['student_id']] ?? ['name' => 'Unknown', 'student_number' => '—'];
        $repeatOffenders[] = [
            'student_id'     => $r['student_id'],
            'student_name'   => $info['name'],
            'student_number' => $info['student_number'],
            'total'          => (int)$r['total'],
        ];
    }
}

// ── Recent violations (last 5) with student names ────────────────────
$recentRows = $pdo->query(
    "SELECT v.id, v.student_id, v.date_recorded, v.status,
            vt.violation_name, vt.severity
     FROM violations v
     JOIN violation_types vt ON vt.id = v.violation_type_id
     ORDER BY v.created_at DESC LIMIT 5"
)->fetchAll();

$recentViolations = [];
if (!empty($recentRows)) {
    $ids   = array_unique(array_column($recentRows, 'student_id'));
    $in    = implode(',', array_fill(0, count($ids), '?'));
    $sStmt = $cPdo->prepare("SELECT id, last_name, first_name FROM students WHERE id IN ($in)");
    $sStmt->execute($ids);
    $nameMap = [];
    foreach ($sStmt->fetchAll() as $s) {
        $nameMap[$s['id']] = $s['last_name'] . ', ' . $s['first_name'];
    }
    foreach ($recentRows as $row) {
        $row['student_name'] = $nameMap[$row['student_id']] ?? 'Unknown Student';
        $recentViolations[] = $row;
    }
}

respond([
    'success' => true,
    'data'    => [
        'violations_this_month' => $thisMonth,
        'pending_deployments'   => $pendingDeploy,
        'by_status'             => $byStatus,
        'by_severity'           => $bySeverity,
        'trend_30d'             => $trend,
        'top_types'             => $topTypes,
        'repeat_offenders'      => $repeatOffenders,
        'recent_violations'     => $recentViolations,
    ],
]);