import { api } from '../api.js';
import { icons } from '../icons.js';
import { emptyState, setButtonLoading, toast } from '../ui.js';
import {
    CONFIG,
    esc,
    folio,
    formatDate,
    formatDateTime,
    formatWeekday,
    getCashier,
    greeting,
    money,
    number,
    paymentBadgeClass,
    paymentLabel,
    pctChange,
    sum,
    todayISO,
} from '../utils.js';
import { showSaleDetail } from './ventas.js';

const compactMoney = new Intl.NumberFormat(CONFIG.locale, {
    style: 'currency',
    currency: CONFIG.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
});

function capitalize(text) {
    const value = String(text || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function trendBadge(trend) {
    const icon = trend.direction === 'up'
        ? icons.arrowUp
        : trend.direction === 'down'
            ? icons.arrowDown
            : icons.minus;

    return `<span class="trend trend-${trend.direction}">${icon}${esc(trend.label)}</span>`;
}

function kpiCard(options) {
    const {
        label,
        value,
        icon,
        foot,
        color = '#14532d',
        soft = '#dcfce7',
        glow = 'rgba(34, 197, 94, 0.08)',
    } = options;

    return `
        <article class="kpi" style="--kpi-color:${color};--kpi-soft:${soft};--kpi-glow:${glow}">
            <div class="kpi-top">
                <span class="kpi-icon">${icons[icon]}</span>
                <span class="kpi-label">${esc(label)}</span>
            </div>
            <strong class="kpi-value">${value}</strong>
            <div class="kpi-foot">${foot}</div>
        </article>
    `;
}

function chartCard(data) {
    const series = data.serie_7_dias || [];
    const weekTotal = sum(series, (day) => day.total);
    const weekSales = sum(series, (day) => day.ventas);
    const max = Math.max(...series.map((day) => Number(day.total) || 0), 1);
    const hasData = weekSales > 0;
    const today = todayISO();

    const chart = hasData
        ? `
            <div class="bar-chart" role="img" aria-label="Ventas de los últimos 7 días">
                ${series.map((day) => {
                    const total = Number(day.total) || 0;
                    const height = total > 0 ? Math.max(4, (total / max) * 100) : 2;
                    const title = `${formatDate(day.fecha)} · ${day.ventas} venta${day.ventas === 1 ? '' : 's'} · ${money(total)}`;

                    return `
                        <div class="bar-col ${day.fecha === today ? 'today' : ''}" title="${esc(title)}">
                            <span class="bar-value">${day.ventas > 0 ? compactMoney.format(total) : '—'}</span>
                            <div class="bar-track">
                                <div class="bar" style="height:${height.toFixed(1)}%"></div>
                            </div>
                            <span class="bar-label">${esc(formatWeekday(day.fecha))}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `
        : `
            <div class="pos-empty">
                ${emptyState({
                    icon: 'receipt',
                    title: 'Sin ventas en los últimos 7 días',
                    message: 'Cuando registres ventas verás aquí el comportamiento diario de la caja.',
                    actionHtml: '<a class="btn btn-primary btn-sm" href="#/pos">Abrir punto de venta</a>',
                })}
            </div>
        `;

    return `
        <div class="card chart-card">
            <div class="card-head">
                <div class="card-title">
                    <h3>Ventas de los últimos 7 días</h3>
                    <p>${number(weekSales)} venta${weekSales === 1 ? '' : 's'} · ${money(weekTotal)} facturado</p>
                </div>
                <span class="badge badge-green">${money(weekTotal)}</span>
            </div>
            <div class="card-body">${chart}</div>
        </div>
    `;
}

function topProductsCard(data) {
    const products = data.top_productos || [];

    const content = products.length === 0
        ? emptyState({
            icon: 'sparkles',
            title: 'Aún no hay productos vendidos',
            message: 'Los más vendidos de los últimos 30 días aparecerán aquí.',
        })
        : `
            <div class="top-list">
                ${products.map((product, index) => `
                    <div class="top-item">
                        <span class="rank">${index + 1}</span>
                        <span class="top-item-info">
                            <strong>${esc(product.nombre)}</strong>
                            <span>${number(product.cantidad)} unidad${product.cantidad === 1 ? '' : 'es'} vendida${product.cantidad === 1 ? '' : 's'}</span>
                        </span>
                        <span class="top-item-metric">${money(product.ingresos)}</span>
                    </div>
                `).join('')}
            </div>
        `;

    return `
        <div class="card">
            <div class="card-head">
                <div class="card-title">
                    <h3>Más vendidos</h3>
                    <p>Últimos 30 días</p>
                </div>
            </div>
            <div class="card-body">${content}</div>
        </div>
    `;
}

function lowStockCard(data) {
    const products = data.bajo_stock || [];

    const content = products.length === 0
        ? emptyState({
            icon: 'check',
            title: 'Inventario saludable',
            message: 'Ningún producto está por debajo del nivel de stock.',
        })
        : `
            <div class="low-list">
                ${products.map((product) => {
                    const out = product.stock <= 0;
                    return `
                        <div class="low-item">
                            <span class="low-item-info">
                                <strong>${esc(product.nombre)}</strong>
                                <span class="mono">${esc(product.codigo || 'Sin código')} · ${money(product.precio)}</span>
                            </span>
                            <span class="badge ${out ? 'badge-red' : 'badge-amber'}">
                                ${out ? 'Agotado' : `${product.stock} pza`}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    return `
        <div class="card">
            <div class="card-head">
                <div class="card-title">
                    <h3>Stock crítico</h3>
                    <p>Productos que requieren reposición</p>
                </div>
                <a class="btn btn-ghost btn-sm" href="#/productos?estado=bajo">Revisar ${icons.chevronRight}</a>
            </div>
            <div class="card-body">${content}</div>
        </div>
    `;
}

function recentSalesCard(data) {
    const sales = data.ultimas_ventas || [];

    const content = sales.length === 0
        ? emptyState({
            icon: 'receipt',
            title: 'Todavía no hay ventas',
            message: 'La primera venta del día aparecerá en este espacio.',
            actionHtml: '<a class="btn btn-primary btn-sm" href="#/pos">Registrar venta</a>',
        })
        : `
            <div class="recent-list" data-recent>
                ${sales.map((sale) => `
                    <button class="recent-item" type="button" data-sale="${sale.id}" aria-label="Ver venta ${folio(sale.id)}"
                        style="width:100%;border:0;border-bottom:1px dashed var(--line);background:none;text-align:left;font:inherit;cursor:pointer">
                        <span class="recent-icon">${folio(sale.id).slice(-3)}</span>
                        <span class="recent-info">
                            <strong>${esc(sale.cliente || 'Público general')}</strong>
                            <span>${esc(formatDateTime(sale.fecha_venta, { year: undefined }))} · ${esc(paymentLabel(sale.metodo_pago))}</span>
                        </span>
                        <span class="badge ${paymentBadgeClass(sale.metodo_pago)}">${esc(paymentLabel(sale.metodo_pago))}</span>
                        <span class="recent-total">${money(sale.total)}</span>
                    </button>
                `).join('')}
            </div>
        `;

    return `
        <div class="card">
            <div class="card-head">
                <div class="card-title">
                    <h3>Últimas ventas</h3>
                    <p>Movimientos recientes de caja</p>
                </div>
                <a class="btn btn-ghost btn-sm" href="#/ventas">Ver historial ${icons.chevronRight}</a>
            </div>
            <div class="card-body">${content}</div>
        </div>
    `;
}

function quickActionsCard() {
    return `
        <div class="card">
            <div class="card-head">
                <div class="card-title">
                    <h3>Accesos rápidos</h3>
                    <p>Las tareas más comunes del turno</p>
                </div>
            </div>
            <div class="card-body">
                <div class="quick-actions">
                    <a class="quick-action" href="#/pos">
                        <span class="quick-action-icon">${icons.cart}</span>
                        <span><strong>Nueva venta</strong><small>Cobrar en caja</small></span>
                    </a>
                    <a class="quick-action" href="#/productos">
                        <span class="quick-action-icon">${icons.package}</span>
                        <span><strong>Productos</strong><small>Precios y stock</small></span>
                    </a>
                    <a class="quick-action" href="#/clientes">
                        <span class="quick-action-icon">${icons.users}</span>
                        <span><strong>Clientes</strong><small>Directorio</small></span>
                    </a>
                    <a class="quick-action" href="#/categorias">
                        <span class="quick-action-icon">${icons.tags}</span>
                        <span><strong>Categorías</strong><small>Organizar catálogo</small></span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

function panelHtml(data) {
    const hoy = data.hoy || {};
    const ayer = data.ayer || {};
    const productos = data.productos || {};
    const clientes = data.clientes || {};
    const trend = pctChange(hoy.ingresos, ayer.ingresos);
    const lowStockTotal = Number(productos.bajo_stock) || 0;
    const outOfStock = Number(productos.agotados) || 0;

    return `
        <div class="page">
            <div class="page-head">
                <div class="page-head-text">
                    <span class="eyebrow">Resumen</span>
                    <h2>${esc(greeting())}, ${esc(getCashier())}</h2>
                    <p class="page-subtitle">
                        Así va ${esc(CONFIG.store)} · ${esc(capitalize(formatDate(new Date(), {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                        })))}
                    </p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" type="button" data-refresh>
                        ${icons.refresh}<span>Actualizar</span>
                    </button>
                    <a class="btn btn-primary" href="#/pos">${icons.cart}<span>Nueva venta</span></a>
                </div>
            </div>

            <div class="kpi-grid">
                ${kpiCard({
                    label: 'Ingresos de hoy',
                    value: money(hoy.ingresos),
                    icon: 'cash',
                    foot: `${trendBadge(trend)} <span>vs ayer (${money(ayer.ingresos)})</span>`,
                    color: '#14532d',
                    soft: '#dcfce7',
                    glow: 'rgba(34, 197, 94, 0.09)',
                })}
                ${kpiCard({
                    label: 'Ventas de hoy',
                    value: number(hoy.ventas),
                    icon: 'receipt',
                    foot: `<span>Ticket promedio <strong>${money(hoy.ticket_promedio)}</strong></span>`,
                    color: '#0369a1',
                    soft: '#e0f2fe',
                    glow: 'rgba(2, 132, 199, 0.08)',
                })}
                ${kpiCard({
                    label: 'Clientes registrados',
                    value: number(clientes.total),
                    icon: 'users',
                    foot: `<span>Directorio disponible en caja</span>`,
                    color: '#7e22ce',
                    soft: '#f3e8ff',
                    glow: 'rgba(126, 34, 206, 0.07)',
                })}
                ${kpiCard({
                    label: 'Valor del inventario',
                    value: money(productos.valor_inventario),
                    icon: 'package',
                    foot: `<span>${number(productos.total)} productos en catálogo</span>`,
                    color: '#a16207',
                    soft: '#fef3c7',
                    glow: 'rgba(217, 119, 6, 0.08)',
                })}
            </div>

            <div class="summary-inline">
                <span><strong>${number(productos.unidades)}</strong> unidades en existencia</span>
                <span class="dot"></span>
                <span class="${outOfStock > 0 ? 'text-red' : 'text-muted'}"><strong>${number(outOfStock)}</strong> productos agotados</span>
                <span class="dot"></span>
                <span class="${lowStockTotal > 0 ? '' : 'text-green'}"><strong>${number(lowStockTotal)}</strong> con stock bajo</span>
            </div>

            <div class="dashboard-grid">
                <div class="dashboard-stack">
                    ${chartCard(data)}
                    ${recentSalesCard(data)}
                </div>
                <div class="dashboard-stack">
                    ${topProductsCard(data)}
                    ${lowStockCard(data)}
                    ${quickActionsCard()}
                </div>
            </div>
        </div>
    `;
}

export async function renderPanel(root) {
    const data = await api.dashboard();
    root.innerHTML = panelHtml(data);

    const refreshButton = root.querySelector('[data-refresh]');
    refreshButton?.addEventListener('click', async () => {
        setButtonLoading(refreshButton, true, 'Actualizando…');
        try {
            await renderPanel(root);
            toast('Panel actualizado con la información más reciente.', 'info');
        } catch (error) {
            setButtonLoading(refreshButton, false);
            toast(error.message, 'error');
        }
    });

    root.querySelector('[data-recent]')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-sale]');
        if (!button) {
            return;
        }

        showSaleDetail(Number(button.dataset.sale), {
            onChanged: () => renderPanel(root).catch((error) => toast(error.message, 'error')),
        }).catch((error) => toast(error.message, 'error'));
    });
}
