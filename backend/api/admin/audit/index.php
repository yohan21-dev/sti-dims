<?php
// backend/api/admin/audit/index.php
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
$authUser = requireAuth();
requireRole($authUser, 'admin');

$pdo   = Database::dims();
$page  = max(1, (int)($_GET['page'] ?? 1));
$limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));
$offset = ($page - 1) * $limit;

$where = ['1=1'];
$vals  = [];

if (!empty($_GET['q'])) {
    $like    = '%' . $_GET['q'] . '%';
    $where[] = "(u.username LIKE ? OR u.full_name LIKE ? OR al.action LIKE ?)";
    $vals    = array_merge($vals, [$like, $like, $like]);
}

if (!empty($_GET['action'])) {
    $where[] = "al.action = ?";
    $vals[]  = $_GET['action'];
}

if (!empty($_GET['user_id'])) {
    $where[] = "al.user_id = ?";
    $vals[]  = (int)$_GET['user_id'];
}

$whereStr = implode(' AND ', $where);

$countStmt = $pdo->prepare(
    "SELECT COUNT(*) FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE $whereStr"
);
$countStmt->execute($vals);
$total = (int)$countStmt->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT al.id, al.user_id, u.username, u.full_name,
            al.action, al.entity, al.entity_id, al.ip_address,
            al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE $whereStr
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?"
);
$stmt->execute(array_merge($vals, [$limit, $offset]));
$rows = $stmt->fetchAll();

respond([
    'success' => true,
    'data'    => $rows,
    'meta'    => [
        'total' => $total,
        'page'  => $page,
        'limit' => $limit,
        'pages' => (int)ceil($total / $limit),
    ],
]);