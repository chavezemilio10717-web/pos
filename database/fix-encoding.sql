-- ============================================================
--  Súper POS · Corrección de acentos
--  El seed original se importó con una codificación de consola
--  que reemplazó los acentos por "??". Este script restaura los
--  textos sin alterar precios, stock ni relaciones.
--
--  Ejecutar:
--    mysql -u root supermercado < database/fix-encoding.sql
-- ============================================================

USE supermercado;

SET NAMES utf8mb4;

-- Categorías -------------------------------------------------------
UPDATE categorias SET nombre = 'Lácteos y huevos', descripcion = 'Leche, quesos, yogurt y huevo' WHERE id = 3;
UPDATE categorias SET nombre = 'Panadería', descripcion = 'Pan recién horneado y tortillas' WHERE id = 4;
UPDATE categorias SET descripcion = 'Aguas, refrescos, café y cerveza' WHERE id = 5;
UPDATE categorias SET descripcion = 'Granos, aceites, enlatados y básicos' WHERE id = 6;
UPDATE categorias SET descripcion = 'Detergentes y artículos para el hogar' WHERE id = 7;

-- Productos --------------------------------------------------------
UPDATE productos SET nombre = 'Plátano' WHERE id = 2;
UPDATE productos SET nombre = 'Limón' WHERE id = 5;
UPDATE productos SET nombre = 'Salmón fresco' WHERE id = 12;
UPDATE productos SET nombre = 'Camarón limpio' WHERE id = 13;
UPDATE productos SET nombre = 'Crema ácida 450 g' WHERE id = 19;
UPDATE productos SET nombre = 'Tortillas de maíz 1 kg' WHERE id = 23;
UPDATE productos SET nombre = 'Café molido 500 g' WHERE id = 27;
UPDATE productos SET nombre = 'Té verde 20 sobres' WHERE id = 28;
UPDATE productos SET nombre = 'Azúcar 1 kg' WHERE id = 35;
UPDATE productos SET nombre = 'Atún en agua 140 g' WHERE id = 36;
UPDATE productos SET nombre = 'Jabón para trastes 750 ml' WHERE id = 40;
UPDATE productos SET nombre = 'Papel higiénico 4 rollos' WHERE id = 41;
UPDATE productos SET nombre = 'Jabón de tocador 3 pzas' WHERE id = 45;

-- Clientes ---------------------------------------------------------
UPDATE clientes SET nombre = 'María', apellido = 'García López' WHERE id = 1;
UPDATE clientes SET nombre = 'José', apellido = 'Martínez Pérez' WHERE id = 2;
UPDATE clientes SET nombre = 'Ana', apellido = 'Fernández Ruiz' WHERE id = 3;
UPDATE clientes SET nombre = 'Carlos', apellido = 'López Sánchez' WHERE id = 4;
UPDATE clientes SET nombre = 'Laura', apellido = 'Torres Ramírez' WHERE id = 5;
UPDATE clientes SET nombre = 'Miguel Ángel', apellido = 'Díaz' WHERE id = 6;
UPDATE clientes SET nombre = 'Sofía', apellido = 'Hernández Cruz' WHERE id = 7;
UPDATE clientes SET nombre = 'Jorge', apellido = 'Ramírez Flores' WHERE id = 8;
