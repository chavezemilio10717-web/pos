# Súper POS · Mercado Central

Punto de venta para supermercado: catálogo, clientes, ventas y panel de resumen.
PHP + MariaDB en el backend, JavaScript vanilla en el frontend (sin build step).

## Requisitos

- PHP 8.1 o superior (probado con 8.2.12)
- MariaDB / MySQL (probado con MariaDB 10.4.32)
- Apache con `mod_rewrite` habilitado

## Puesta en marcha

1. Copia la carpeta `supermercado` dentro de `htdocs` de XAMPP.
2. Crea la base de datos y las tablas:

   ```sql
   SOURCE database/schema.sql;
   SOURCE database/seed.sql;
   ```

   O desde una consola con la codificación correcta:

   ```bash
   mysql -u root --default-character-set=utf8mb4 supermercado
   SOURCE C:/ruta/a/supermercado/database/schema.sql;
   SOURCE C:/ruta/a/supermercado/database/seed.sql;
   ```

3. Si la base ya existía y los acentos se guardaron como `??`, aplica una sola vez:

   ```sql
   SOURCE database/fix-encoding.sql;
   ```

4. Configura la conexión en `api/config.php` si tu usuario o contraseña de MariaDB no son `root` / vacío.
5. Abre `http://localhost/supermercado/`.

## Uso

- `Punto de venta` (`#/pos`): busca o escanea productos, ajusta cantidades, elige cliente y cobra.
  `F2` enfoca la búsqueda y `F4` abre el cobro.
- `Panel` (`#/panel`): ventas del día, comparación con ayer, serie de 7 días, más vendidos,
  stock crítico y últimas ventas.
- `Productos`, `Categorías` y `Clientes`: alta, edición, búsqueda y eliminación.
- `Ventas` (`#/ventas`): filtros por fecha, cliente, folio o método de pago; detalle, ticket,
  edición y anulación.

Al anular o editar una venta, el stock se devuelve y se recalcula dentro de una transacción.
El ticket se imprime con el diálogo del navegador y estilos `@media print`.

## API

Base: `http://localhost/supermercado/api`

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servidor y la base |
| GET | `/dashboard` | Métricas del panel |
| GET | `/categorias` | Lista de categorías |
| GET | `/categorias/{id}` | Detalle de categoría |
| POST | `/categorias` | Crear categoría |
| PUT | `/categorias/{id}` | Editar categoría |
| DELETE | `/categorias/{id}` | Eliminar categoría (409 si tiene productos) |
| GET/POST | `/productos` | Listar / crear productos |
| GET/PUT/DELETE | `/productos/{id}` | Detalle / editar / eliminar producto |
| GET/POST | `/clientes` | Listar / crear clientes |
| GET/PUT/DELETE | `/clientes/{id}` | Detalle / editar / eliminar cliente |
| GET/POST | `/ventas` | Listar / registrar ventas |
| GET/PUT/DELETE | `/ventas/{id}` | Detalle / editar / anular venta |

Respuestas correctas: `{ "ok": true, "data": ... }`.
Errores: `{ "ok": false, "message": "...", "errors": { ... } }`.

## Estructura

```
api/                 Front controller, configuración, librerías y controladores
assets/css/app.css   Diseño responsive y estilos de impresión
assets/js/app.js     Router SPA, atajos y shell
assets/js/views/     Vistas: pos, panel, productos, categorías, clientes, ventas
assets/js/api.js     Cliente HTTP de la API
database/            Esquema, datos demo y corrección de codificación
index.php            Shell HTML
```
