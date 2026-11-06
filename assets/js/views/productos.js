import { api } from '../api.js';
import { icons } from '../icons.js';
import { categoryVisual, productVisual, stockInfo, thumbStyle } from '../catalog.js';
import {
    applyFieldErrors,
    confirmDialog,
    emptyState,
    formValues,
    openModal,
    setButtonLoading,
    toast,
} from '../ui.js';
import { esc, money, normalize, number, round2 } from '../utils.js';

export async function renderProductos(root, params) {
    let productos = [];
    let categorias = [];
    let filters = {
        q: '',
        categoria: params?.get('cat') || 'all',
        estado: params?.get('estado') || 'all',
    };

    root.innerHTML = `
        <div class="page">
            <div class="page-head">
                <div class="page-head-text">
                    <span class="eyebrow">Catálogo</span>
                    <h2>Productos</h2>
                    <p class="page-subtitle">Administra precios, existencias y códigos de barras de tu supermercado.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" type="button" data-refresh>${icons.refresh}<span>Actualizar</span></button>
                    <button class="btn btn-primary" type="button" data-new>${icons.plus}<span>Nuevo producto</span></button>
                </div>
            </div>

            <div class="summary-inline">
                <span><strong data-stat-total>0</strong> productos</span>
                <span class="dot"></span>
                <span><strong data-stat-low>0</strong> con stock bajo</span>
                <span class="dot"></span>
                <span><strong data-stat-value>${money(0)}</strong> en inventario</span>
            </div>

            <div class="toolbar">
                <div class="search">
                    ${icons.search}
                    <input class="input" type="search" data-search placeholder="Buscar por nombre o código…" autocomplete="off">
                </div>
                <div class="toolbar-group">
                    <select class="select filter-select" data-filter-category aria-label="Filtrar por categoría">
                        <option value="all">Todas las categorías</option>
                    </select>
                    <select class="select filter-select" data-filter-stock aria-label="Filtrar por stock">
                        <option value="all">Todo el stock</option>
                        <option value="disponible">Disponible</option>
                        <option value="bajo">Stock bajo</option>
                        <option value="agotado">Agotado</option>
                    </select>
                </div>
            </div>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th class="text-right">Precio</th>
                            <th>Stock</th>
                            <th class="text-right">Valor</th>
                            <th aria-label="Acciones"></th>
                        </tr>
                    </thead>
                    <tbody data-rows></tbody>
                </table>
            </div>
        </div>
    `;

    const searchInput = root.querySelector('[data-search]');
    const categoryFilter = root.querySelector('[data-filter-category]');
    const stockFilter = root.querySelector('[data-filter-stock]');
    const rows = root.querySelector('[data-rows]');
    const statTotal = root.querySelector('[data-stat-total]');
    const statLow = root.querySelector('[data-stat-low]');
    const statValue = root.querySelector('[data-stat-value]');

    categoryFilter.value = filters.categoria;
    stockFilter.value = filters.estado;

    function renderCategoryOptions() {
        const current = String(filters.categoria || 'all');
        categoryFilter.innerHTML = `
            <option value="all">Todas las categorías</option>
            ${categorias.map((category) => `<option value="${category.id}">${esc(category.nombre)}</option>`).join('')}
        `;
        const exists = categorias.some((category) => String(category.id) === current);
        categoryFilter.value = exists ? current : 'all';
        filters.categoria = categoryFilter.value;
    }

    function filtered() {
        const term = normalize(filters.q);
        return productos.filter((product) => {
            const categoryMatch = filters.categoria === 'all'
                || String(product.categoria_id) === filters.categoria;
            const stockState = stockInfo(product).state;
            const stockMatch = filters.estado === 'all' || stockState === filters.estado;
            const searchMatch = !term
                || normalize(product.nombre).includes(term)
                || normalize(product.codigo).includes(term);
            return categoryMatch && stockMatch && searchMatch;
        });
    }

    function renderRows() {
        const list = filtered();
        const lowStock = list.filter((product) => product.stock > 0 && product.stock <= 10).length;
        const inventoryValue = round2(list.reduce((total, product) => total + product.precio * product.stock, 0));

        statTotal.textContent = number(list.length);
        statLow.textContent = number(lowStock);
        statValue.textContent = money(inventoryValue);

        if (list.length === 0) {
            rows.innerHTML = `
                <tr>
                    <td colspan="6">
                        ${emptyState({
                            icon: 'search',
                            title: 'No hay productos con esos filtros',
                            message: 'Prueba con otra búsqueda o limpia los filtros para ver todo el catálogo.',
                            actionHtml: '<button class="btn btn-secondary btn-sm" type="button" data-clear-filters>Limpiar filtros</button>',
                        })}
                    </td>
                </tr>
            `;
            return;
        }

        rows.innerHTML = list.map((product) => {
            const visual = productVisual(product);
            const stock = stockInfo(product);
            const categoryVisualData = categoryVisual(product.categoria);

            return `
                <tr>
                    <td>
                        <div class="prod-cell">
                            <span class="mini-thumb" style="${thumbStyle(visual)}">${visual.emoji}</span>
                            <div class="cell-main">
                                <strong>${esc(product.nombre)}</strong>
                                <small class="mono">${esc(product.codigo || 'Sin código')}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge badge-neutral">${categoryVisualData.emoji} ${esc(product.categoria || 'Sin categoría')}</span>
                    </td>
                    <td class="num text-right"><strong>${money(product.precio)}</strong></td>
                    <td>
                        <span class="badge ${stock.badge}">
                            <span class="stock-dot"></span>
                            ${product.stock <= 0 ? 'Agotado' : `${product.stock} pza`}
                        </span>
                    </td>
                    <td class="num text-right text-muted">${money(product.precio * product.stock)}</td>
                    <td>
                        <div class="cell-actions">
                            <button class="icon-btn" type="button" data-edit="${product.id}" aria-label="Editar ${esc(product.nombre)}" title="Editar">${icons.edit}</button>
                            <button class="icon-btn danger" type="button" data-delete="${product.id}" aria-label="Eliminar ${esc(product.nombre)}" title="Eliminar">${icons.trash}</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function reload() {
        const response = await api.productos.list();
        productos = response.items;
        renderRows();
    }

    function openProductForm(product = null) {
        const editing = Boolean(product);
        const categoryOptions = [
            '<option value="">Sin categoría</option>',
            ...categorias.map((category) => `
                <option value="${category.id}" ${product && String(product.categoria_id) === String(category.id) ? 'selected' : ''}>
                    ${esc(category.nombre)}
                </option>
            `),
        ].join('');

        const modal = openModal({
            title: editing ? 'Editar producto' : 'Nuevo producto',
            subtitle: editing ? 'Actualiza la información del producto.' : 'Agrega un artículo al catálogo del supermercado.',
            icon: 'package',
            body: `
                <form id="product-form" novalidate>
                    <div class="form-grid">
                        <div class="field span-2">
                            <label for="product-name">Nombre <span class="required">*</span></label>
                            <input class="input" id="product-name" name="nombre" maxlength="100" required data-autofocus
                                value="${esc(product?.nombre || '')}" placeholder="Ej. Manzana roja">
                        </div>
                        <div class="field">
                            <label for="product-code">Código de barras / SKU</label>
                            <input class="input mono" id="product-code" name="codigo" maxlength="50"
                                value="${esc(product?.codigo || '')}" placeholder="7501234567890">
                            <span class="field-hint">Opcional. Si lo dejas vacío se genera automáticamente.</span>
                        </div>
                        <div class="field">
                            <label for="product-category">Categoría</label>
                            <select class="select" id="product-category" name="categoria_id">
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="field">
                            <label for="product-price">Precio de venta <span class="required">*</span></label>
                            <div class="input-prefix">
                                <span>$</span>
                                <input class="input" id="product-price" name="precio" type="number" min="0" step="0.01" required
                                    value="${product ? Number(product.precio).toFixed(2) : ''}" placeholder="0.00">
                            </div>
                        </div>
                        <div class="field">
                            <label for="product-stock">Existencias <span class="required">*</span></label>
                            <input class="input" id="product-stock" name="stock" type="number" min="0" step="1" required
                                value="${product ? product.stock : 0}" placeholder="0">
                        </div>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
                <button class="btn btn-primary" type="button" data-save>${icons.save}<span>${editing ? 'Guardar cambios' : 'Crear producto'}</span></button>
            `,
            size: 'modal-lg',
            onMount: ({ root: modalRoot }) => {
                const form = modalRoot.querySelector('#product-form');
                const saveButton = modalRoot.querySelector('[data-save]');

                modalRoot.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());

                const submit = async () => {
                    const values = formValues(form);
                    setButtonLoading(saveButton, true, editing ? 'Guardando…' : 'Creando…');

                    try {
                        if (editing) {
                            await api.productos.update(product.id, values);
                        } else {
                            await api.productos.create(values);
                        }

                        modal.close();
                        toast(
                            editing ? 'Producto actualizado correctamente.' : 'Producto agregado al catálogo.',
                            'success',
                            editing ? 'Cambios guardados' : 'Producto creado'
                        );
                        await reload();
                    } catch (error) {
                        setButtonLoading(saveButton, false);
                        if (error.errors && Object.keys(error.errors).length > 0) {
                            applyFieldErrors(form, error.errors);
                        }
                        toast(error.message, 'error');
                    }
                };

                form.addEventListener('submit', (event) => {
                    event.preventDefault();
                    submit();
                });
                saveButton.addEventListener('click', submit);
            },
        });

        return modal;
    }

    async function removeProduct(product) {
        const confirmed = await confirmDialog({
            title: 'Eliminar producto',
            subtitle: product.nombre,
            message: `¿Seguro que deseas eliminar <strong>${esc(product.nombre)}</strong>? Esta acción no se puede deshacer. Si tiene ventas registradas, no podrá eliminarse.`,
            confirmText: 'Eliminar producto',
            cancelText: 'Cancelar',
            icon: 'trash',
        });

        if (!confirmed) {
            return;
        }

        try {
            await api.productos.remove(product.id);
            toast('Producto eliminado del catálogo.', 'success');
            await reload();
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    searchInput.addEventListener('input', () => {
        filters.q = searchInput.value;
        renderRows();
    });

    categoryFilter.addEventListener('change', () => {
        filters.categoria = categoryFilter.value;
        renderRows();
    });

    stockFilter.addEventListener('change', () => {
        filters.estado = stockFilter.value;
        renderRows();
    });

    rows.addEventListener('click', (event) => {
        const clearButton = event.target.closest('[data-clear-filters]');
        if (clearButton) {
            filters = { q: '', categoria: 'all', estado: 'all' };
            searchInput.value = '';
            categoryFilter.value = 'all';
            stockFilter.value = 'all';
            renderRows();
            return;
        }

        const editButton = event.target.closest('[data-edit]');
        if (editButton) {
            const product = productos.find((row) => row.id === Number(editButton.dataset.edit));
            if (product) {
                openProductForm(product);
            }
            return;
        }

        const deleteButton = event.target.closest('[data-delete]');
        if (deleteButton) {
            const product = productos.find((row) => row.id === Number(deleteButton.dataset.delete));
            if (product) {
                removeProduct(product);
            }
        }
    });

    root.querySelector('[data-new]').addEventListener('click', () => openProductForm());
    root.querySelector('[data-refresh]').addEventListener('click', async () => {
        try {
            await reload();
            toast('Catálogo actualizado.', 'info');
        } catch (error) {
            toast(error.message, 'error');
        }
    });

    const productsResponse = await api.productos.list();
    const categoriesResponse = await api.categorias.list();
    productos = productsResponse.items;
    categorias = categoriesResponse.items;
    renderCategoryOptions();
    renderRows();
}
