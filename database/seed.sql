-- ============================================================
--  Súper POS · Datos de demostración
--  Ejecutar después de schema.sql:
--    mysql -u root supermercado < database/seed.sql
--  Es idempotente: no duplica categorías, productos ni clientes.
-- ============================================================

USE supermercado;

-- Categorías -------------------------------------------------------
INSERT INTO categorias (nombre, descripcion)
SELECT 'Frutas y verduras', 'Productos frescos de temporada'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Frutas y verduras');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Carnes y pescados', 'Cortes frescos y mariscos'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Carnes y pescados');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Lácteos y huevos', 'Leche, quesos, yogurt y huevo'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Lácteos y huevos');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Panadería', 'Pan recién horneado y tortillas'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Panadería');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Bebidas', 'Aguas, refrescos, café y cerveza'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Bebidas');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Despensa', 'Granos, aceites, enlatados y básicos'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Despensa');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Limpieza', 'Detergentes y artículos para el hogar'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Limpieza');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Cuidado personal', 'Higiene y cuidado diario'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Cuidado personal');

-- Productos --------------------------------------------------------
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Manzana roja', '7501000000011', 45.90, 60, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000011');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Plátano', '7501000000028', 24.90, 80, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000028');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Tomate saladet', '7501000000035', 32.50, 45, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000035');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Aguacate hass', '7501000000042', 89.90, 30, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000042');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Limón', '7501000000059', 28.90, 50, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000059');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Zanahoria', '7501000000066', 19.90, 70, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000066');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Cebolla blanca', '7501000000073', 26.90, 55, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000073');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Papa blanca', '7501000000080', 34.90, 65, id FROM categorias WHERE nombre = 'Frutas y verduras'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000080');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Pechuga de pollo', '7501000000097', 129.90, 25, id FROM categorias WHERE nombre = 'Carnes y pescados'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000097');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Carne molida de res', '7501000000103', 149.90, 18, id FROM categorias WHERE nombre = 'Carnes y pescados'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000103');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Chuleta de cerdo', '7501000000110', 139.90, 15, id FROM categorias WHERE nombre = 'Carnes y pescados'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000110');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Salmón fresco', '7501000000127', 289.90, 0, id FROM categorias WHERE nombre = 'Carnes y pescados'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000127');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Camarón limpio', '7501000000134', 249.90, 10, id FROM categorias WHERE nombre = 'Carnes y pescados'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000134');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Leche entera 1 L', '7501000000141', 26.50, 48, id FROM categorias WHERE nombre = 'Lácteos y huevos'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000141');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Yogurt natural 900 g', '7501000000158', 38.90, 30, id FROM categorias WHERE nombre = 'Lácteos y huevos'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000158');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Queso panela 400 g', '7501000000165', 62.90, 22, id FROM categorias WHERE nombre = 'Lácteos y huevos'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000165');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Huevo blanco 18 pzas', '7501000000172', 54.90, 40, id FROM categorias WHERE nombre = 'Lácteos y huevos'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000172');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Mantequilla 90 g', '7501000000189', 24.90, 35, id FROM categorias WHERE nombre = 'Lácteos y huevos'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000189');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Crema ácida 450 g', '7501000000196', 34.50, 20, id FROM categorias WHERE nombre = 'Lácteos y huevos'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000196');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Pan blanco grande', '7501000000202', 48.90, 25, id FROM categorias WHERE nombre = 'Panadería'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000202');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Bolillo 5 pzas', '7501000000219', 12.50, 40, id FROM categorias WHERE nombre = 'Panadería'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000219');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Croissant 3 pzas', '7501000000226', 35.90, 18, id FROM categorias WHERE nombre = 'Panadería'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000226');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Tortillas de maíz 1 kg', '7501000000233', 24.90, 50, id FROM categorias WHERE nombre = 'Panadería'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000233');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Agua purificada 1.5 L', '7501000000240', 14.90, 60, id FROM categorias WHERE nombre = 'Bebidas'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000240');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Refresco de cola 2 L', '7501000000257', 36.90, 45, id FROM categorias WHERE nombre = 'Bebidas'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000257');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Jugo de naranja 1 L', '7501000000264', 32.90, 28, id FROM categorias WHERE nombre = 'Bebidas'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000264');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Café molido 500 g', '7501000000271', 118.90, 20, id FROM categorias WHERE nombre = 'Bebidas'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000271');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Té verde 20 sobres', '7501000000288', 42.90, 25, id FROM categorias WHERE nombre = 'Bebidas'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000288');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Cerveza lager 6 pzas', '7501000000295', 89.90, 6, id FROM categorias WHERE nombre = 'Bebidas'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000295');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Arroz 1 kg', '7501000000301', 32.90, 40, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000301');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Frijol negro 1 kg', '7501000000318', 38.90, 35, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000318');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Aceite vegetal 1 L', '7501000000325', 45.90, 30, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000325');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Pasta espagueti 500 g', '7501000000332', 21.90, 45, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000332');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Sal de mesa 1 kg', '7501000000349', 12.90, 50, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000349');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Azúcar 1 kg', '7501000000356', 29.90, 38, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000356');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Atún en agua 140 g', '7501000000363', 18.90, 55, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000363');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Salsa de tomate 400 g', '7501000000370', 16.90, 42, id FROM categorias WHERE nombre = 'Despensa'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000370');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Detergente 1 kg', '7501000000387', 52.90, 25, id FROM categorias WHERE nombre = 'Limpieza'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000387');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Cloro 1 L', '7501000000394', 24.90, 30, id FROM categorias WHERE nombre = 'Limpieza'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000394');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Jabón para trastes 750 ml', '7501000000400', 38.90, 28, id FROM categorias WHERE nombre = 'Limpieza'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000400');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Papel higiénico 4 rollos', '7501000000417', 32.90, 40, id FROM categorias WHERE nombre = 'Limpieza'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000417');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Bolsas para basura 10 pzas', '7501000000424', 27.90, 35, id FROM categorias WHERE nombre = 'Limpieza'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000424');

INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Shampoo 750 ml', '7501000000431', 89.90, 18, id FROM categorias WHERE nombre = 'Cuidado personal'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000431');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Pasta dental 100 ml', '7501000000448', 32.90, 30, id FROM categorias WHERE nombre = 'Cuidado personal'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000448');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Jabón de tocador 3 pzas', '7501000000455', 29.90, 25, id FROM categorias WHERE nombre = 'Cuidado personal'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000455');
INSERT INTO productos (nombre, codigo, precio, stock, categoria_id)
SELECT 'Desodorante 150 ml', '7501000000462', 54.90, 20, id FROM categorias WHERE nombre = 'Cuidado personal'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '7501000000462');

-- Clientes ---------------------------------------------------------
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'María', 'García López', 'maria.garcia@example.com', '5551234567'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'maria.garcia@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'José', 'Martínez Pérez', 'jose.martinez@example.com', '5552345678'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'jose.martinez@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'Ana', 'Fernández Ruiz', 'ana.fernandez@example.com', '5553456789'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'ana.fernandez@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'Carlos', 'López Sánchez', 'carlos.lopez@example.com', '5554567890'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'carlos.lopez@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'Laura', 'Torres Ramírez', 'laura.torres@example.com', '5555678901'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'laura.torres@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'Miguel Ángel', 'Díaz', 'miguel.diaz@example.com', '5556789012'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'miguel.diaz@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'Sofía', 'Hernández Cruz', 'sofia.hernandez@example.com', '5557890123'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'sofia.hernandez@example.com');
INSERT INTO clientes (nombre, apellido, correo, telefono)
SELECT 'Jorge', 'Ramírez Flores', 'jorge.ramirez@example.com', '5558901234'
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE correo = 'jorge.ramirez@example.com');
