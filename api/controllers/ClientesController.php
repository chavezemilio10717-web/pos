<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class ClientesController
{
    private const SELECT = 'SELECT c.id, c.nombre, c.apellido, c.correo, c.telefono,
                                   COUNT(v.id) AS compras,
                                   COALESCE(SUM(v.total), 0) AS total_gastado,
                                   MAX(v.fecha_venta) AS ultima_compra
                            FROM clientes c
                            LEFT JOIN ventas v ON v.cliente_id = c.id';

    public function index(): array
    {
        $where = [];
        $params = [];

        $q = trim((string) Request::query('q', ''));
        if ($q !== '') {
            if (mb_strlen($q) > 100) {
                throw new HttpException(422, 'La búsqueda es demasiado larga.');
            }
            $where[] = '(c.nombre LIKE ? OR c.apellido LIKE ? OR c.correo LIKE ? OR c.telefono LIKE ?)';
            $term = '%' . $q . '%';
            $params = [$term, $term, $term, $term];
        }

        $sql = self::SELECT;
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' GROUP BY c.id, c.nombre, c.apellido, c.correo, c.telefono
                  ORDER BY c.nombre ASC, c.apellido ASC';

        $items = array_map([$this, 'normalize'], Database::fetchAll($sql, $params));
        return ['items' => $items, 'total' => count($items)];
    }

    public function show(array $params): array
    {
        return $this->findOrFail((int) $params['id']);
    }

    public function store(): array
    {
        $data = Request::json();
        $validator = new Validator($data);

        $nombre = $validator->string('nombre', 'El nombre', 1, 50);
        $apellido = $validator->string('apellido', 'El apellido', 1, 50);
        $correo = $validator->email('correo', 'El correo');
        $telefono = $validator->phone('telefono', 'El teléfono');
        $validator->throwIfErrors();

        Database::execute(
            'INSERT INTO clientes (nombre, apellido, correo, telefono) VALUES (?, ?, ?, ?)',
            [$nombre, $apellido, $correo, $telefono]
        );

        return $this->findOrFail(Database::lastInsertId());
    }

    public function update(array $params): array
    {
        $id = (int) $params['id'];
        $this->findOrFail($id);

        $data = Request::json();
        $validator = new Validator($data);

        $nombre = $validator->string('nombre', 'El nombre', 1, 50);
        $apellido = $validator->string('apellido', 'El apellido', 1, 50);
        $correo = $validator->email('correo', 'El correo');
        $telefono = $validator->phone('telefono', 'El teléfono');
        $validator->throwIfErrors();

        Database::execute(
            'UPDATE clientes SET nombre = ?, apellido = ?, correo = ?, telefono = ? WHERE id = ?',
            [$nombre, $apellido, $correo, $telefono, $id]
        );

        return $this->findOrFail($id);
    }

    public function destroy(array $params): array
    {
        $id = (int) $params['id'];
        $this->findOrFail($id);

        $count = (int) Database::fetchOne(
            'SELECT COUNT(*) AS total FROM ventas WHERE cliente_id = ?',
            [$id]
        )['total'];

        if ($count > 0) {
            throw new HttpException(
                409,
                "Este cliente tiene {$count} venta(s) registrada(s) y no puede eliminarse."
            );
        }

        Database::execute('DELETE FROM clientes WHERE id = ?', [$id]);
        return ['id' => $id];
    }

    private function findOrFail(int $id): array
    {
        $row = Database::fetchOne(
            self::SELECT . ' WHERE c.id = ?
             GROUP BY c.id, c.nombre, c.apellido, c.correo, c.telefono',
            [$id]
        );

        if ($row === null) {
            throw new HttpException(404, 'El cliente no existe.');
        }

        return $this->normalize($row);
    }

    private function normalize(array $row): array
    {
        return [
            'id'            => (int) $row['id'],
            'nombre'        => $row['nombre'],
            'apellido'      => $row['apellido'],
            'correo'        => $row['correo'],
            'telefono'      => $row['telefono'],
            'compras'       => (int) $row['compras'],
            'total_gastado' => (float) $row['total_gastado'],
            'ultima_compra' => $row['ultima_compra'],
            'nombre_completo' => trim($row['nombre'] . ' ' . $row['apellido']),
        ];
    }
}
