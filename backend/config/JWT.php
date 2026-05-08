<?php
// backend/config/JWT.php

class JWT
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function generate(array $payload, int $ttl): string
    {
        $secret = env('JWT_SECRET');
        if (!$secret) throw new RuntimeException('JWT_SECRET not set');

        $header  = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttl;
        $body    = self::base64UrlEncode(json_encode($payload));
        $sig     = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$body", $secret, true)
        );
        return "$header.$body.$sig";
    }

    /**
     * @throws RuntimeException on invalid / expired token
     */
    public static function verify(string $token): array
    {
        $secret = env('JWT_SECRET');
        $parts  = explode('.', $token);
        if (count($parts) !== 3) throw new RuntimeException('Malformed token');

        [$header, $body, $sig] = $parts;
        $expected = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$body", $secret, true)
        );

        if (!hash_equals($expected, $sig)) {
            throw new RuntimeException('Invalid signature');
        }

        $payload = json_decode(self::base64UrlDecode($body), true);
        if (!$payload || !isset($payload['exp'])) {
            throw new RuntimeException('Invalid payload');
        }
        if ($payload['exp'] < time()) {
            throw new RuntimeException('Token expired');
        }
        return $payload;
    }
}