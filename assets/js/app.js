import { icons } from './icons.js';
import { emptyState, openModal, toast } from './ui.js';
import { CONFIG, esc, getCashier, initials, setCashier } from './utils.js';
import { renderPanel } from './views/panel.js';
import { renderPos } from './views/pos.js';
import { renderProductos } from './views/productos.js';
import { renderCategorias } from './views/categorias.js';
import { renderClientes } from './views/clientes.js';
import { renderVentas } from './views/ventas.js';

const ROUTES = {
    pos: {
        eyebrow: 'Operación',
        title: 'Punto de venta',
        loading: 'punto de venta',
        render: renderPos,
    },
    panel: {
        eyebrow: 'Resumen',
        title: 'Panel',
        loading: 'panel',
        render: renderPanel,
    },
    productos: {
        eyebrow: 'Catálogo',
        title: 'Productos',
        loading: 'productos',
        render: renderProductos,
    },
    categorias: {
        eyebrow: 'Catálogo',
        title: 'Categorías',
        loading: 'categorías',
        render: renderCategorias,
    },
    clientes: {
        eyebrow: 'Catálogo',
        title: 'Clientes',
        loading: 'clientes',
        render: renderClientes,
    },
    ventas: {
        eyebrow: 'Historial',
        title: 'Ventas',
        loading: 'ventas',
        render: renderVentas,
    },
};

const view = document.getElementById('view');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const menuButton = document.getElementById('menuBtn');
const sidebarClose = document.getElementById('sidebarClose');
const pageTitle = document.getElementById('pageTitle');
const pageEyebrow = document.getElementById('pageEyebrow');
const cashierButton = document.getElementById('cashierBtn');
const userChip = document.getElementById('userChip');

let currentKey = 'pos';
let cleanup = null;
let routeToken = 0;
let pendingAction = null;

/* ------------------------------------------------------------
   Utilidades de interfaz
   ------------------------------------------------------------ */

