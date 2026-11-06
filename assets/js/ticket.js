import { icons } from './icons.js';
import { openModal } from './ui.js';
import {
    CONFIG,
    esc,
    folio,
    formatDateTime,
    getCashier,
    money,
    paymentLabel,
    sum,
} from './utils.js';

export function ticketHtml(sale, options = {}) {
    const cashier = options.cashier || getCashier();
    const cashReceived = options.cashReceived;
    const change = options.change;
    const itemsCount = sale.articulos ?? sum(sale.detalles || [], (line) => line.cantidad);
    const lines = (sale.detalles || []).map((line) => `
        <div class="ticket-line">
            <span class="ticket-line-name">
                ${esc(line.producto)}
                <small>${Number(line.cantidad)} × ${money(line.precio_unitario)}</small>
            </span>
            <span class="ticket-line-amount">${money(line.subtotal)}</span>
        </div>
    `).join('');

    const cashRows = cashReceived !== null && cashReceived !== undefined
        ? `
            <div class="ticket-payment">
                <span>Recibido</span>
                <span>${money(cashReceived)}</span>
            </div>
            <div class="ticket-payment">
                <span>Cambio</span>
                <span>${money(change)}</span>
            </div>
        `
        : '';

    return `
        <div class="ticket" id="print-ticket">
            <div class="ticket-head">
                <span class="ticket-logo">${icons.store}</span>
                <div class="ticket-store">${esc(CONFIG.store)}</div>
                <div class="ticket-sub">Sucursal Centro · Punto de venta</div>
            </div>

            <div class="ticket-meta">
                <div class="ticket-meta-row"><span>Folio</span><strong>${folio(sale.id)}</strong></div>
                <div class="ticket-meta-row"><span>Fecha</span><span>${esc(formatDateTime(sale.fecha_venta))}</span></div>
                <div class="ticket-meta-row"><span>Cajero</span><span>${esc(cashier)}</span></div>
                <div class="ticket-meta-row"><span>Cliente</span><span>${esc(sale.cliente || 'Público general')}</span></div>
                <div class="ticket-meta-row"><span>Pago</span><span>${esc(paymentLabel(sale.metodo_pago))}</span></div>
                <div class="ticket-meta-row"><span>Artículos</span><span>${itemsCount}</span></div>
            </div>

            <div class="ticket-items">
                ${lines || '<div class="ticket-line"><span>Sin detalle</span></div>'}
            </div>

            <div class="ticket-total">
                <span>Total</span>
                <span>${money(sale.total)}</span>
            </div>
            ${cashRows}

            <div class="ticket-foot">
                ¡Gracias por su compra!<br>
                Precios con IVA incluido · Conserve su ticket
            </div>
        </div>
    `;
}

export function openTicketModal(sale, options = {}) {
    const {
        title = 'Venta completada',
        subtitle = `Folio ${folio(sale.id)} · ${money(sale.total)}`,
        closeLabel = 'Nueva venta',
        cashReceived = null,
        change = null,
        cashier = getCashier(),
    } = options;

    const modal = openModal({
        title,
        subtitle,
        icon: 'check',
        size: 'modal-sm',
        className: 'ticket-modal',
        body: ticketHtml(sale, { cashReceived, change, cashier }),
        footer: `
            <button class="btn btn-secondary" type="button" data-ticket-close>${esc(closeLabel)}</button>
            <button class="btn btn-primary" type="button" data-ticket-print>${icons.printer}<span>Imprimir ticket</span></button>
        `,
        onMount: ({ root }) => {
            root.querySelector('[data-ticket-close]')?.addEventListener('click', () => modal.close());
            root.querySelector('[data-ticket-print]')?.addEventListener('click', () => {
                window.print();
            });
        },
    });

    return modal;
}
