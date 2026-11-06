<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class VentasController
{
    private const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia'];

    private const SALE_SELECT = 'SELECT v.id, v.cliente_id, v.fecha_venta, v.total, v.metodo_pago,
                                        c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
                                        c.correo AS cliente_correo, c.telefono AS cliente_telefono,
                                        COALESCE(SUM(d.cantidad), 0) AS articulos
                                 FROM ventas v
                                 LEFT JOIN clientes c ON c.id = v.cliente_id
                                 LEFT JOIN detalle_ventas d ON d.venta_id = v.id';

    public function index(): array
    {
        $where = [];
        $params = [];

        $desde = (string) Request::query('desde', '');
        $hasta = (string) Request::query('hasta', '');

        if ($desde !== '') {
            $this->assertDate($desde, 'La fecha inicial');
            $where[] = 'DATE(v.fecha_venta) >= ?';
            $params[] = $desde;
        }
        if ($hasta !== '') {
            $this->assertDate($hasta, 'La fecha final');
            $where[] = 'DATE(v.fecha_venta) <= ?';
            $params[] = $hasta;
        }
        if ($desde !== '' && $hasta !== '' && $desde > $hasta) {
            throw new HttpException(422, 'La fecha inicial no puede ser posterior a la fecha final.');
        }

        $q = trim((string) Request::query('q', ''));
        if ($q !== '') {
            if (mb_strlen($q) > 100) {
                throw new HttpException(422, 'La búsqueda es demasiado larga.');
            }
            $where[] = '(CAST(v.id AS CHAR) LIKE ? OR CONCAT_WS(" ", c.nombre, c.apellido) LIKE ?)';
            $term = '%' . $q . '%';
            $params[] = $term;
            $params[] = $term;
        }

        $clienteId = Request::query('cliente_id');
        if ($clienteId !== null && $clienteId !== '') {
            if (!is_numeric($clienteId) || (int) $clienteId <= 0) {
                throw new HttpException(422, 'El cliente indicado no es válido.');
            }
            $where[] = 'v.cliente_id = ?';
            $params[] = (int) $clienteId;
        }

        $metodoPago = (string) Request::query('metodo_pago', '');
        if ($metodoPago !== '') {
            if (!in_array($metodoPago, self::PAYMENT_METHODS, true)) {
                throw new HttpException(422, 'El método de pago indicado no es válido.');
            }
            $where[] = 'v.metodo_pago = ?';
            $params[] = $metodoPago;
        }

        $limit = (int) Request::query('limit', 200);
        $limit = max(1, min(500, $limit));

        $sql = 'SELECT v.id, v.cliente_id, v.fecha_venta, v.total, v.metodo_pago,
                       CONCAT_WS(" ", c.nombre, c.apellido) AS cliente,
                       COALESCE(SUM(d.cantidad), 0) AS articulos,
                       COUNT(d.id) AS lineas
                FROM ventas v
                LEFT JOIN clientes c ON c.id = v.cliente_id
                LEFT JOIN detalle_ventas d ON d.venta_id = v.id';

        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' GROUP BY v.id, v.cliente_id, v.fecha_venta, v.total, v.metodo_pago, c.nombre, c.apellido
                  ORDER BY v.fecha_venta DESC, v.id DESC
                  LIMIT ' . $limit;

        $rows = Database::fetchAll($sql, $params);
        $items = array_map(static function (array $row): array {
            return [
                'id'          => (int) $row['id'],
                'cliente_id'  => $row['cliente_id'] !== null ? (int) $row['cliente_id'] : null,
                'cliente'     => $row['cliente'] !== null && trim($row['cliente']) !== ''
                    ? trim($row['cliente'])
                    : 'Público general',
                'fecha_venta' => $row['fecha_venta'],
                'total'       => (float) $row['total'],
                'metodo_pago' => $row['metodo_pago'],
                'articulos'   => (int) $row['articulos'],
                'lineas'      => (int) $row['lineas'],
            ];
        }, $rows);

        return ['items' => $items, 'total' => count($items)];
    }

    public function show(array $params): array
    {
        return $this->findSale((int) $params['id']);
    }

    public function store(): array
    {
        $data = Request::json();
        $validator = new Validator($data);

        $clienteId = $validator->integer('cliente_id', 'El cliente', 1, null, false);
        $metodoPago = $validator->enum(
            'metodo_pago',
            'El método de pago',
            self::PAYMENT_METHODS,
            'efectivo'
        );
        $validator->throwIfErrors();

        if ($clienteId !== null) {
            $this->assertClientExists($clienteId);
        }

        $items = $this->parseItems($data['items'] ?? null);

        Database::pdo()->beginTransaction();
        try {
            Database::execute(
                'INSERT INTO ventas (cliente_id, total, metodo_pago) VALUES (?, 0, ?)',
                [$clienteId, $metodoPago]
            );
            $ventaId = Database::lastInsertId();
            $total = $this->applyItems($ventaId, $items);
            Database::execute('UPDATE ventas SET total = ? WHERE id = ?', [$total, $ventaId]);
            Database::pdo()->commit();
        } catch (Throwable $e) {
            if (Database::pdo()->inTransaction()) {
                Database::pdo()->rollBack();
            }
            throw $e;
        }

        return $this->findSale($ventaId);
    }

    public function update(array $params): array
    {
        $id = (int) $params['id'];
        $current = $this->findSale($id);

        $data = Request::json();
        $validator = new Validator([]);

        $clienteId = $current['cliente_id'];
        if (Request::has($data, 'cliente_id')) {
            $clienteId = $validator->integer('cliente_id', 'El cliente', 1, null, false);
        }

        $metodoPago = $current['metodo_pago'];
        if (Request::has($data, 'metodo_pago')) {
            $metodoPago = $validator->enum(
                'metodo_pago',
                'El método de pago',
                self::PAYMENT_METHODS,
                $current['metodo_pago']
            );
        }

        $validator->throwIfErrors();

        if (Request::has($data, 'cliente_id') && $clienteId !== null) {
            $this->assertClientExists($clienteId);
        }

        $itemsProvided = Request::has($data, 'items');
        $items = $itemsProvided ? $this->parseItems($data['items']) : [];

        Database::pdo()->beginTransaction();
        try {
            Database::fetchOne('SELECT id FROM ventas WHERE id = ? FOR UPDATE', [$id]);

            $total = $current['total'];
            if ($itemsProvided) {
                $this->restoreStock($id);
                Database::execute('DELETE FROM detalle_ventas WHERE venta_id = ?', [$id]);
                $total = $this->applyItems($id, $items);
            }

            Database::execute(
                'UPDATE ventas SET cliente_id = ?, metodo_pago = ?, total = ? WHERE id = ?',
                [$clienteId, $metodoPago, $total, $id]
            );

            Database::pdo()->commit();
        } catch (Throwable $e) {
            if (Database::pdo()->inTransaction()) {
                Database::pdo()->rollBack();
            }
            throw $e;
        }

        return $this->findSale($id);
    }

    public function destroy(array $params): array
    {
        $id = (int) $params['id'];
        $this->findSale($id);

        Database::pdo()->beginTransaction();
        try {
            Database::fetchOne('SELECT id FROM ventas WHERE id = ? FOR UPDATE', [$id]);
            $this->restoreStock($id);
            Database::execute('DELETE FROM ventas WHERE id = ?', [$id]);
            Database::pdo()->commit();
        } catch (Throwable $e) {
            if (Database::pdo()->inTransaction()) {
                Database::pdo()->rollBack();
            }
            throw $e;
        }

        return ['id' => $id];
    }

    private function parseItems(mixed $rawItems): array
    {
        if (!is_array($rawItems) || $rawItems === []) {
            throw new ValidationException(
                'La venta debe incluir al menos un producto.',
                ['items' => 'Agrega al menos un producto a la venta.']
            );
        }

        $errors = [];
        $normalized = [];

        foreach (array_values($rawItems) as $index => $item) {
            if (!is_array($item)) {
                $errors['items'] = 'Las líneas de la venta no son válidas.';
                break;
            }

            $productoId = filter_var($item['producto_id'] ?? null, FILTER_VALIDATE_INT);
            $cantidad = filter_var($item['cantidad'] ?? null, FILTER_VALIDATE_INT);

            if ($productoId === false || $productoId <= 0) {
                $errors['items'] = 'Hay un producto no válido en la venta.';
                break;
            }
            if ($cantidad === false || $cantidad <= 0) {
                $errors['items'] = 'Las cantidades deben ser números enteros mayores a cero.';
                break;
            }

            if (isset($normalized[$productoId])) {
                $normalized[$productoId]['cantidad'] += (int) $cantidad;
            } else {
                $normalized[$productoId] = [
                    'producto_id' => (int) $productoId,
                    'cantidad'    => (int) $cantidad,
                ];
            }
        }

        if ($errors !== []) {
            throw new ValidationException('Revisa los productos de la venta.', $errors);
        }

        ksort($normalized);
        return array_values($normalized);
    }

    private function applyItems(int $ventaId, array $items): float
    {
        $total = 0.0;

        foreach ($items as $item) {
            $product = Database::fetchOne(
                'SELECT id, nombre, precio, stock FROM productos WHERE id = ? FOR UPDATE',
                [$item['producto_id']]
            );

            if ($product === null) {
                throw new ValidationException(
                    'Uno de los productos ya no existe.',
                    ['items' => 'Uno de los productos ya no existe o fue eliminado.']
                );
            }

            $available = (int) $product['stock'];
            if ($item['cantidad'] > $available) {
                throw new ValidationException(
                    "Stock insuficiente de {$product['nombre']}.",
                    ['items' => "Stock insuficiente de {$product['nombre']} (disponible: {$available})."]
                );
            }

            $price = (float) $product['precio'];
            $subtotal = round($price * $item['cantidad'], 2);

            Database::execute(
                'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)',
                [$ventaId, $item['producto_id'], $item['cantidad'], $price, $subtotal]
            );

            Database::execute(
                'UPDATE productos SET stock = stock - ? WHERE id = ?',
                [$item['cantidad'], $item['producto_id']]
            );

            $total += $subtotal;
        }

        return round($total, 2);
    }

    private function restoreStock(int $ventaId): void
    {
        $details = Database::fetchAll(
            'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?',
            [$ventaId]
        );

        foreach ($details as $detail) {
            Database::execute(
                'UPDATE productos SET stock = stock + ? WHERE id = ?',
                [(int) $detail['cantidad'], (int) $detail['producto_id']]
            );
        }
    }

    private function findSale(int $id): array
    {
        $row = Database::fetchOne(
            self::SALE_SELECT . ' WHERE v.id = ?
             GROUP BY v.id, v.cliente_id, v.fecha_venta, v.total, v.metodo_pago,
                      c.nombre, c.apellido, c.correo, c.telefono',
            [$id]
        );

        if ($row === null) {
            throw new HttpException(404, 'La venta no existe.');
        }

        $details = Database::fetchAll(
            'SELECT d.id, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal,
                    p.nombre AS producto, p.codigo
             FROM detalle_ventas d
             INNER JOIN productos p ON p.id = d.producto_id
             WHERE d.venta_id = ?
             ORDER BY d.id ASC',
            [$id]
        );

        $clienteNombre = trim((string) ($row['cliente_nombre'] ?? '') . ' ' . (string) ($row['cliente_apellido'] ?? ''));

        return [
            'id'          => (int) $row['id'],
            'cliente_id'  => $row['cliente_id'] !== null ? (int) $row['cliente_id'] : null,
            'cliente'     => $clienteNombre !== '' ? $clienteNombre : 'Público general',
            'cliente_info' => $row['cliente_id'] !== null ? [
                'nombre'   => $row['cliente_nombre'],
                'apellido' => $row['cliente_apellido'],
                'correo'   => $row['cliente_correo'],
                'telefono' => $row['cliente_telefono'],
            ] : null,
            'fecha_venta' => $row['fecha_venta'],
            'total'       => (float) $row['total'],
            'metodo_pago' => $row['metodo_pago'],
            'articulos'   => (int) $row['articulos'],
            'detalles'    => array_map(static function (array $detail): array {
                return [
                    'id'              => (int) $detail['id'],
                    'producto_id'     => (int) $detail['producto_id'],
                    'producto'        => $detail['producto'],
                    'codigo'          => $detail['codigo'],
                    'cantidad'        => (int) $detail['cantidad'],
                    'precio_unitario' => (float) $detail['precio_unitario'],
                    'subtotal'        => (float) $detail['subtotal'],
                ];
            }, $details),
        ];
    }

    private function assertClientExists(int $clienteId): void
    {
        if (Database::fetchOne('SELECT id FROM clientes WHERE id = ?', [$clienteId]) === null) {
            throw new ValidationException(
                'El cliente seleccionado no existe.',
                ['cliente_id' => 'El cliente seleccionado no existe.']
            );
        }
    }

    private function assertDate(string $date, string $label): void
    {
        $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            throw new HttpException(422, "{$label} debe tener el formato AAAA-MM-DD.");
        }
    }
}
