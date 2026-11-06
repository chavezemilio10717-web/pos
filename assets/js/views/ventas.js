import { api } from '../api.js';
import { icons } from '../icons.js';
import { productVisual, thumbStyle } from '../catalog.js';
import {
    applyFieldErrors,
    confirmDialog,
    emptyState,
    openModal,
    setButtonLoading,
    toast,
} from '../ui.js';
import { openTicketModal } from '../ticket.js';
import {
    daysAgoISO,
    esc,
    folio,
    formatDate,
    formatDateTime,
    money,
    number,
    paymentBadgeClass,
    paymentLabel,
    round2,
    sum,
    todayISO,
} from '../utils.js';

function paymentBadge(method) {
    return `<span class="badge ${paymentBadgeClass(method)}">${esc(paymentLabel(method))}</span>`;
}

async function deleteSale(sale) {
    const confirmed = await confirmDialog({
        title: 'Anular venta',
        subtitle: `${folio(sale.id)} · ${money(sale.total)}`,
        message: `¿Deseas anular la venta <strong>${folio(sale.id)}</strong>? Se eliminará del historial y el stock de los productos se devolverá al inventario.`,
        confirmText: 'Anular venta',
        cancelText: 'Conservar venta',
        icon: 'trash',
    });

    if (!confirmed) {
        return false;
    }

    try {
        await api.ventas.remove(sale.id);
        toast(`Venta ${folio(sale.id)} anulada y stock restaurado.`, 'success');
        return true;
    } catch (error) {
        toast(error.message, 'error');
        return false;
    }
}

function detailGrid(sale) {
    return `
        <div class="detail-grid">
            <div class="detail-box">
                <span>Cliente</span>
                <strong>${esc(sale.cliente || 'Público general')}</strong>
            </div>
            <div class="detail-box">
                <span>Fecha y hora</span>
                <strong>${esc(formatDateTime(sale.fecha_venta))}</strong>
            </div>
            <div class="detail-box">
                <span>Método de pago</span>
                <strong>${esc(paymentLabel(sale.metodo_pago))}</strong>
            </div>
            <div class="detail-box">
                <span>Artículos</span>
                <strong>${sale.articulos} unidad${sale.articulos === 1 ? '' : 'es'}</strong>
            </div>
            <div class="detail-box">
                <span>Folio</span>
                <strong class="mono">${folio(sale.id)}</strong>
            </div>
            <div class="detail-box">
                <span>Estado</span>
                <strong><span class="badge badge-green">Completada</span></strong>
            </div>
        </div>
    `;
}

function saleDetailBody(sale) {
    const lines = (sale.detalles || []).map((line) => `
        <div class="sale-line">
            <div class="cell-main">
                <strong>${esc(line.producto)}</strong>
                <small class="mono">${esc(line.codigo || '')}</small>
            </div>
            <span class="num">${line.cantidad}</span>
            <span class="num">${money(line.precio_unitario)}</span>
            <span class="num fw-700">${money(line.subtotal)}</span>
        </div>
    `).join('');

    return `
        ${detailGrid(sale)}

        <div class="sale-lines">
            <div class="sale-line head">
                <span>Producto</span>
                <span class="num">Cant.</span>
                <span class="num">P. unit.</span>
                <span class="num">Subtotal</span>
            </div>
            ${lines || '<div class="sale-line"><span>Sin detalle de productos.</span></div>'}
        </div>

        <div class="sale-totals">
            <div>
                <span>Artículos</span>
                <strong>${sale.articulos}</strong>
            </div>
            <div>
                <span>Total de la venta</span>
                <strong>${money(sale.total)}</strong>
            </div>
        </div>
    `;
}

export async function showSaleDetail(saleId, options = {}) {
    let sale;
    try {
        sale = await api.ventas.get(saleId);
    } catch (error) {
        toast(error.message, 'error');
        return null;
    }

    const modal = openModal({
        title: 'Detalle de la venta',
        subtitle: `${folio(sale.id)} · ${esc(sale.cliente || 'Público general')}`,
        icon: 'receipt',
        body: saleDetailBody(sale),
        size: 'modal-lg',
        footer: `
            <div class="foot-left">
                <button class="btn btn-danger" type="button" data-detail-delete>${icons.trash}<span>Anular venta</span></button>
            </div>
            <button class="btn btn-secondary" type="button" data-detail-print>${icons.printer}<span>Ticket</span></button>
            <button class="btn btn-primary" type="button" data-detail-edit>${icons.edit}<span>Editar</span></button>
        `,
        onMount: ({ root }) => {
            root.querySelector('[data-detail-print]')?.addEventListener('click', () => {
                modal.close();
                openTicketModal(sale, {
                    title: 'Ticket de venta',
                    subtitle: `${folio(sale.id)} · ${money(sale.total)}`,
                    closeLabel: 'Cerrar',
                });
            });

            root.querySelector('[data-detail-edit]')?.addEventListener('click', () => {
                modal.close();
                openSaleEdit(sale, options).catch((error) => toast(error.message, 'error'));
            });

            root.querySelector('[data-detail-delete]')?.addEventListener('click', async () => {
                const deleted = await deleteSale(sale);
                if (deleted) {
                    modal.close();
                    options.onChanged?.();
                }
            });
        },
    });

    return modal;
}

