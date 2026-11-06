<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class DashboardController
{
    public function index(): array
    {
        $hoy = Database::fetchOne(
            'SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS ingresos
             FROM ventas WHERE DATE(fecha_venta) = CURDATE()'
        ) ?? ['ventas' => 0, 'ingresos' => 0];

        $ayer = Database::fetchOne(
            'SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS ingresos
             FROM ventas WHERE DATE(fecha_venta) = (CURDATE() - INTERVAL 1 DAY)'
        ) ?? ['ventas' => 0, 'ingresos' => 0];

        $productos = Database::fetchOne(
            'SELECT COUNT(*) AS total,
                    COALESCE(SUM(stock), 0) AS unidades,
                    COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0) AS agotados,
                    COALESCE(SUM(CASE WHEN stock > 0 AND stock <= 10 THEN 1 ELSE 0 END), 0) AS bajo_stock,
                    COALESCE(SUM(precio * stock), 0) AS valor_inventario
             FROM productos'
        ) ?? [];

        $clientes = Database::fetchOne('SELECT COUNT(*) AS total FROM clientes') ?? ['total' => 0];

        $ventasHoy = (int) $hoy['ventas'];
        $ingresosHoy = (float) $hoy['ingresos'];

        $serie = $this->salesSeries();
        $topProductos = Database::fetchAll(
            'SELECT p.id, p.nombre, SUM(d.cantidad) AS cantidad, SUM(d.subtotal) AS ingresos
             FROM detalle_ventas d
             INNER JOIN productos p ON p.id = d.producto_id
             INNER JOIN ventas v ON v.id = d.venta_id
             WHERE v.fecha_venta >= (CURDATE() - INTERVAL 29 DAY)
             GROUP BY p.id, p.nombre
             ORDER BY cantidad DESC, ingresos DESC
             LIMIT 5'
        );

        $bajoStock = Database::fetchAll(
            'SELECT id, nombre, codigo, stock, precio
             FROM productos
             WHERE stock <= 10
             ORDER BY stock ASC, nombre ASC
             LIMIT 8'
        );

        $ultimas = Database::fetchAll(
            'SELECT v.id, v.fecha_venta, v.total, v.metodo_pago,
                    CONCAT_WS(" ", c.nombre, c.apellido) AS cliente
             FROM ventas v
             LEFT JOIN clientes c ON c.id = v.cliente_id
             ORDER BY v.fecha_venta DESC, v.id DESC
             LIMIT 6'
        );

        return [
            'hoy' => [
                'ventas'          => $ventasHoy,
                'ingresos'        => $ingresosHoy,
                'ticket_promedio' => $ventasHoy > 0 ? round($ingresosHoy / $ventasHoy, 2) : 0.0,
            ],
            'ayer' => [
                'ventas'   => (int) $ayer['ventas'],
                'ingresos' => (float) $ayer['ingresos'],
            ],
            'productos' => [
                'total'            => (int) ($productos['total'] ?? 0),
                'unidades'         => (int) ($productos['unidades'] ?? 0),
                'agotados'         => (int) ($productos['agotados'] ?? 0),
                'bajo_stock'       => (int) ($productos['bajo_stock'] ?? 0),
                'valor_inventario' => (float) ($productos['valor_inventario'] ?? 0),
            ],
            'clientes' => ['total' => (int) $clientes['total']],
            'serie_7_dias' => $serie,
            'top_productos' => array_map(static fn (array $row): array => [
                'id'       => (int) $row['id'],
                'nombre'   => $row['nombre'],
                'cantidad' => (int) $row['cantidad'],
                'ingresos' => (float) $row['ingresos'],
            ], $topProductos),
            'bajo_stock' => array_map(static fn (array $row): array => [
                'id'     => (int) $row['id'],
                'nombre' => $row['nombre'],
                'codigo' => $row['codigo'],
                'stock'  => (int) $row['stock'],
                'precio' => (float) $row['precio'],
            ], $bajoStock),
            'ultimas_ventas' => array_map(static fn (array $row): array => [
                'id'          => (int) $row['id'],
                'cliente'     => $row['cliente'] !== null && trim($row['cliente']) !== ''
                    ? trim($row['cliente'])
                    : 'Público general',
                'fecha_venta' => $row['fecha_venta'],
                'total'       => (float) $row['total'],
                'metodo_pago' => $row['metodo_pago'],
            ], $ultimas),
        ];
    }

    private function salesSeries(): array
    {
        $start = new DateTimeImmutable('today -6 days');
        $series = [];

        for ($i = 0; $i < 7; $i++) {
            $date = $start->modify("+{$i} days")->format('Y-m-d');
            $series[$date] = [
                'fecha'  => $date,
                'ventas' => 0,
                'total'  => 0.0,
            ];
        }

        $rows = Database::fetchAll(
            'SELECT DATE(fecha_venta) AS fecha, COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS total
             FROM ventas
             WHERE fecha_venta >= (CURDATE() - INTERVAL 6 DAY)
             GROUP BY DATE(fecha_venta)
             ORDER BY fecha ASC'
        );

        foreach ($rows as $row) {
            $date = $row['fecha'];
            if (isset($series[$date])) {
                $series[$date]['ventas'] = (int) $row['ventas'];
                $series[$date]['total'] = (float) $row['total'];
            }
        }

        return array_values($series);
    }
}
