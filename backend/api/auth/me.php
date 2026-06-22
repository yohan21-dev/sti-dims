<?php
// backend/api/auth/me.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
requireMethod('GET');

$payload = requireAuth();

$stmt = Database::dims()->prepare(
    "SELECT id, username, email, full_name, role, avatar_url, last_login_at, department_id FROM users WHERE id = ?"
);
$stmt->execute([$payload['sub']]);
$user = $stmt->fetch();
if (!$user) fail('User not found', 404);

respond(['success' => true, 'user' => $user]);