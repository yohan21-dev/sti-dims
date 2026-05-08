<?php
// backend/config/bootstrap.php
// Include at the top of every API endpoint

require_once __DIR__ . '/env.php';
loadEnv(__DIR__ . '/../.env');

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/JWT.php';

// ── CORS ──────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = env('FRONTEND_URL', '');

if ($origin === $allowed) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// ── Helpers ───────────────────────────────────────────────────
function respond(mixed $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function fail(string $message, int $code = 400, array $extra = []): never
{
    respond(['success' => false, 'error' => $message, ...$extra], $code);
}

function body(): array
{
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function requireMethod(string ...$methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        fail('Method not allowed', 405);
    }
}

/** Log action to audit_logs */
function auditLog(
    ?int $userId,
    string $action,
    ?string $entity = null,
    ?int $entityId = null,
    ?array $payload = null
): void {
    try {
        $pdo = Database::dims();
        $stmt = $pdo->prepare(
            "INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, user_agent, payload)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $userId,
            $action,
            $entity,
            $entityId,
            $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            $payload ? json_encode($payload) : null,
        ]);
    } catch (Throwable) { /* never crash on audit failure */ }
}