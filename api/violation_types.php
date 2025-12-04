<?php
require_once "config.php"; // adjust if your path is different

header("Content-Type: application/json");

// ✅ HANDLE FETCH (GET)
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $sql = "SELECT 
                id AS violation_type_id,
                violation_name,
                severity
            FROM violation_types
            ORDER BY violation_name ASC";

    $result = $conn->query($sql);

    $data = [];

    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode($data);
    exit;
}

// ❌ BLOCK OTHER METHODS FOR SECURITY
http_response_code(405);
echo json_encode([
    "success" => false,
    "error" => "Method not allowed"
]);
