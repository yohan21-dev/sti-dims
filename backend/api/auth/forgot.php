<?php
require_once __DIR__ . '/../../config/bootstrap.php';
requireMethod('POST');

$d     = body();
$email = strtolower(trim($d['email'] ?? ''));

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['success' => true]);
}

$pdo  = Database::dims();
$stmt = $pdo->prepare(
    "SELECT id, full_name, username FROM users WHERE email = ? AND is_active = 1 LIMIT 1"
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    error_log("DIMS forgot-pw: no active user found for email=$email");
    respond(['success' => true]);
}

$rawToken  = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $rawToken);
$ttlMinutes = (int) env('PASSWORD_RESET_TTL_MIN', 60);

$pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$user['id']]);

$pdo->prepare(
    "INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))"
)->execute([$user['id'], $tokenHash, $ttlMinutes]);

$frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
$resetLink   = "$frontendUrl/reset-password?token=$rawToken";

try {
    _sendResetEmail($user['full_name'], $email, $resetLink, $ttlMinutes);
    error_log("DIMS forgot-pw: email sent OK to=$email user_id={$user['id']}");
} catch (\Exception $e) {
    error_log("DIMS forgot-pw: mailer FAILED to=$email — " . $e->getMessage());
    // Still respond success so we don't leak whether the email exists
}

auditLog($user['id'], 'auth.password_reset_request', 'users', $user['id']);
respond(['success' => true]);

// ── Mailer ────────────────────────────────────────────────────────────
function _sendResetEmail(string $name, string $to, string $link, int $ttl): void
{
    $siteName = env('SITE_NAME', 'STI DIMS');
    $from     = env('MAIL_FROM_ADDRESS', 'no-reply@sti-cubao.edu.ph');
    $fromName = env('MAIL_FROM_NAME', $siteName);
    $ttlHuman = $ttl >= 60 ? ($ttl / 60) . ' hour' . ($ttl / 60 == 1 ? '' : 's') : "$ttl minutes";

    $html = <<<HTML
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <tr><td style="background:#0D47A1;padding:28px 32px">
              <p style="margin:0;color:#FDD835;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">STI College Cubao</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700">Discipline Information Management System</p>
            </td></tr>
            <tr><td style="padding:32px">
              <p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600">Hi {$name},</p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6">
                We received a request to reset the password for your account (<strong>{$to}</strong>).
                Click the button below to set a new password. This link expires in <strong>{$ttlHuman}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
                <tr><td style="background:#0D47A1;border-radius:8px">
                  <a href="{$link}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">
                    Reset my password &rarr;
                  </a>
                </td></tr>
              </table>
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;line-height:1.6">
                If the button above doesn't work, copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 24px;color:#0D47A1;font-size:12px;word-break:break-all">{$link}</p>
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
                If you did not request a password reset, you can safely ignore this email.
                Your password will not be changed until you click the link above.
              </p>
            </td></tr>
            <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0">
              <p style="margin:0;color:#94a3b8;font-size:11px">
                &copy; {$siteName} &mdash; STI College Cubao Discipline Office
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    HTML;

    $text = "Hi $name,\n\nReset your $siteName password by visiting:\n$link\n\n"
          . "This link expires in $ttlHuman.\n\n"
          . "If you did not request this, ignore this email.\n\n$siteName";

    $mailer = new PHPMailer\PHPMailer\PHPMailer(true);
    $mailer->isSMTP();
    $mailer->Host       = env('MAIL_HOST', 'smtp.gmail.com');
    $mailer->SMTPAuth   = true;
    $mailer->Username   = env('MAIL_USERNAME');
    $mailer->Password   = env('MAIL_PASSWORD');
    $mailer->SMTPSecure = env('MAIL_ENCRYPTION', 'tls');
    $mailer->Port       = (int) env('MAIL_PORT', 587);
    $mailer->setFrom($from, $fromName);
    $mailer->addAddress($to, $name);
    $mailer->isHTML(true);
    $mailer->Subject = "[$siteName] Password Reset Request";
    $mailer->Body    = $html;
    $mailer->AltBody = $text;
    $mailer->send();
}