<?php
// backend/config/Database.php

require_once __DIR__ . '/env.php';
loadEnv(__DIR__ . '/../.env');

class Database
{
    private static ?PDO $dims   = null;
    private static ?PDO $cubao  = null;

    private static function connect(
        string $host, int $port, string $dbname,
        string $user, string $pass
    ): PDO {
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ];
        return new PDO($dsn, $user, $pass, $options);
    }

    /** sti_dims — discipline data (read + write) */
    public static function dims(): PDO
    {
        if (self::$dims === null) {
            self::$dims = self::connect(
                env('DB_DIMS_HOST', '127.0.0.1'),
                (int) env('DB_DIMS_PORT', 3306),
                env('DB_DIMS_NAME', 'sti_dims'),
                env('DB_DIMS_USER'),
                env('DB_DIMS_PASS')
            );
        }
        return self::$dims;
    }

    /** sti_cubao — student roster (read-only) */
    public static function cubao(): PDO
    {
        if (self::$cubao === null) {
            self::$cubao = self::connect(
                env('DB_CUBAO_HOST', '127.0.0.1'),
                (int) env('DB_CUBAO_PORT', 3306),
                env('DB_CUBAO_NAME', 'sti_cubao'),
                env('DB_CUBAO_USER'),
                env('DB_CUBAO_PASS')
            );
        }
        return self::$cubao;
    }
}