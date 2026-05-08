<?php
// backend/api/dashboard/index.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
requireAuth();

$pdo = Database::dims();

// Total violations this month
$thisMonth = $pdo->query(
    "SELECT COUNT(*) FROM violations WHERE MONTH(date_recorded) = MONTH(CURDATE()) AND YEAR(date_recorded) = YEAR(CURDATE())"
)->fetchColumn();

// By status
$byStatus = $pdo->query(
    "SELECT status, COUNT(*) as count FROM violations GROUP BY status"
)->fetchAll();

// By severity
$bySeverity = $pdo->query(
    "SELECT vt.severity, COUNT(v.id) as count
     FROM violations v JOIN violation_types vt ON vt.id = v.violation_type_id
     GROUP BY vt.severity"
)->fetchAll();

// Recent violations (last 7 days by day)
$trend = $pdo->query(
    "SELECT DATE(date_recorded) as day, COUNT(*) as count
     FROM violations
     WHERE date_recorded >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY day ORDER BY day ASC"
)->fetchAll();

// Top violation types
$topTypes = $pdo->query(
    "SELECT vt.violation_name, COUNT(v.id) as count
     FROM violations v JOIN violation_types vt ON vt.id = v.violation_type_id
     GROUP BY vt.violation_name ORDER BY count DESC LIMIT 5"
)->fetchAll();

// Pending deployments
$pendingDeploy = $pdo->query(
    "SELECT COUNT(*) FROM deployments WHERE status IN ('pending','ongoing')"
)->fetchColumn();

// Repeat offenders (students with 3+ violations)
$repeatOffenders = $pdo->query(
    "SELECT student_id, COUNT(*) as total
     FROM violations GROUP BY student_id HAVING total >= 3 ORDER BY total DESC LIMIT 10"
)->fetchAll();

respond([
    'success' => true,
    'data' => [
        'violations_this_month' => (int)$thisMonth,
        'pending_deployments'   => (int)$pendingDeploy,
        'by_status'             => $byStatus,
        'by_severity'           => $bySeverity,
        'trend_30d'             => $trend,
        'top_types'             => $topTypes,
        'repeat_offenders'      => $repeatOffenders,
    ],
]);