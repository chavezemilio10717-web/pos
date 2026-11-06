<?php
declare(strict_types=1);

define('APP_BOOT', true);

$config = require __DIR__ . '/config.php';

date_default_timezone_set($config['app']['timezone']);
ini_set('display_errors', '0');

require_once __DIR__ . '/lib/HttpException.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Request.php';
require_once __DIR__ . '/lib/Validator.php';
require_once __DIR__ . '/lib/Router.php';

require_once __DIR__ . '/controllers/CategoriasController.php';
require_once __DIR__ . '/controllers/ProductosController.php';
require_once __DIR__ . '/controllers/ClientesController.php';
require_once __DIR__ . '/controllers/VentasController.php';
require_once __DIR__ . '/controllers/DashboardController.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-HTTP-Method-Override');
header('Cache-Control: no-store');

set_exception_handler(static function (Throwable $e): void {
    if ($e instanceof HttpException) {
        Response::error($e->getMessage(), $e->status(), $e->errors());
    }

    if ($e instanceof PDOException) {
        if ((string) $e->getCode() === '23000') {
            Response::error(
                'No se puede completar la operación porque el registro está duplicado o relacionado.',
                409
            );
        }

        error_log('[Súper POS][PDO] ' . $e->getMessage());
        Response::error('Ocurrió un error al acceder a la base de datos.', 500);
    }

    error_log('[Súper POS] ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    Response::error('Ocurrió un error inesperado. Intenta de nuevo.', 500);
});

$method = Request::method();
if ($method === 'OPTIONS') {
    Response::noContent();
}

try {
    Database::connect($config['db']);
} catch (HttpException $e) {
    Response::error($e->getMessage(), $e->status());
}

$router = new Router();

$router->get('/', static fn (): array => [
    'name'      => $config['app']['name'],
    'store'     => $config['app']['store'],
    'version'   => $config['app']['version'],
    'endpoints' => [
        'GET /dashboard',
        'GET|POST /categorias',
        'GET|PUT|DELETE /categorias/{id}',
        'GET|POST /productos',
        'GET|PUT|DELETE /productos/{id}',
        'GET|POST /clientes',
        'GET|PUT|DELETE /clientes/{id}',
        'GET|POST /ventas',
        'GET|PUT|DELETE /ventas/{id}',
    ],
]);

$router->get('/health', static function (): array {
    $db = Database::fetchOne('SELECT VERSION() AS version, NOW() AS ahora');
    return [
        'status'   => 'ok',
        'database' => $db['version'],
        'server'   => PHP_VERSION,
        'time'     => $db['ahora'],
    ];
});

$router->get('/dashboard', static fn (): array => (new DashboardController())->index());

$router->get('/categorias', static fn (): array => (new CategoriasController())->index());
$router->post('/categorias', static fn (): array => (new CategoriasController())->store());
$router->get('/categorias/{id}', static fn (array $params): array => (new CategoriasController())->show($params));
$router->put('/categorias/{id}', static fn (array $params): array => (new CategoriasController())->update($params));
$router->delete('/categorias/{id}', static fn (array $params): array => (new CategoriasController())->destroy($params));

$router->get('/productos', static fn (): array => (new ProductosController())->index());
$router->post('/productos', static fn (): array => (new ProductosController())->store());
$router->get('/productos/{id}', static fn (array $params): array => (new ProductosController())->show($params));
$router->put('/productos/{id}', static fn (array $params): array => (new ProductosController())->update($params));
$router->delete('/productos/{id}', static fn (array $params): array => (new ProductosController())->destroy($params));

$router->get('/clientes', static fn (): array => (new ClientesController())->index());
$router->post('/clientes', static fn (): array => (new ClientesController())->store());
$router->get('/clientes/{id}', static fn (array $params): array => (new ClientesController())->show($params));
$router->put('/clientes/{id}', static fn (array $params): array => (new ClientesController())->update($params));
$router->delete('/clientes/{id}', static fn (array $params): array => (new ClientesController())->destroy($params));

$router->get('/ventas', static fn (): array => (new VentasController())->index());
$router->post('/ventas', static fn (): array => (new VentasController())->store());
$router->get('/ventas/{id}', static fn (array $params): array => (new VentasController())->show($params));
$router->put('/ventas/{id}', static fn (array $params): array => (new VentasController())->update($params));
$router->delete('/ventas/{id}', static fn (array $params): array => (new VentasController())->destroy($params));

$router->dispatch($method, Request::path());
