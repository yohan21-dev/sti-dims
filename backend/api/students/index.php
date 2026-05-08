<?php
// backend/api/students/index.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $db = Database::cubao();

    // Single student
    if (!empty($_GET['id'])) {
        $stmt = $db->prepare(
            "SELECT id, student_number, last_name, first_name, program, section FROM students WHERE id = ?"
        );
        $stmt->execute([(int)$_GET['id']]);
        $student = $stmt->fetch();
        if (!$student) fail('Student not found', 404);

        // Attach violation count from sti_dims
        $vstmt = Database::dims()->prepare(
            "SELECT COUNT(*) as total,
                    SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved
             FROM violations WHERE student_id = ?"
        );
        $vstmt->execute([$student['id']]);
        $student['violation_stats'] = $vstmt->fetch();

        // Attach files
        $fstmt = Database::dims()->prepare(
            "SELECT id, file_name, original_name, mime_type, file_size, category, created_at
             FROM student_files WHERE student_id = ? ORDER BY created_at DESC"
        );
        $fstmt->execute([$student['id']]);
        $student['files'] = $fstmt->fetchAll();

        respond(['success' => true, 'data' => $student]);
    }

    // Search / paginate
    $q     = trim($_GET['q'] ?? '');
    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(5, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    if ($q !== '') {
        $like = "%$q%";
        $stmt = $db->prepare(
            "SELECT id, student_number, last_name, first_name, program, section
             FROM students
             WHERE last_name LIKE ? OR first_name LIKE ? OR student_number LIKE ?
             ORDER BY last_name ASC
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$like, $like, $like, $limit, $offset]);

        $countStmt = $db->prepare(
            "SELECT COUNT(*) FROM students
             WHERE last_name LIKE ? OR first_name LIKE ? OR student_number LIKE ?"
        );
        $countStmt->execute([$like, $like, $like]);
    } else {
        $stmt = $db->prepare(
            "SELECT id, student_number, last_name, first_name, program, section
             FROM students ORDER BY last_name ASC LIMIT ? OFFSET ?"
        );
        $stmt->execute([$limit, $offset]);
        $countStmt = $db->prepare("SELECT COUNT(*) FROM students");
        $countStmt->execute();
    }

    $students = $stmt->fetchAll();
    $total    = (int) $countStmt->fetchColumn();

    respond([
        'success' => true,
        'data'    => $students,
        'meta'    => ['total' => $total, 'page' => $page, 'limit' => $limit,
                      'pages' => (int) ceil($total / $limit)],
    ]);
}

fail('Method not allowed', 405);