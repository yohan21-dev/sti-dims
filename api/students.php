<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // GET: list or single student ?id= or ?q=
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        echo json_encode($stmt->fetch());
        exit;
    }
    // search / list
    $q = !empty($_GET['q']) ? "%{$_GET['q']}%" : '%%';
    $stmt = $pdo->prepare("SELECT * FROM students WHERE firstname LIKE ? OR lastname LIKE ? OR student_number LIKE ? ORDER BY lastname ASC");
    $stmt->execute([$q, $q, $q]);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    // Create student - expects JSON body
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['firstname']) || empty($data['lastname'])) {
        http_response_code(422);
        echo json_encode(['error' => 'firstname and lastname required']);
        exit;
    }
    $stmt = $pdo->prepare("INSERT INTO students (student_number, firstname, lastname, course, year_level) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['student_number'] ?? null,
        $data['firstname'],
        $data['lastname'],
        $data['course'] ?? null,
        $data['year_level'] ?? null
    ]);
    echo json_encode(['success' => true, 'student_id' => $pdo->lastInsertId()]);
    exit;
}

if ($method === 'PUT') {
    // Update
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['student_id'])) { http_response_code(422); echo json_encode(['error'=>'student_id required']); exit; }
    $stmt = $pdo->prepare("UPDATE students SET student_number=?, firstname=?, lastname=?, course=?, year_level=? WHERE student_id=?");
    $stmt->execute([
        $data['student_number'] ?? null,
        $data['firstname'] ?? null,
        $data['lastname'] ?? null,
        $data['course'] ?? null,
        $data['year_level'] ?? null,
        $data['student_id']
    ]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    // Delete ?id=
    parse_str(file_get_contents("php://input"), $delvars);
    $id = $delvars['id'] ?? null;
    if (!$id) { http_response_code(422); echo json_encode(['error'=>'id required']); exit; }
    $stmt = $pdo->prepare("DELETE FROM students WHERE student_id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