function capitalize(text) {
    const value = String(text || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseRoute() {
    const raw = window.location.hash.replace(/^#\/?/, '') || 'pos';
    const [path, queryString] = raw.split('?');
    const name = path.split('/')[0] || 'pos';
    return {
        name,
        query: new URLSearchParams(queryString || ''),
    };
}

function openSidebar() {
    sidebar?.classList.add('open');
    if (sidebarBackdrop) {
        sidebarBackdrop.hidden = false;
    }
    menuButton?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
    sidebar?.classList.remove('open');
    if (sidebarBackdrop) {
        sidebarBackdrop.hidden = true;
    }
    menuButton?.setAttribute('aria-expanded', 'false');
}

function updateChrome(key, route) {
    document.title = `${route.title} · ${CONFIG.store}`;

    if (pageTitle) {
        pageTitle.textContent = route.title;
    }
    if (pageEyebrow) {
        pageEyebrow.textContent = route.eyebrow;
    }

    document.querySelectorAll('[data-nav]').forEach((link) => {
        const active = link.dataset.nav === key;
        link.classList.toggle('active', active);
        if (active) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function renderRouteError(message) {
    if (!view) {
        return;
    }

    view.innerHTML = `
        <div class="page">
            <div class="card">
                <div class="card-body">
                    ${emptyState({
                        icon: 'alert',
                        title: 'No se pudo cargar esta sección',
                        message,
                        actionHtml: `
                            <button class="btn btn-secondary" type="button" data-retry>${icons.refresh}<span>Reintentar</span></button>
                            <a class="btn btn-primary" href="#/pos">${icons.cart}<span>Ir al punto de venta</span></a>
                        `,
                    })}
                </div>
            </div>
        </div>
    `;

    view.querySelector('[data-retry]')?.addEventListener('click', () => navigate());
}

function focusPosSearch() {
    const input = document.querySelector('[data-pos-search]');
    if (!input) {
        return;
    }
    input.focus({ preventScroll: true });
    input.select?.();
}

function triggerPay() {
    const payButton = document.querySelector('[data-pay]');
    if (payButton && !payButton.disabled) {
        payButton.click();
        return;
    }
    toast('Agrega productos al carrito para cobrar.', 'warning');
}

function runPosAction(action) {
    if (action === 'search') {
        focusPosSearch();
    } else if (action === 'pay') {
        triggerPay();
    }
}

function requestPosAction(action) {
    if (document.querySelector('.modal-backdrop')) {
        return;
    }

    if (currentKey !== 'pos') {
        pendingAction = action;
        if (parseRoute().name === 'pos') {
            navigate();
        } else {
            window.location.hash = '#/pos';
        }
        return;
    }

    runPosAction(action);
}

/* ------------------------------------------------------------
   Router
   ------------------------------------------------------------ */

async function navigate() {
    if (!view) {
        return;
    }

    const parsed = parseRoute();
    const known = Boolean(ROUTES[parsed.name]);
    const key = known ? parsed.name : 'pos';

    if (!known) {
        window.history.replaceState(null, '', `#/${key}`);
    }

    const route = ROUTES[key];
    const token = ++routeToken;

    if (typeof cleanup === 'function') {
        try {
            cleanup();
        } catch {
            /* la vista anterior ya no está disponible */
        }
    }
    cleanup = null;
    currentKey = key;

    updateChrome(key, route);
    closeSidebar();

    view.setAttribute('aria-busy', 'true');
    view.innerHTML = `
        <div class="page-loader" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <span>Cargando ${esc(route.loading)}…</span>
        </div>
    `;

    window.scrollTo({ top: 0, behavior: 'auto' });

    /* Cada vista se monta en su propio contenedor para que una carga
       lenta de la ruta anterior no sobrescriba la ruta actual. */
    const outlet = document.createElement('div');
    outlet.className = 'view-stage';

    try {
        const result = await route.render(outlet, parsed.query);

        if (token !== routeToken) {
            if (typeof result === 'function') {
                try {
                    result();
                } catch {
                    /* la vista obsoleta ya no está montada */
                }
            }
            return;
        }

        view.replaceChildren(outlet);
        cleanup = typeof result === 'function' ? result : null;

        if (pendingAction) {
            const action = pendingAction;
            pendingAction = null;
            /* Esperar al autoenfoque de la vista antes de aplicar el atajo. */
            setTimeout(() => runPosAction(action), 90);
        }
    } catch (error) {
        if (token !== routeToken) {
            return;
        }

        pendingAction = null;
        renderRouteError(error?.message || 'Ocurrió un error inesperado al cargar la sección.');
        toast(error?.message || 'No se pudo cargar la sección.', 'error');
    } finally {
        if (token === routeToken) {
            view.setAttribute('aria-busy', 'false');
        }
    }
}

/* ------------------------------------------------------------
   Reloj
   ------------------------------------------------------------ */

function startClock() {
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');

    if (!dateElement || !timeElement) {
        return;
    }

    const dateFormatter = new Intl.DateTimeFormat(CONFIG.locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const timeFormatter = new Intl.DateTimeFormat(CONFIG.locale, {
        hour: '2-digit',
        minute: '2-digit',
    });

    const tick = () => {
        const now = new Date();
        dateElement.textContent = capitalize(dateFormatter.format(now));
        timeElement.textContent = timeFormatter.format(now);
    };

    tick();
    window.setInterval(tick, 15000);
}

/* ------------------------------------------------------------
   Cajero
   ------------------------------------------------------------ */

function renderCashier() {
    const name = getCashier();
    const avatar = initials(name);

    const cashierName = document.getElementById('cashierName');
    const cashierAvatar = document.getElementById('cashierAvatar');
    const topCashier = document.getElementById('topCashier');
    const topAvatar = document.getElementById('topAvatar');

    if (cashierName) {
        cashierName.textContent = name;
    }
    if (topCashier) {
        topCashier.textContent = name;
    }
    if (cashierAvatar) {
        cashierAvatar.textContent = avatar;
    }
    if (topAvatar) {
        topAvatar.textContent = avatar;
    }
}

function openCashierModal() {
    let modal = null;

    const save = (input) => {
        setCashier(input.value);
        renderCashier();
        modal?.close();
        toast(`Ahora atiendes como ${getCashier()}.`, 'success', 'Cajero actualizado');
    };

    modal = openModal({
        title: 'Cambiar cajero',
        subtitle: 'El nombre se guarda en este dispositivo y aparece en el ticket.',
        icon: 'user',
        size: 'modal-sm',
        body: `
            <form id="cashier-form" novalidate>
                <div class="field">
                    <label for="cashier-input">Nombre del cajero</label>
                    <input
                        class="input"
                        id="cashier-input"
                        name="cashier"
                        type="text"
                        maxlength="40"
                        autocomplete="name"
                        value="${esc(getCashier())}"
                        data-autofocus
                    >
                    <p class="field-hint">Se mostrará en la barra superior y en los tickets impresos.</p>
                </div>
            </form>
        `,
        footer: `
            <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
            <button class="btn btn-primary" type="button" data-save>${icons.check}<span>Guardar</span></button>
        `,
        onMount: ({ root }) => {
            const form = root.querySelector('#cashier-form');
            const input = root.querySelector('#cashier-input');

            root.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());
            root.querySelector('[data-save]')?.addEventListener('click', () => {
                if (form.reportValidity()) {
                    save(input);
                }
            });
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                if (form.reportValidity()) {
                    save(input);
                }
            });
        },
    });
}

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */

function bindShell() {
    menuButton?.addEventListener('click', openSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarBackdrop?.addEventListener('click', closeSidebar);

    sidebar?.querySelectorAll('.nav-item').forEach((link) => {
        link.addEventListener('click', closeSidebar);
    });

    cashierButton?.addEventListener('click', openCashierModal);
    userChip?.addEventListener('click', openCashierModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'F2') {
            event.preventDefault();
            requestPosAction('search');
            return;
        }

        if (event.key === 'F4') {
            event.preventDefault();
            requestPosAction('pay');
            return;
        }

        if (event.key === 'Escape') {
            closeSidebar();
        }
    });

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#/"]');
        if (link) {
            closeSidebar();
        }
    });
}

function boot() {
    renderCashier();
    startClock();
    bindShell();

    window.addEventListener('hashchange', () => navigate());

    if (!window.location.hash) {
        window.history.replaceState(null, '', '#/pos');
    }

    navigate();
}

boot();
