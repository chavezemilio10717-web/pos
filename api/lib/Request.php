<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class Request
{
    public static function method(): string
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $override = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? null;

        if ($method === 'POST' && is_string($override) && $override !== '') {
            $method = strtoupper($override);
        }

        return $method;
    }

    public static function path(): string
    {
        if (isset($_GET['route']) && is_string($_GET['route'])) {
            $path = $_GET['route'];
        } else {
            $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
            $path = $uri;

            if ($base !== '' && $base !== '/' && str_starts_with($uri, $base)) {
                $path = substr($uri, strlen($base));
            }

            $path = preg_replace('#^/index\.php#', '', $path) ?? $path;
        }

        $path = '/' . trim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }

    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public static function json(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new HttpException(400, 'El cuerpo de la solicitud debe ser JSON válido.');
        }

        return $data;
    }

    public static function has(array $data, string $key): bool
    {
        return array_key_exists($key, $data);
    }
}
