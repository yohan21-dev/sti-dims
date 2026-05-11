<?php
// backend/api/files/upload.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
$authUser = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST only', 405);

$studentId  = (int)($_POST['student_id'] ?? 0);
$violationId = !empty($_POST['violation_id']) ? (int)$_POST['violation_id'] : null;
$category   = $_POST['category'] ?? 'other';
if (!$studentId) fail('student_id required');

$allowedCategories = ['incident_report','written_statement','photo_evidence','parent_letter','clearance','id_photo','other'];
if (!in_array($category, $allowedCategories, true)) $category = 'other';

if (empty($_FILES['file'])) fail('No file uploaded');
$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) fail('Upload error: ' . $file['error']);

$maxBytes = (int)env('UPLOAD_MAX_MB', 10) * 1024 * 1024;
if ($file['size'] > $maxBytes) fail('File too large (max ' . env('UPLOAD_MAX_MB', 10) . ' MB)');

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowedExts = explode(',', env('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,pdf,doc,docx'));
if (!in_array($ext, $allowedExts, true)) fail("File type .$ext not allowed");

// Validate MIME
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$safeMimes = [
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
if (!in_array($mime, $safeMimes, true)) fail('Disallowed MIME type');

// Build unique path
$uploadDir = rtrim(env('UPLOAD_DIR', __DIR__ . '/../../uploads'), '/');
$subdir    = in_array($mime, ['image/jpeg','image/png','image/gif','image/webp']) ? 'images' : 'documents';
$destDir   = "$uploadDir/$subdir";
if (!is_dir($destDir)) mkdir($destDir, 0750, true);

$storedName = bin2hex(random_bytes(16)) . ".$ext";
$destPath   = "$destDir/$storedName";

if (!move_uploaded_file($file['tmp_name'], $destPath)) fail('Failed to save file');

$pdo  = Database::dims();
$stmt = $pdo->prepare(
    "INSERT INTO student_files (student_id, violation_id, file_name, original_name, mime_type, file_size, file_path, category, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->execute([
    $studentId, $violationId,
    $storedName, basename($file['name']),
    $mime, $file['size'],
    "$subdir/$storedName",
    $category,
    $authUser['sub'],
]);

auditLog($authUser['sub'], 'file.upload', 'student_files', (int)$pdo->lastInsertId());
respond(['success' => true, 'file_id' => (int)$pdo->lastInsertId(), 'file_name' => $storedName], 201);