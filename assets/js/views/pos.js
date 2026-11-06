import { api } from '../api.js';
import { icons } from '../icons.js';
import { categoryVisual, productVisual, stockInfo, thumbStyle } from '../catalog.js';
import { confirmDialog, emptyState, openModal, setButtonLoading, toast } from '../ui.js';
import { openTicketModal } from '../ticket.js';
import {
    CONFIG,
    esc,
    folio,
    money,
    normalize,
    number,
    round2,
} from '../utils.js';

const CART_KEY = 'superpos.cart.v1';

function readCartState() {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
        if (raw && Array.isArray(raw.items)) {
            return raw;
        }
    } catch {
        /* almacenamiento no disponible */
    }
    return { items: [], customerId: '' };
}

function writeCartState(items, customerId) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify({ items, customerId }));
    } catch {
        /* almacenamiento no disponible */
    }
}

export async function renderPos(root) {
    const [productsResponse, categoriesResponse, clientsResponse] = await Promise.all([
        api.productos.list(),
        api.categorias.list(),
        api.clientes.list(),
    ]);

    let productos = productsResponse.items;
    let categorias = categoriesResponse.items;
    let clientes = clientsResponse.items;

    const saved = readCartState();
    let search = '';
    let activeCategory = 'all';
    let customerId = saved.customerId ? String(saved.customerId) : '';
    let cart = [];
    let adjustedCart = false;

    if (customerId && !clientes.some((client) => String(client.id) === customerId)) {
        customerId = '';
    }

    saved.items.forEach((item) => {
        const product = productos.find((row) => row.id === Number(item.producto_id));
        if (!product || product.stock <= 0) {
            adjustedCart = true;
            return;
        }

        let quantity = Math.max(1, Number(item.cantidad) || 1);
        if (quantity > product.stock) {
            quantity = product.stock;
            adjustedCart = true;
        }

        const existing = cart.find((line) => line.producto.id === product.id);
        if (existing) {
            existing.cantidad = Math.min(existing.cantidad + quantity, product.stock);
        } else {
            cart.push({ producto: product, cantidad: quantity });
        }
    });

    root.innerHTML = `
        <div class="pos-layout">
            <section class="pos-catalog" aria-label="Catálogo de productos">
                <div class="pos-toolbar">
                    <div class="pos-search">
                        ${icons.search}
                        <input
                            class="input"
                            type="search"
                            data-pos-search
                            placeholder="Busca por nombre o escanea un código de barras…"
                            autocomplete="off"
                            aria-label="Buscar producto"
                        >
                        <kbd>F2</kbd>
                    </div>
                    <div class="category-scroller" data-categories aria-label="Filtrar por categoría"></div>
                </div>

                <div class="pos-results-bar">
                    <span data-results-label>Productos disponibles</span>
                    <span>Toca un producto para agregarlo</span>
                </div>

                <div class="pos-products-wrap" data-products-wrap>
                    <div class="product-grid" data-products></div>
                </div>
            </section>

            <aside class="cart-panel" id="cartPanel" aria-label="Carrito de venta">
                <div class="cart-head">
                    <span class="cart-head-icon">${icons.cart}</span>
                    <div class="cart-head-text">
                        <h2>Venta actual</h2>
                        <span data-cart-subtitle>Carrito vacío</span>
                    </div>
                    <span class="cart-count" data-cart-count>0</span>
                    <button class="cart-clear" type="button" data-clear-cart>Vaciar</button>
                    <button class="icon-btn cart-mobile-close" type="button" data-cart-close aria-label="Cerrar carrito">
                        ${icons.x}
                    </button>
                </div>

                <div class="cart-customer">
                    <div class="customer-select-wrap">
                        ${icons.user}
                        <select class="select" data-customer aria-label="Cliente de la venta">
                            <option value="">Público general</option>
                        </select>
                    </div>
                </div>

                <div class="cart-body" data-cart-items></div>

                <div class="cart-foot">
                    <div class="cart-summary">
                        <div class="summary-row">
                            <span>Artículos</span>
                            <span data-summary-count>0</span>
                        </div>
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span data-summary-subtotal>${money(0)}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total</span>
                            <span data-summary-total>${money(0)}</span>
                        </div>
                        <div class="summary-tax">Precios con IVA incluido</div>
                    </div>

                    <button class="pay-btn" type="button" id="payBtn" data-pay disabled>
                        ${icons.wallet}
                        <span>Cobrar</span>
                        <span class="pay-btn-total" data-pay-total>${money(0)}</span>
                    </button>

                    <div class="cart-hint">
                        <kbd>F4</kbd> para cobrar · <kbd>F2</kbd> para buscar
                    </div>
                </div>
            </aside>

            <div class="cart-backdrop" data-cart-backdrop></div>

            <button class="cart-fab" type="button" data-open-cart aria-label="Abrir carrito">
                ${icons.cart}
                <span class="cart-fab-count" data-fab-count>0</span>
                <span class="cart-fab-total" data-fab-total>${money(0)}</span>
            </button>
        </div>
    `;

    const productsGrid = root.querySelector('[data-products]');
    const productsWrap = root.querySelector('[data-products-wrap]');
    const categoriesEl = root.querySelector('[data-categories]');
    const resultsLabel = root.querySelector('[data-results-label]');
    const searchInput = root.querySelector('[data-pos-search]');
    const cartBody = root.querySelector('[data-cart-items]');
    const cartPanel = root.querySelector('#cartPanel');
    const cartBackdrop = root.querySelector('[data-cart-backdrop]');
    const cartFab = root.querySelector('[data-open-cart]');
    const customerSelect = root.querySelector('[data-customer]');
    const payButton = root.querySelector('[data-pay]');
    const cartSubtitle = root.querySelector('[data-cart-subtitle]');
    const clearButton = root.querySelector('[data-clear-cart]');
    const summaryCount = root.querySelector('[data-summary-count]');
    const summarySubtotal = root.querySelector('[data-summary-subtotal]');
    const summaryTotal = root.querySelector('[data-summary-total]');
    const payTotal = root.querySelector('[data-pay-total]');
    const fabCount = root.querySelector('[data-fab-count]');
    const fabTotal = root.querySelector('[data-fab-total]');

    function categoryProductCount(categoryId) {
        return productos.filter((product) => String(product.categoria_id) === String(categoryId)).length;
    }

    function renderCategories() {
        const chips = [
            {
                id: 'all',
                nombre: 'Todos',
                emoji: '🛒',
                bg: '#eef4ec',
                count: productos.length,
            },
            ...categorias.map((category) => {
                const visual = categoryVisual(category.nombre);
                return {
                    id: String(category.id),
                    nombre: category.nombre,
                    emoji: visual.emoji,
                    bg: visual.bg,
                    count: categoryProductCount(category.id),
                };
            }),
        ];

        categoriesEl.innerHTML = chips.map((chip) => `
            <button
                class="category-chip ${activeCategory === chip.id ? 'active' : ''}"
                type="button"
                data-cat="${chip.id}"
                style="--cat-bg:${chip.bg}"
            >
                <span class="emoji">${chip.emoji}</span>
                <span>${esc(chip.nombre)}</span>
                <span class="chip-count">${chip.count}</span>
            </button>
        `).join('');
    }

    function renderCustomerSelect() {
        customerSelect.innerHTML = `
            <option value="">Público general</option>
            ${clientes.map((client) => `
                <option value="${client.id}">${esc(client.nombre_completo || `${client.nombre} ${client.apellido}`)}</option>
            `).join('')}
        `;
        customerSelect.value = customerId;
    }

    function filteredProducts() {
        const term = normalize(search);
        return productos
            .filter((product) => {
                const categoryMatch = activeCategory === 'all'
                    || String(product.categoria_id) === activeCategory;
                const searchMatch = !term
                    || normalize(product.nombre).includes(term)
                    || normalize(product.codigo).includes(term);
                return categoryMatch && searchMatch;
            })
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }

    function renderProducts() {
        const list = filteredProducts();
        const totalText = list.length === 1 ? 'producto' : 'productos';
        resultsLabel.innerHTML = `<strong>${number(list.length)}</strong> ${totalText}${search ? ` para “${esc(search)}”` : ''}`;

        if (list.length === 0) {
            productsGrid.innerHTML = `
                <div class="pos-empty">
                    ${emptyState({
                        icon: 'search',
                        title: 'No encontramos productos',
                        message: 'Prueba con otro nombre, código o cambia de categoría.',
                        actionHtml: '<button class="btn btn-secondary btn-sm" type="button" data-reset-filters>Limpiar filtros</button>',
                    })}
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = list.map((product) => {
            const visual = productVisual(product);
            const stock = stockInfo(product);
            const out = product.stock <= 0;

            return `
                <button
                    class="product-card ${out ? 'is-out' : ''}"
                    type="button"
                    data-add="${product.id}"
                    ${out ? 'disabled' : ''}
                    aria-label="${esc(product.nombre)} · ${money(product.precio)}"
                >
                    <span class="product-art" style="${thumbStyle(visual)}">${visual.emoji}</span>
                    <span class="product-info">
                        <span class="product-name">${esc(product.nombre)}</span>
                        <span class="product-meta">
                            <span class="product-price">${money(product.precio)}</span>
                            <span class="product-stock ${stock.state}">
                                <span class="stock-dot"></span>
                                ${out ? 'Agotado' : `${product.stock} pza`}
                            </span>
                        </span>
                    </span>
                    <span class="product-add" aria-hidden="true">${icons.plus}</span>
                </button>
            `;
        }).join('');
    }

    function cartTotals() {
        return {
            items: cart.reduce((total, line) => total + line.cantidad, 0),
            total: round2(cart.reduce((total, line) => total + line.producto.precio * line.cantidad, 0)),
        };
    }

    function renderCart() {
        const totals = cartTotals();

        root.querySelector('[data-cart-count]').textContent = totals.items;
        summaryCount.textContent = totals.items;
        summarySubtotal.textContent = money(totals.total);
        summaryTotal.textContent = money(totals.total);
        payTotal.textContent = money(totals.total);
        fabCount.textContent = totals.items;
        fabTotal.textContent = money(totals.total);
        cartSubtitle.textContent = totals.items > 0
            ? `${totals.items} artículo${totals.items === 1 ? '' : 's'} en el carrito`
            : 'Carrito vacío';

        payButton.disabled = cart.length === 0;
        clearButton.disabled = cart.length === 0;

        if (cart.length === 0) {
            cartBody.innerHTML = `
                <div class="cart-empty">
                    <span class="cart-empty-icon">${icons.emptyCart}</span>
                    <strong>El carrito está vacío</strong>
                    <span>Busca o escanea productos para comenzar una venta.</span>
                </div>
            `;
            saveCart();
            return;
        }

        cartBody.innerHTML = cart.map((line) => {
            const product = line.producto;
            const visual = productVisual(product);
            const lineTotal = round2(product.precio * line.cantidad);

            return `
                <div class="cart-line" data-line="${product.id}">
                    <span class="cart-line-art" style="${thumbStyle(visual)}">${visual.emoji}</span>
                    <div class="cart-line-info">
                        <span class="cart-line-name" title="${esc(product.nombre)}">${esc(product.nombre)}</span>
                        <div class="cart-line-meta">
                            <div class="qty">
                                <button type="button" data-qty="-1" data-id="${product.id}" aria-label="Quitar una unidad">${icons.minus}</button>
                                <input
                                    type="number"
                                    value="${line.cantidad}"
                                    min="1"
                                    max="${product.stock}"
                                    data-qty-input
                                    data-id="${product.id}"
                                    aria-label="Cantidad de ${esc(product.nombre)}"
                                >
                                <button type="button" data-qty="1" data-id="${product.id}" aria-label="Agregar una unidad">${icons.plus}</button>
                            </div>
                            <span class="cart-line-price">${money(product.precio)} c/u</span>
                        </div>
                    </div>
                    <div class="cart-line-side">
                        <span class="cart-line-total">${money(lineTotal)}</span>
                        <button class="cart-line-remove" type="button" data-remove="${product.id}" aria-label="Quitar ${esc(product.nombre)}">
                            ${icons.trash}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        saveCart();
    }

    function saveCart() {
        writeCartState(
            cart.map((line) => ({ producto_id: line.producto.id, cantidad: line.cantidad })),
            customerId
        );
    }

    function addToCart(product, quantity = 1) {
        if (!product || product.stock <= 0) {
            toast('Ese producto está agotado.', 'warning');
            return;
        }

        const existing = cart.find((line) => line.producto.id === product.id);
        const nextQuantity = (existing?.cantidad || 0) + quantity;

        if (nextQuantity > product.stock) {
            toast(
                `Solo hay ${product.stock} unidad${product.stock === 1 ? '' : 'es'} de ${product.nombre}.`,
                'warning'
            );
            return;
        }

        if (existing) {
            existing.cantidad = nextQuantity;
        } else {
            cart.push({ producto: product, cantidad: quantity });
        }

        renderCart();

        const card = productsGrid.querySelector(`[data-add="${product.id}"]`);
        if (card) {
            card.classList.add('added');
            setTimeout(() => card.classList.remove('added'), 300);
        }
    }

    function changeQuantity(productId, delta) {
        const line = cart.find((item) => item.producto.id === Number(productId));
        if (!line) {
            return;
        }

        const next = line.cantidad + delta;
        if (next <= 0) {
            cart = cart.filter((item) => item.producto.id !== Number(productId));
        } else if (next > line.producto.stock) {
            toast(`Stock máximo disponible: ${line.producto.stock}.`, 'warning');
            return;
        } else {
            line.cantidad = next;
        }

        renderCart();
    }

    function setQuantity(productId, value) {
        const line = cart.find((item) => item.producto.id === Number(productId));
        if (!line) {
            return;
        }

        const parsed = Math.floor(Number(value));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            cart = cart.filter((item) => item.producto.id !== Number(productId));
        } else if (parsed > line.producto.stock) {
            line.cantidad = line.producto.stock;
            toast(`Stock máximo disponible: ${line.producto.stock}.`, 'warning');
        } else {
            line.cantidad = parsed;
        }

        renderCart();
    }

    function openMobileCart() {
        cartPanel.classList.add('open');
        cartBackdrop.classList.add('show');
        cartFab.classList.add('hide');
    }

    function closeMobileCart() {
        cartPanel.classList.remove('open');
        cartBackdrop.classList.remove('show');
        cartFab.classList.remove('hide');
    }

    async function reloadProducts() {
        const response = await api.productos.list();
        productos = response.items;

        cart = cart.map((line) => {
            const updated = productos.find((product) => product.id === line.producto.id);
            if (!updated || updated.stock <= 0) {
                adjustedCart = true;
                return null;
            }
            const quantity = Math.min(line.cantidad, updated.stock);
            if (quantity < line.cantidad) {
                adjustedCart = true;
            }
            return { producto: updated, cantidad: quantity };
        }).filter(Boolean);

        if (adjustedCart) {
            toast('Actualizamos el carrito por cambios en el stock.', 'warning');
            adjustedCart = false;
        }

        renderCategories();
        renderProducts();
        renderCart();
        renderCustomerSelect();
    }

    function paymentMethodButton(method, label, icon) {
        return `
            <button class="method-btn" type="button" data-method="${method}">
                ${icons[icon]}
                <span>${label}</span>
            </button>
        `;
    }

    function quickCashAmounts(total) {
        const candidates = [
            total,
            Math.ceil(total / 50) * 50,
            Math.ceil(total / 100) * 100,
            Math.ceil(total / 200) * 200,
            Math.ceil(total / 500) * 500,
        ];

        return [...new Set(candidates.map((value) => round2(value)))]
            .filter((value) => value >= total)
            .slice(0, 5);
    }

    function openPaymentModal() {
        if (cart.length === 0) {
            return;
        }

        const totals = cartTotals();
        const total = totals.total;
        let method = 'efectivo';
        let cashReceived = total;
        const amounts = quickCashAmounts(total);

        const modal = openModal({
            title: 'Cobrar venta',
            subtitle: `${totals.items} artículo${totals.items === 1 ? '' : 's'} · ${money(total)}`,
            icon: 'wallet',
            body: `
                <div class="pay-summary">
                    <div class="pay-summary-label">
                        <span>Total a cobrar</span>
                        <small>${totals.items} artículo${totals.items === 1 ? '' : 's'} · IVA incluido</small>
                    </div>
                    <strong class="pay-total">${money(total)}</strong>
                </div>

                <div class="field mt-16">
                    <label>Método de pago</label>
                    <div class="method-grid">
                        ${paymentMethodButton('efectivo', 'Efectivo', 'cash')}
                        ${paymentMethodButton('tarjeta', 'Tarjeta', 'card')}
                        ${paymentMethodButton('transferencia', 'Transferencia', 'transfer')}
                    </div>
                </div>

                <div class="cash-box" data-cash-box>
                    <div class="field">
                        <label for="cash-received">Efectivo recibido</label>
                        <div class="input-prefix">
                            <span>$</span>
                            <input
                                class="input"
                                id="cash-received"
                                type="number"
                                min="0"
                                step="0.01"
                                inputmode="decimal"
                                value="${total.toFixed(2)}"
                                data-cash-input
                            >
                        </div>
                    </div>
                    <div class="quick-cash">
                        ${amounts.map((amount) => `
                            <button type="button" data-cash-amount="${amount}">${money(amount)}</button>
                        `).join('')}
                    </div>
                    <div class="change-box" data-change-box>
                        <span>Cambio</span>
                        <strong data-change>${money(0)}</strong>
                    </div>
                </div>

                <div class="pay-error" data-pay-error role="alert"></div>
            `,
            footer: `
                <button class="btn btn-ghost" type="button" data-pay-cancel>Cancelar</button>
                <button class="btn btn-primary btn-lg" type="button" data-pay-confirm>
                    ${icons.check}
                    <span>Confirmar cobro</span>
                </button>
            `,
            size: 'modal-sm',
            onMount: ({ root: modalRoot }) => {
                const cashBox = modalRoot.querySelector('[data-cash-box]');
                const cashInput = modalRoot.querySelector('[data-cash-input]');
                const changeBox = modalRoot.querySelector('[data-change-box]');
                const changeLabel = changeBox.querySelector('span');
                const changeValue = modalRoot.querySelector('[data-change]');
                const errorBox = modalRoot.querySelector('[data-pay-error]');
                const confirmButton = modalRoot.querySelector('[data-pay-confirm]');

                const updateChange = () => {
                    const cash = Number(cashInput.value) || 0;
                    const difference = round2(cash - total);
                    const missing = difference < 0;

                    changeBox.classList.toggle('negative', missing && method === 'efectivo');
                    changeLabel.textContent = missing ? 'Falta' : 'Cambio';
                    changeValue.textContent = money(Math.abs(difference));
                };

                const setMethod = (nextMethod) => {
                    method = nextMethod;
                    modalRoot.querySelectorAll('[data-method]').forEach((button) => {
                        button.classList.toggle('active', button.dataset.method === method);
                    });
                    cashBox.classList.toggle('hide', method !== 'efectivo');
                    errorBox.classList.remove('show');
                    updateChange();
                    if (method === 'efectivo') {
                        cashInput.focus();
                        cashInput.select();
                    }
                };

                modalRoot.querySelectorAll('[data-method]').forEach((button) => {
                    button.addEventListener('click', () => setMethod(button.dataset.method));
                });

                cashInput.addEventListener('input', () => {
                    cashReceived = Number(cashInput.value) || 0;
                    errorBox.classList.remove('show');
                    updateChange();
                });

                modalRoot.querySelectorAll('[data-cash-amount]').forEach((button) => {
                    button.addEventListener('click', () => {
                        cashReceived = Number(button.dataset.cashAmount) || 0;
                        cashInput.value = cashReceived.toFixed(2);
                        errorBox.classList.remove('show');
                        updateChange();
                        cashInput.focus();
                    });
                });

                modalRoot.querySelector('[data-pay-cancel]')?.addEventListener('click', () => modal.close());

                confirmButton.addEventListener('click', async () => {
                    cashReceived = Number(cashInput.value) || 0;

                    if (method === 'efectivo' && cashReceived < total) {
                        errorBox.textContent = `Faltan ${money(total - cashReceived)} para cubrir el total.`;
                        errorBox.classList.add('show');
                        cashInput.focus();
                        return;
                    }

                    errorBox.classList.remove('show');
                    setButtonLoading(confirmButton, true, 'Procesando…');

                    try {
                        const sale = await api.ventas.create({
                            cliente_id: customerId ? Number(customerId) : null,
                            metodo_pago: method,
                            items: cart.map((line) => ({
                                producto_id: line.producto.id,
                                cantidad: line.cantidad,
                            })),
                        });

                        modal.close();

                        const change = method === 'efectivo' ? round2(cashReceived - total) : null;
                        const cashForTicket = method === 'efectivo' ? cashReceived : null;

                        cart = [];
                        customerId = '';
                        saveCart();
                        renderCart();
                        renderCustomerSelect();

                        toast(`Venta ${folio(sale.id)} registrada por ${money(sale.total)}.`, 'success', 'Cobro exitoso');
                        openTicketModal(sale, {
                            cashReceived: cashForTicket,
                            change,
                        });

                        reloadProducts().catch(() => {
                            /* El ticket ya está visible; el stock se refrescará al volver. */
                        });
                    } catch (error) {
                        setButtonLoading(confirmButton, false);
                        errorBox.textContent = error.message || 'No se pudo registrar la venta.';
                        errorBox.classList.add('show');

                        if (error.status === 409 || error.status === 422) {
                            reloadProducts().catch(() => {});
                        }
                    }
                });

                setMethod('efectivo');
            },
        });

        return modal;
    }

    function handleSearchKeydown(event) {
        if (event.key !== 'Enter') {
            return;
        }

        const value = searchInput.value.trim();
        if (value === '') {
            return;
        }

        const exact = productos.find((product) => normalize(product.codigo || '') === normalize(value));
        const options = filteredProducts();

        if (exact) {
            addToCart(exact);
            searchInput.value = '';
            search = '';
            renderProducts();
            return;
        }

        if (options.length === 1) {
            addToCart(options[0]);
            searchInput.value = '';
            search = '';
            renderProducts();
        }
    }

    searchInput.addEventListener('input', () => {
        search = searchInput.value;
        renderProducts();
    });
    searchInput.addEventListener('keydown', handleSearchKeydown);

    categoriesEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-cat]');
        if (!button) {
            return;
        }
        activeCategory = button.dataset.cat;
        renderCategories();
        renderProducts();
        productsWrap.scrollTop = 0;
    });

    productsGrid.addEventListener('click', (event) => {
        const resetButton = event.target.closest('[data-reset-filters]');
        if (resetButton) {
            search = '';
            searchInput.value = '';
            activeCategory = 'all';
            renderCategories();
            renderProducts();
            searchInput.focus();
            return;
        }

        const button = event.target.closest('[data-add]');
        if (!button) {
            return;
        }
        const product = productos.find((row) => row.id === Number(button.dataset.add));
        addToCart(product);
    });

    cartBody.addEventListener('click', (event) => {
        const qtyButton = event.target.closest('[data-qty]');
        if (qtyButton) {
            changeQuantity(qtyButton.dataset.id, Number(qtyButton.dataset.qty));
            return;
        }

        const removeButton = event.target.closest('[data-remove]');
        if (removeButton) {
            cart = cart.filter((line) => line.producto.id !== Number(removeButton.dataset.remove));
            renderCart();
        }
    });

    cartBody.addEventListener('change', (event) => {
        const input = event.target.closest('[data-qty-input]');
        if (input) {
            setQuantity(input.dataset.id, input.value);
        }
    });

    customerSelect.addEventListener('change', () => {
        customerId = customerSelect.value;
        saveCart();
    });

    clearButton.addEventListener('click', async () => {
        if (cart.length === 0) {
            return;
        }

        const confirmed = await confirmDialog({
            title: '¿Vaciar el carrito?',
            subtitle: 'Se quitarán todos los productos de la venta actual.',
            message: `Se eliminarán <strong>${cartTotals().items} artículo(s)</strong> del carrito. Esta acción no afecta al inventario.`,
            confirmText: 'Sí, vaciar',
            cancelText: 'Mantener productos',
            danger: true,
            icon: 'emptyCart',
        });

        if (confirmed) {
            cart = [];
            renderCart();
            toast('Carrito vaciado.', 'info');
        }
    });

    payButton.addEventListener('click', openPaymentModal);

    root.querySelector('[data-open-cart]').addEventListener('click', openMobileCart);
    root.querySelector('[data-cart-close]').addEventListener('click', closeMobileCart);
    cartBackdrop.addEventListener('click', closeMobileCart);

    const onWindowKeydown = (event) => {
        if (event.key === 'Escape' && cartPanel.classList.contains('open')) {
            closeMobileCart();
        }
    };
    window.addEventListener('keydown', onWindowKeydown);

    renderCategories();
    renderProducts();
    renderCart();
    renderCustomerSelect();

    if (adjustedCart) {
        toast('Se ajustó el carrito guardado por cambios de stock.', 'warning');
    }

    setTimeout(() => searchInput.focus({ preventScroll: true }), 80);

    return () => {
        window.removeEventListener('keydown', onWindowKeydown);
    };
}
