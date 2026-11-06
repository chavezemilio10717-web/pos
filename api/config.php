<?php
declare(strict_types=1);

return [
    'app' => [
        'name'     => 'Súper POS',
        'store'    => 'Mercado Central',
        'currency' => 'MXN',
        'locale'   => 'es-MX',
        'timezone' => 'America/Mexico_City',
        'version'  => '1.0.0',
    ],
    'db' => [
        'host'     => getenv('DB_HOST') ?: '127.0.0.1',
        'port'     => getenv('DB_PORT') ?: '3306',
        'database' => getenv('DB_DATABASE') ?: 'supermercado',
        'username' => getenv('DB_USERNAME') ?: 'root',
        'password' => getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '',
        'charset'  => 'utf8mb4',
    ],
];
