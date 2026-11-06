<?php
declare(strict_types=1);

$config = require __DIR__ . '/api/config.php';
$app = $config['app'];
$store = htmlspecialchars($app['store'], ENT_QUOTES, 'UTF-8');
$currency = htmlspecialchars($app['currency'], ENT_QUOTES, 'UTF-8');
$locale = htmlspecialchars($app['locale'], ENT_QUOTES, 'UTF-8');
$version = htmlspecialchars($app['version'], ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#0f3d27">
    <meta name="description" content="<?= $store ?> · Sistema punto de venta para supermercado">
    <title><?= $store ?> · Súper POS</title>
    <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="assets/css/app.css?v=<?= $version ?>">
</head>
<body>
    <a class="skip-link" href="#view">Saltar al contenido</a>

    <div class="app-shell">
        <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
            <div class="brand">
                <span class="brand-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l1.5-5h15L21 9"></path>
                        <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"></path>
                        <path d="M3 9h18"></path>
                        <path d="M8 13h8"></path>
                    </svg>
                </span>
                <span class="brand-text">
                    <strong><?= $store ?></strong>
                    <span>Súper POS</span>
                </span>
                <button class="sidebar-close icon-btn" id="sidebarClose" type="button" aria-label="Cerrar menú">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
            </div>

            <nav class="nav">
                <span class="nav-label">Operación</span>
                <a class="nav-item" href="#/pos" data-nav="pos">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l2.4 12.4A2 2 0 0 0 9.36 17H18a2 2 0 0 0 1.96-1.6L21.5 7H6"></path><circle cx="9.5" cy="20.5" r="1"></circle><circle cx="18.5" cy="20.5" r="1"></circle></svg>
                    <span>Punto de venta</span>
                    <kbd>F2</kbd>
                </a>
                <a class="nav-item" href="#/panel" data-nav="panel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="16" width="7" height="5" rx="1.5"></rect></svg>
                    <span>Panel</span>
                </a>

                <span class="nav-label">Catálogo</span>
                <a class="nav-item" href="#/productos" data-nav="productos">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path></svg>
                    <span>Productos</span>
                </a>
                <a class="nav-item" href="#/categorias" data-nav="categorias">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1 0-2.8l7.2-7.2a2 2 0 0 1 2.8 0l7.2 7.2a2 2 0 0 1 0 2.8z"></path><circle cx="8" cy="8" r="1.5"></circle></svg>
                    <span>Categorías</span>
                </a>
                <a class="nav-item" href="#/clientes" data-nav="clientes">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Clientes</span>
                </a>

                <span class="nav-label">Historial</span>
                <a class="nav-item" href="#/ventas" data-nav="ventas">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-2 2-3-2-3 2-2-2-3 2V4a1 1 0 0 1 1-1z"></path><path d="M8 8h8M8 12h8M8 16h5"></path></svg>
                    <span>Ventas</span>
                </a>
            </nav>

            <div class="sidebar-foot">
                <div class="shift-card">
                    <span class="pulse-dot" aria-hidden="true"></span>
                    <span>
                        <strong>Caja 01</strong>
                        <small>Turno abierto</small>
                    </span>
                </div>
                <button class="cashier-card" id="cashierBtn" type="button" title="Cambiar nombre del cajero">
                    <span class="avatar" id="cashierAvatar">C</span>
                    <span class="cashier-info">
                        <strong id="cashierName">Cajero</strong>
                        <small>Cambiar cajero</small>
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>
                </button>
            </div>
        </aside>

        <div class="sidebar-backdrop" id="sidebarBackdrop" hidden></div>

        <div class="app-main">
            <header class="topbar">
                <button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>

                <div class="topbar-title">
                    <span id="pageEyebrow">Operación</span>
                    <h1 id="pageTitle">Punto de venta</h1>
                </div>

                <div class="topbar-meta">
                    <div class="clock" aria-live="off">
                        <span id="currentDate">—</span>
                        <strong id="currentTime">—</strong>
                    </div>
                    <span class="topbar-divider" aria-hidden="true"></span>
                    <button class="user-chip" id="userChip" type="button" title="Cambiar cajero">
                        <span class="avatar avatar-sm" id="topAvatar">C</span>
                        <span>
                            <small>Cajero</small>
                            <strong id="topCashier">Cajero</strong>
                        </span>
                    </button>
                </div>
            </header>

            <main class="view" id="view" tabindex="-1">
                <div class="page-loader" role="status" aria-live="polite">
                    <span class="spinner" aria-hidden="true"></span>
                    <span>Cargando punto de venta…</span>
                </div>
            </main>
        </div>
    </div>

    <div id="modal-root"></div>
    <div id="toast-root" class="toast-stack" aria-live="polite" aria-atomic="false"></div>

    <script>
        window.APP_CONFIG = {
            store: <?= json_encode($app['store'], JSON_UNESCAPED_UNICODE) ?>,
            currency: <?= json_encode($currency) ?>,
            locale: <?= json_encode($locale) ?>,
            version: <?= json_encode($version) ?>,
            lowStockThreshold: 10
        };
    </script>
    <script type="module" src="assets/js/app.js?v=<?= $version ?>"></script>
</body>
</html>