export async function openSaleEdit(saleOrId, options = {}) {
    let sale = typeof saleOrId === 'object' && saleOrId !== null && saleOrId.detalles
        ? saleOrId
        : await api.ventas.get(saleOrId);

    if (!sale.detalles) {
        sale = await api.ventas.get(sale.id);
    }

    const [productsResponse, clientsResponse] = await Promise.all([
        api.productos.list(),
        api.clientes.list(),
    ]);

    const products = productsResponse.items;
    const clients = clientsResponse.items;
    const productMap = new Map(products.map((product) => [product.id, product]));

    let lines = (sale.detalles || []).map((line) => {
        const product = productMap.get(line.producto_id);
        return {
            producto_id: line.producto_id,
            nombre: product?.nombre || line.producto,
            precio: product?.precio ?? line.precio_unitario,
            cantidad: line.cantidad,
            originalQty: line.cantidad,
            stock: product?.stock ?? 0,
        };
    });

    let method = sale.metodo_pago || 'efectivo';
    let clientId = sale.cliente_id ? String(sale.cliente_id) : '';

    const clientOptions = [
        '<option value="">Público general</option>',
        ...clients.map((client) => `
            <option value="${client.id}" ${String(client.id) === clientId ? 'selected' : ''}>
                ${esc(client.nombre_completo || `${client.nombre} ${client.apellido}`)}
            </option>
        `),
    ].join('');

    const modal = openModal({
        title: `Editar venta ${folio(sale.id)}`,
        subtitle: 'Cambia el cliente, el pago o los productos. El stock se recalcula al guardar.',
        icon: 'edit',
        size: 'modal-lg',
        body: `
            <form id="sale-edit-form" novalidate>
                <div class="form-grid">
                    <div class="field">
                        <label for="sale-client">Cliente</label>
                        <select class="select" id="sale-client" name="cliente_id">
                            ${clientOptions}
                        </select>
                    </div>
                    <div class="field">
                        <label for="sale-method">Método de pago</label>
                        <select class="select" id="sale-method" name="metodo_pago">
                            <option value="efectivo" ${method === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                            <option value="tarjeta" ${method === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                            <option value="transferencia" ${method === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                        </select>
                    </div>
                </div>

                <div class="field mt-16">
                    <label>Productos de la venta</label>
                    <div class="sale-items-editor" data-sale-lines></div>
                </div>

                <div class="sale-add-row">
                    <select class="select" data-add-product aria-label="Producto para agregar">
                        <option value="">Agregar producto…</option>
                        ${products.filter((product) => product.stock > 0).map((product) => `
                            <option value="${product.id}">
                                ${esc(product.nombre)} · ${money(product.precio)} · ${product.stock} pza
                            </option>
                        `).join('')}
                    </select>
                    <button class="btn btn-secondary" type="button" data-add-line>${icons.plus}<span>Agregar</span></button>
                </div>

                <div class="sale-edit-total">
                    <span>Nuevo total</span>
                    <strong data-edit-total>${money(sale.total)}</strong>
                </div>

                <div class="pay-error mt-12" data-edit-error role="alert"></div>

                <div class="modal-note mt-16">
                    ${icons.info}
                    <span>Al guardar, se devolverá el stock anterior y se descontará el nuevo. Asegúrate de que las cantidades estén disponibles.</span>
                </div>
            </form>
        `,
        footer: `
            <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
            <button class="btn btn-primary" type="button" data-save>${icons.save}<span>Guardar cambios</span></button>
        `,
        onMount: ({ root }) => {
            const linesEl = root.querySelector('[data-sale-lines]');
            const addSelect = root.querySelector('[data-add-product]');
            const addButton = root.querySelector('[data-add-line]');
            const totalEl = root.querySelector('[data-edit-total]');
            const errorBox = root.querySelector('[data-edit-error]');
            const clientSelect = root.querySelector('#sale-client');
            const methodSelect = root.querySelector('#sale-method');
            const saveButton = root.querySelector('[data-save]');

            function availableFor(line) {
                return line.stock + line.originalQty;
            }

            function renderLines() {
                linesEl.innerHTML = lines.map((line) => {
                    const product = productMap.get(line.producto_id);
                    const visual = productVisual(product || { categoria: '' });
                    const total = round2(line.precio * line.cantidad);
                    const available = availableFor(line);

                    return `
                        <div class="sale-edit-line" data-line="${line.producto_id}">
                            <span class="name" title="${esc(line.nombre)}">
                                <span class="mini-thumb" style="width:24px;height:24px;font-size:13px;display:inline-grid;vertical-align:middle;margin-right:6px;${thumbStyle(visual)}">${visual.emoji}</span>
                                ${esc(line.nombre)}
                                <small style="display:block;color:var(--muted-2);font-size:9px;margin-left:30px;">Disp. ${available} pza</small>
                            </span>
                            <input class="input" type="number" min="1" max="${available}" step="1"
                                value="${line.cantidad}" data-line-qty="${line.producto_id}" aria-label="Cantidad de ${esc(line.nombre)}">
                            <span class="line-total">${money(total)}</span>
                            <button class="icon-btn danger" type="button" data-remove-line="${line.producto_id}" aria-label="Quitar producto">${icons.trash}</button>
                        </div>
                    `;
                }).join('');

                const total = round2(sum(lines, (line) => line.precio * line.cantidad));
                totalEl.textContent = money(total);
            }

            function updateQuantity(productId, value) {
                const line = lines.find((item) => item.producto_id === Number(productId));
                if (!line) {
                    return;
                }

                const parsed = Math.floor(Number(value));
                if (!Number.isFinite(parsed) || parsed <= 0) {
                    line.cantidad = 1;
                } else {
                    line.cantidad = Math.min(parsed, availableFor(line));
                }
                renderLines();
            }

            linesEl.addEventListener('click', (event) => {
                const removeButton = event.target.closest('[data-remove-line]');
                if (!removeButton) {
                    return;
                }

                if (lines.length <= 1) {
                    toast('La venta debe conservar al menos un producto.', 'warning');
                    return;
                }

                lines = lines.filter((line) => line.producto_id !== Number(removeButton.dataset.removeLine));
                renderLines();
            });

            linesEl.addEventListener('change', (event) => {
                const input = event.target.closest('[data-line-qty]');
                if (input) {
                    updateQuantity(input.dataset.lineQty, input.value);
                }
            });

            addButton.addEventListener('click', () => {
                const productId = Number(addSelect.value);
                if (!productId) {
                    addSelect.focus();
                    return;
                }

                const product = productMap.get(productId);
                if (!product) {
                    return;
                }

                const existing = lines.find((line) => line.producto_id === productId);
                if (existing) {
                    if (existing.cantidad + 1 > availableFor(existing)) {
                        toast(`No hay más stock disponible de ${product.nombre}.`, 'warning');
                        return;
                    }
                    existing.cantidad += 1;
                } else {
                    if (product.stock <= 0) {
                        toast('Ese producto está agotado.', 'warning');
                        return;
                    }
                    lines.push({
                        producto_id: product.id,
                        nombre: product.nombre,
                        precio: product.precio,
                        cantidad: 1,
                        originalQty: 0,
                        stock: product.stock,
                    });
                }

                addSelect.value = '';
                renderLines();
            });

            const submit = async () => {
                errorBox.classList.remove('show');
                errorBox.textContent = '';
                setButtonLoading(saveButton, true, 'Guardando…');

                try {
                    const updated = await api.ventas.update(sale.id, {
                        cliente_id: clientSelect.value ? Number(clientSelect.value) : null,
                        metodo_pago: methodSelect.value,
                        items: lines.map((line) => ({
                            producto_id: line.producto_id,
                            cantidad: line.cantidad,
                        })),
                    });

                    modal.close();
                    toast('Venta actualizada y stock recalculado.', 'success', 'Cambios guardados');

                    if (typeof options.onChanged === 'function') {
                        options.onChanged(updated);
                    }
                } catch (error) {
                    setButtonLoading(saveButton, false);
                    errorBox.textContent = error.message || 'No se pudo actualizar la venta.';
                    errorBox.classList.add('show');

                    if (error.errors) {
                        applyFieldErrors(root.querySelector('#sale-edit-form'), error.errors);
                    }
                }
            };

            root.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());
            saveButton.addEventListener('click', submit);
            root.querySelector('#sale-edit-form').addEventListener('submit', (event) => {
                event.preventDefault();
                submit();
            });

            renderLines();
        },
    });

    return modal;
}

