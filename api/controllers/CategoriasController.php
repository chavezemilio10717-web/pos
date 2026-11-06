<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class CategoriasController
{
    public function index(): array
    {
        $rows = Database::fetchAll(
            'SELECT c.id, c.nombre, c.descripcion,
                    COUNT(DISTINCT p.id) AS productos,
                    COALESCE(SUM(p.stock), 0) AS stock
             FROM categorias c
             LEFT JOIN productos p ON p.categoria_id = c.id
             GROUP BY c.id, c.nombre, c.descripcion
             ORDER BY c.nombre ASC'
        );

        $items = array_map([$this, 'normalize'], $rows);
        return ['items' => $items, 'total' => count($items)];
    }

    public function show(array $params): array
    {
        $row = Database::fetchOne(
            'SELECT c.id, c.nombre, c.descripcion,
                    COUNT(DISTINCT p.id) AS productos,
                    COALESCE(SUM(p.stock), 0) AS stock
             FROM categorias c
             LEFT JOIN productos p ON p.categoria_id = c.id
             WHERE c.id = ?
             GROUP BY c.id, c.nombre, c.descripcion',
            [(int) $params['id']]
        );

        if ($row === null) {
            throw new HttpException(404, 'La categoría no existe.');
        }

        return $this->normalize($row);
    }

    public function store(): array
    {
        $data = Request::json();
        $validator = new Validator($data);
        $nombre = $validator->string('nombre', 'El nombre', 1, 50);
        $descripcion = $validator->string('descripcion', 'La descripción', 0, 150, false);
        $validator->throwIfErrors();

        $this->assertUniqueName((string) $nombre);

        Database::execute(
            'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
            [$nombre, $descripcion]
        );

        return $this->show(['id' => Database::lastInsertId()]);
    }

    public function update(array $params): array
    {
        $id = (int) $params['id'];
        $this->findOrFail($id);

        $data = Request::json();
        $validator = new Validator($data);
        $nombre = $validator->string('nombre', 'El nombre', 1, 50);
        $descripcion = $validator->string('descripcion', 'La descripción', 0, 150, false);
        $validator->throwIfErrors();

        $this->assertUniqueName((string) $nombre, $id);

        Database::execute(
            'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
            [$nombre, $descripcion, $id]
        );

        return $this->show(['id' => $id]);
    }

    public function destroy(array $params): array
    {
        $id = (int) $params['id'];
        $this->findOrFail($id);

        $count = (int) Database::fetchOne(
            'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?',
            [$id]
        )['total'];

        if ($count > 0) {
            throw new HttpException(
                409,
                "No puedes eliminar esta categoría porque tiene {$count} producto(s) asignado(s)."
            );
        }

        Database::execute('DELETE FROM categorias WHERE id = ?', [$id]);
        return ['id' => $id];
    }

    private function findOrFail(int $id): array
    {
        $row = Database::fetchOne('SELECT * FROM categorias WHERE id = ?', [$id]);
        if ($row === null) {
            throw new HttpException(404, 'La categoría no existe.');
        }
        return $row;
    }

    private function assertUniqueName(string $nombre, ?int $ignoreId = null): void
    {
        $sql = 'SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?)';
        $params = [$nombre];

        if ($ignoreId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $ignoreId;
        }

        if (Database::fetchOne($sql, $params) !== null) {
            throw new ValidationException(
                'Ya existe una categoría con ese nombre.',
                ['nombre' => 'Ya existe una categoría con ese nombre.']
            );
        }
    }

    private function normalize(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'nombre'      => $row['nombre'],
            'descripcion' => $row['descripcion'],
            'productos'   => (int) $row['productos'],
            'stock'       => (int) $row['stock'],
        ];
    }
}
