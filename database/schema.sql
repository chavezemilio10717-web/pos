-- ============================================================
--  Súper POS · Esquema de base de datos
--  Compatible con MariaDB 10.4+ / MySQL 8
--  Ejecutar: mysql -u root supermercado < database/schema.sql
--  (No elimina información existente)
-- ============================================================

CREATE DATABASE IF NOT EXISTS supermercado
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE supermercado;

-- Tablas originales ------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id          INT(11) NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(50) NOT NULL,
  descripcion VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS clientes (
  id       INT(11) NOT NULL AUTO_INCREMENT,
  nombre   VARCHAR(50) NOT NULL,
  apellido VARCHAR(50) NOT NULL,
  correo   VARCHAR(100) DEFAULT NULL,
  telefono VARCHAR(15) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS productos (
  id           INT(11) NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  precio       DECIMAL(10,2) NOT NULL,
  stock        INT(11) NOT NULL DEFAULT 0,
  categoria_id INT(11) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY categoria_id (categoria_id),
  CONSTRAINT productos_ibfk_1 FOREIGN KEY (categoria_id)
    REFERENCES categorias (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS ventas (
  id          INT(11) NOT NULL AUTO_INCREMENT,
  cliente_id  INT(11) DEFAULT NULL,
  fecha_venta TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  total       DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY cliente_id (cliente_id),
  CONSTRAINT ventas_ibfk_1 FOREIGN KEY (cliente_id)
    REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Mejoras para el punto de venta ----------------------------------
-- Código de barras / SKU del producto
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) DEFAULT NULL AFTER nombre;

CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_codigo
  ON productos (codigo);

-- Forma de pago de la venta
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo' AFTER total;

-- Detalle (líneas) de cada venta
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id              INT(11) NOT NULL AUTO_INCREMENT,
  venta_id        INT(11) NOT NULL,
  producto_id     INT(11) NOT NULL,
  cantidad        INT(11) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_detalle_venta (venta_id),
  KEY idx_detalle_producto (producto_id),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id)
    REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