export async function renderVentas(root) {
    let ventas = [];
    let filters = {
        q: '',
        desde: daysAgoISO(30),
        hasta: todayISO(),
        metodo_pago: '',
    };

    root.innerHTML = `
        <div class="page">
            <div class="page-head">
                <div class="page-head-text">
                    <span class="eyebrow">Historial</span>
                    <h2>Ventas</h2>
                    <p class="page-subtitle">Consulta, imprime, edita o anula las ventas registradas en caja.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" type="button" data-refresh>${icons.refresh}<span>Actualizar</span></button>
                    <a class="btn btn-primary" href="#/pos">${icons.plus}<span>Nueva venta</span></a>
                </div>
            </div>

            <div class="summary-inline">
                <span><strong data-stat-count>0</strong> ventas</span>
                <span class="dot"></span>
                <span><strong data-stat-total>${money(0)}</strong> facturado</span>
                <span class="dot"></span>
                <span><strong data-stat-ticket>${money(0)}</strong> ticket promedio</span>
                <span class="dot"></span>
                <span><strong data-stat-items>0</strong> artículos</span>
            </div>

            <div class="filter-bar">
                <div class="search">
                    ${icons.search}
                    <input class="input" type="search" data-filter-q placeholder="Folio o cliente…" autocomplete="off">
                </div>
                <div class="field">
                    <label for="sales-from">Desde</label>
                    <input class="input" id="sales-from" type="date" data-filter-from value="${filters.desde}">
                </div>
                <div class="field">
                    <label for="sales-to">Hasta</label>
                    <input class="input" id="sales-to" type="date" data-filter-to value="${filters.hasta}">
                </div>
                <div class="field">
                    <label for="sales-method">Pago</label>
                    <select class="select" id="sales-method" data-filter-method>
                        <option value="">Todos</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                    </select>
                </div>
                <button class="btn btn-ghost" type="button" data-clear-filters>Limpiar</button>
                <div class="spacer"></div>
                <span class="text-muted" data-result-count></span>
            </div>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th class="text-right">Artículos</th>
                            <th>Pago</th>
                            <th class="text-right">Total</th>
                            <th aria-label="Acciones"></th>
                        </tr>
                    </thead>
                    <tbody data-rows></tbody>
                </table>
            </div>
        </div>
    `;

    const rows = root.querySelector('[data-rows]');
    const searchInput = root.querySelector('[data-filter-q]');
    const fromInput = root.querySelector('[data-filter-from]');
    const toInput = root.querySelector('[data-filter-to]');
    const methodSelect = root.querySelector('[data-filter-method]');
    const resultCount = root.querySelector('[data-result-count]');
    const statCount = root.querySelector('[data-stat-count]');
    const statTotal = root.querySelector('[data-stat-total]');
    const statTicket = root.querySelector('[data-stat-ticket]');
    const statItems = root.querySelector('[data-stat-items]');

    function renderStats(list) {
        const total = sum(list, (sale) => sale.total);
        const items = sum(list, (sale) => sale.articulos);
        statCount.textContent = number(list.length);
        statTotal.textContent = money(total);
        statTicket.textContent = money(list.length > 0 ? total / list.length : 0);
        statItems.textContent = number(items);
        resultCount.textContent = `${list.length} venta${list.length === 1 ? '' : 's'} encontrada${list.length === 1 ? '' : 's'}`;
    }

    function renderRows() {
        renderStats(ventas);

        if (ventas.length === 0) {
            rows.innerHTML = `
                <tr>
                    <td colspan="7">
                        ${emptyState({
                            icon: 'receipt',
                            title: 'No hay ventas en este periodo',
                            message: 'Ajusta las fechas o los filtros para consultar otro rango de ventas.',
                            actionHtml: `
                                <button class="btn btn-secondary btn-sm" type="button" data-clear-empty>Limpiar filtros</button>
                                <a class="btn btn-primary btn-sm" href="#/pos">Ir al punto de venta</a>
                            `,
                        })}
                    </td>
                </tr>
            `;
            return;
        }

        rows.innerHTML = ventas.map((sale) => `
            <tr>
                <td><strong class="mono">${folio(sale.id)}</strong></td>
                <td class="text-muted">${formatDate(sale.fecha_venta)}<br><small>${esc(formatDateTime(sale.fecha_venta, { year: undefined, month: undefined, day: undefined }))}</small></td>
                <td>
                    <div class="cell-main">
                        <strong>${esc(sale.cliente || 'Público general')}</strong>
                        <small>${sale.articulos} artículo${sale.articulos === 1 ? '' : 's'}</small>
                    </div>
                </td>
                <td class="num text-right">${sale.articulos}</td>
                <td>${paymentBadge(sale.metodo_pago)}</td>
                <td class="num text-right"><strong>${money(sale.total)}</strong></td>
                <td>
                    <div class="cell-actions">
                        <button class="icon-btn" type="button" data-view="${sale.id}" aria-label="Ver venta ${folio(sale.id)}" title="Ver detalle">${icons.eye}</button>
                        <button class="icon-btn" type="button" data-edit="${sale.id}" aria-label="Editar venta ${folio(sale.id)}" title="Editar">${icons.edit}</button>
                        <button class="icon-btn danger" type="button" data-delete="${sale.id}" aria-label="Anular venta ${folio(sale.id)}" title="Anular">${icons.trash}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function loadingRows() {
        rows.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="page-loader" style="min-height:160px">
                        <span class="spinner" aria-hidden="true"></span>
                        <span>Cargando ventas…</span>
                    </div>
                </td>
            </tr>
        `;
    }

    async function loadSales(initial = false) {
        if (!initial) {
            loadingRows();
        }

        try {
            const response = await api.ventas.list({
                q: filters.q,
                desde: filters.desde,
                hasta: filters.hasta,
                metodo_pago: filters.metodo_pago,
            });
            ventas = response.items;
            renderRows();
        } catch (error) {
            if (initial) {
                throw error;
            }
            toast(error.message, 'error');
            rows.innerHTML = `
                <tr>
                    <td colspan="7">
                        ${emptyState({
                            icon: 'alert',
                            title: 'No se pudieron cargar las ventas',
                            message: error.message,
                            actionHtml: '<button class="btn btn-secondary btn-sm" type="button" data-retry>Reintentar</button>',
                        })}
                    </td>
                </tr>
            `;
        }
    }

    async function handleFilterChange() {
        if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
            toast('La fecha inicial no puede ser posterior a la final.', 'warning');
            return;
        }
        await loadSales();
    }

    const debouncedSearch = (() => {
        let timer;
        return () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                filters.q = searchInput.value.trim();
                handleFilterChange();
            }, 280);
        };
    })();

    searchInput.addEventListener('input', debouncedSearch);

    fromInput.addEventListener('change', () => {
        filters.desde = fromInput.value;
        handleFilterChange();
    });

    toInput.addEventListener('change', () => {
        filters.hasta = toInput.value;
        handleFilterChange();
    });

    methodSelect.addEventListener('change', () => {
        filters.metodo_pago = methodSelect.value;
        handleFilterChange();
    });

    function clearFilters() {
        filters = { q: '', desde: '', hasta: '', metodo_pago: '' };
        searchInput.value = '';
        fromInput.value = '';
        toInput.value = '';
        methodSelect.value = '';
        handleFilterChange();
    }

    root.querySelector('[data-clear-filters]').addEventListener('click', clearFilters);

    rows.addEventListener('click', (event) => {
        if (event.target.closest('[data-clear-empty]')) {
            clearFilters();
            return;
        }

        if (event.target.closest('[data-retry]')) {
            loadSales();
            return;
        }

        const viewButton = event.target.closest('[data-view]');
        if (viewButton) {
            showSaleDetail(Number(viewButton.dataset.view), { onChanged: () => loadSales() });
            return;
        }

        const editButton = event.target.closest('[data-edit]');
        if (editButton) {
            openSaleEdit(Number(editButton.dataset.edit), { onChanged: () => loadSales() })
                .catch((error) => toast(error.message, 'error'));
            return;
        }

        const deleteButton = event.target.closest('[data-delete]');
        if (deleteButton) {
            const sale = ventas.find((row) => row.id === Number(deleteButton.dataset.delete));
            if (sale) {
                deleteSale(sale).then((deleted) => {
                    if (deleted) {
                        loadSales();
                    }
                });
            }
        }
    });

    root.querySelector('[data-refresh]').addEventListener('click', async () => {
        await loadSales();
        toast('Historial de ventas actualizado.', 'info');
    });

    await loadSales(true);
}
