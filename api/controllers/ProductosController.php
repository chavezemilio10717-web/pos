<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class ProductosController
{
    public function index(): array
    {
        $where = [];
        $params = [];

        $q = trim((string) Request::query('q', ''));
        if ($q !== '') {
            if (mb_strlen($q) > 100) {
                throw new HttpException(422, 'La búsqueda es demasiado larga.');
            }
            $where[] = '(p.nombre LIKE ? OR p.codigo LIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }

        $categoriaId = Request::query('categoria_id');
        if ($categoriaId !== null && $categoriaId !== '') {
            if (!is_numeric($categoriaId) || (int) $categoriaId <= 0) {
                throw new HttpException(422, 'La categoría indicada no es válida.');
            }
            $where[] = 'p.categoria_id = ?';
            $params[] = (int) $categoriaId;
        }

        $estado = (string) Request::query('estado', '');
        if ($estado === 'bajo') {
            $where[] = 'p.stock > 0 AND p.stock <= 10';
        } elseif ($estado === 'agotado') {
            $where[] = 'p.stock = 0';
        } elseif ($estado === 'disponible') {
            $where[] = 'p.stock > 10';
        } elseif ($estado !== '') {
            throw new HttpException(422, 'El estado de stock indicado no es válido.');
        }

        $sql = 'SELECT p.id, p.nombre, p.codigo, p.precio, p.stock, p.categoria_id,
                       c.nombre AS categoria
                FROM productos p
                LEFT JOIN categorias c ON c.id = p.categoria_id';

        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY p.nombre ASC';

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

        $nombre = $validator->string('nombre', 'El nombre', 1, 100);
        $codigo = $validator->string('codigo', 'El código', 1, 50, false);
        $precio = $validator->decimal('precio', 'El precio', 0, 99999999.99);
        $stock = $validator->integer('stock', 'El stock', 0, 1000000);
        $categoriaId = $validator->integer('categoria_id', 'La categoría', 1, null, false);
        $validator->throwIfErrors();

        if ($codigo !== null) {
            $this->assertUniqueCode($codigo);
        }
        if ($categoriaId !== null) {
            $this->assertCategoryExists($categoriaId);
        }

        Database::execute(
            'INSERT INTO productos (nombre, codigo, precio, stock, categoria_id) VALUES (?, ?, ?, ?, ?)',
            [$nombre, $codigo, $precio, $stock, $categoriaId]
        );

        $id = Database::lastInsertId();

        if ($codigo === null) {
            $generated = 'PROD-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
            Database::execute('UPDATE productos SET codigo = ? WHERE id = ?', [$generated, $id]);
        }

        return $this->findOrFail($id);
    }

    public function update(array $params): array
    {
        $id = (int) $params['id'];
        $this->findOrFail($id);

        $data = Request::json();
        $validator = new Validator($data);

        $nombre = $validator->string('nombre', 'El nombre', 1, 100);
        $codigo = $validator->string('codigo', 'El código', 1, 50, false);
        $precio = $validator->decimal('precio', 'El precio', 0, 99999999.99);
        $stock = $validator->integer('stock', 'El stock', 0, 1000000);
        $categoriaId = $validator->integer('categoria_id', 'La categoría', 1, null, false);
        $validator->throwIfErrors();

        if ($codigo !== null) {
            $this->assertUniqueCode($codigo, $id);
        }
        if ($categoriaId !== null) {
            $this->assertCategoryExists($categoriaId);
        }

        Database::execute(
            'UPDATE productos SET nombre = ?, codigo = ?, precio = ?, stock = ?, categoria_id = ? WHERE id = ?',
            [$nombre, $codigo, $precio, $stock, $categoriaId, $id]
        );

        if ($codigo === null) {
            $generated = 'PROD-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
            Database::execute('UPDATE productos SET codigo = ? WHERE id = ?', [$generated, $id]);
        }

        return $this->findOrFail($id);
    }

    public function destroy(array $params): array
    {
        $id = (int) $params['id'];
        $this->findOrFail($id);

        $count = (int) Database::fetchOne(
            'SELECT COUNT(*) AS total FROM detalle_ventas WHERE producto_id = ?',
            [$id]
        )['total'];

        if ($count > 0) {
            throw new HttpException(
                409,
                'Este producto tiene ventas registradas y no puede eliminarse. Puedes dejarlo con stock 0.'
            );
        }

        Database::execute('DELETE FROM productos WHERE id = ?', [$id]);
        return ['id' => $id];
    }

    private function findOrFail(int $id): array
    {
        $row = Database::fetchOne(
            'SELECT p.id, p.nombre, p.codigo, p.precio, p.stock, p.categoria_id,
                    c.nombre AS categoria
             FROM productos p
             LEFT JOIN categorias c ON c.id = p.categoria_id
             WHERE p.id = ?',
            [$id]
        );

        if ($row === null) {
            throw new HttpException(404, 'El producto no existe.');
        }

        return $this->normalize($row);
    }

    private function assertUniqueCode(string $codigo, ?int $ignoreId = null): void
    {
        $sql = 'SELECT id FROM productos WHERE codigo = ?';
        $params = [$codigo];

        if ($ignoreId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $ignoreId;
        }

        if (Database::fetchOne($sql, $params) !== null) {
            throw new ValidationException(
                'Ya existe un producto con ese código.',
                ['codigo' => 'Ya existe un producto con ese código.']
            );
        }
    }

    private function assertCategoryExists(int $categoriaId): void
    {
        if (Database::fetchOne('SELECT id FROM categorias WHERE id = ?', [$categoriaId]) === null) {
            throw new ValidationException(
                'La categoría seleccionada no existe.',
                ['categoria_id' => 'La categoría seleccionada no existe.']
            );
        }
    }

    private function normalize(array $row): array
    {
        $stock = (int) $row['stock'];

        return [
            'id'           => (int) $row['id'],
            'nombre'       => $row['nombre'],
            'codigo'       => $row['codigo'],
            'precio'       => (float) $row['precio'],
            'stock'        => $stock,
            'categoria_id' => $row['categoria_id'] !== null ? (int) $row['categoria_id'] : null,
            'categoria'    => $row['categoria'],
            'estado_stock' => $stock <= 0 ? 'agotado' : ($stock <= 10 ? 'bajo' : 'disponible'),
        ];
    }
}
