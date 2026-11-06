import { api } from '../api.js';
import { icons } from '../icons.js';
import { categoryVisual } from '../catalog.js';
import {
    applyFieldErrors,
    confirmDialog,
    emptyState,
    formValues,
    openModal,
    setButtonLoading,
    toast,
} from '../ui.js';
import { esc, money, normalize, number } from '../utils.js';

export async function renderCategorias(root) {
    let categorias = [];
    let search = '';

    root.innerHTML = `
        <div class="page">
            <div class="page-head">
                <div class="page-head-text">
                    <span class="eyebrow">Catálogo</span>
                    <h2>Categorías</h2>
                    <p class="page-subtitle">Organiza el catálogo por departamentos para encontrar todo más rápido en caja.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" type="button" data-refresh>${icons.refresh}<span>Actualizar</span></button>
                    <button class="btn btn-primary" type="button" data-new>${icons.plus}<span>Nueva categoría</span></button>
                </div>
            </div>

            <div class="summary-inline">
                <span><strong data-stat-categories>0</strong> categorías</span>
                <span class="dot"></span>
                <span><strong data-stat-products>0</strong> productos asignados</span>
                <span class="dot"></span>
                <span><strong data-stat-stock>0</strong> unidades en stock</span>
            </div>

            <div class="toolbar">
                <div class="search">
                    ${icons.search}
                    <input class="input" type="search" data-search placeholder="Buscar categoría…" autocomplete="off">
                </div>
                <div class="toolbar-spacer"></div>
                <span class="text-muted" data-result-count></span>
            </div>

            <div data-grid></div>
        </div>
    `;

    const grid = root.querySelector('[data-grid]');
    const searchInput = root.querySelector('[data-search]');
    const statCategories = root.querySelector('[data-stat-categories]');
    const statProducts = root.querySelector('[data-stat-products]');
    const statStock = root.querySelector('[data-stat-stock]');
    const resultCount = root.querySelector('[data-result-count]');

    function renderStats() {
        statCategories.textContent = number(categorias.length);
        statProducts.textContent = number(categorias.reduce((total, category) => total + category.productos, 0));
        statStock.textContent = number(categorias.reduce((total, category) => total + category.stock, 0));
    }

    function renderGrid() {
        const term = normalize(search);
        const list = categorias
            .filter((category) => !term
                || normalize(category.nombre).includes(term)
                || normalize(category.descripcion).includes(term))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

        resultCount.textContent = `${list.length} de ${categorias.length} categorías`;

        if (list.length === 0) {
            grid.innerHTML = `
                <div class="card">
                    ${emptyState({
                        icon: 'tags',
                        title: categorias.length === 0 ? 'Aún no hay categorías' : 'No encontramos esa categoría',
                        message: categorias.length === 0
                            ? 'Crea tu primera categoría para organizar los productos del supermercado.'
                            : 'Prueba con otra búsqueda o crea una categoría nueva.',
                        actionHtml: `<button class="btn btn-primary btn-sm" type="button" data-new-empty>${icons.plus}<span>Nueva categoría</span></button>`,
                    })}
                </div>
            `;
            return;
        }

        grid.innerHTML = `
            <div class="category-grid">
                ${list.map((category) => {
                    const visual = categoryVisual(category.nombre);
                    return `
                        <article class="category-card">
                            <div class="category-card-head">
                                <span class="category-icon" style="--cat-bg:${visual.bg}">${visual.emoji}</span>
                                <div class="category-card-title">
                                    <strong>${esc(category.nombre)}</strong>
                                    <span>${category.productos} producto${category.productos === 1 ? '' : 's'}</span>
                                </div>
                                <div class="cell-actions">
                                    <button class="icon-btn" type="button" data-edit="${category.id}" aria-label="Editar ${esc(category.nombre)}" title="Editar">${icons.edit}</button>
                                    <button class="icon-btn danger" type="button" data-delete="${category.id}" aria-label="Eliminar ${esc(category.nombre)}" title="Eliminar">${icons.trash}</button>
                                </div>
                            </div>

                            <p class="category-card-desc">${esc(category.descripcion || 'Sin descripción.')}</p>

                            <div class="category-card-foot">
                                <div class="category-stats">
                                    <span>Productos<strong>${category.productos}</strong></span>
                                    <span>Stock<strong>${number(category.stock)}</strong></span>
                                </div>
                                <a class="btn btn-sm btn-ghost" href="#/productos?cat=${category.id}">
                                    Ver productos ${icons.arrowRight}
                                </a>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        `;
    }

    async function reload() {
        const response = await api.categorias.list();
        categorias = response.items;
        renderStats();
        renderGrid();
    }

    function openCategoryForm(category = null) {
        const editing = Boolean(category);

        const modal = openModal({
            title: editing ? 'Editar categoría' : 'Nueva categoría',
            subtitle: editing ? 'Actualiza el nombre o la descripción.' : 'Crea un departamento para organizar tus productos.',
            icon: 'tags',
            body: `
                <form id="category-form" novalidate>
                    <div class="form-grid">
                        <div class="field span-2">
                            <label for="category-name">Nombre <span class="required">*</span></label>
                            <input class="input" id="category-name" name="nombre" maxlength="50" required data-autofocus
                                value="${esc(category?.nombre || '')}" placeholder="Ej. Frutas y verduras">
                        </div>
                        <div class="field span-2">
                            <label for="category-description">Descripción</label>
                            <textarea class="textarea" id="category-description" name="descripcion" maxlength="150"
                                placeholder="Una breve descripción del departamento…">${esc(category?.descripcion || '')}</textarea>
                            <span class="field-hint">Opcional, máximo 150 caracteres.</span>
                        </div>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
                <button class="btn btn-primary" type="button" data-save>${icons.save}<span>${editing ? 'Guardar cambios' : 'Crear categoría'}</span></button>
            `,
            size: 'modal-sm',
            onMount: ({ root: modalRoot }) => {
                const form = modalRoot.querySelector('#category-form');
                const saveButton = modalRoot.querySelector('[data-save]');

                modalRoot.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());

                const submit = async () => {
                    const values = formValues(form);
                    setButtonLoading(saveButton, true, editing ? 'Guardando…' : 'Creando…');

                    try {
                        if (editing) {
                            await api.categorias.update(category.id, values);
                        } else {
                            await api.categorias.create(values);
                        }

                        modal.close();
                        toast(
                            editing ? 'Categoría actualizada.' : 'Categoría creada.',
                            'success',
                            editing ? 'Cambios guardados' : 'Categoría creada'
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

    async function removeCategory(category) {
        const confirmed = await confirmDialog({
            title: 'Eliminar categoría',
            subtitle: category.nombre,
            message: `¿Deseas eliminar <strong>${esc(category.nombre)}</strong>? Solo es posible si no tiene productos asignados.`,
            confirmText: 'Eliminar categoría',
            cancelText: 'Cancelar',
            icon: 'trash',
        });

        if (!confirmed) {
            return;
        }

        try {
            await api.categorias.remove(category.id);
            toast('Categoría eliminada.', 'success');
            await reload();
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    searchInput.addEventListener('input', () => {
        search = searchInput.value;
        renderGrid();
    });

    root.querySelector('.page').addEventListener('click', (event) => {
        const newButton = event.target.closest('[data-new], [data-new-empty]');
        if (newButton) {
            openCategoryForm();
            return;
        }

        const editButton = event.target.closest('[data-edit]');
        if (editButton) {
            const category = categorias.find((row) => row.id === Number(editButton.dataset.edit));
            if (category) {
                openCategoryForm(category);
            }
            return;
        }

        const deleteButton = event.target.closest('[data-delete]');
        if (deleteButton) {
            const category = categorias.find((row) => row.id === Number(deleteButton.dataset.delete));
            if (category) {
                removeCategory(category);
            }
        }
    });

    root.querySelector('[data-refresh]').addEventListener('click', async () => {
        try {
            await reload();
            toast('Categorías actualizadas.', 'info');
        } catch (error) {
            toast(error.message, 'error');
        }
    });

    const response = await api.categorias.list();
    categorias = response.items;
    renderStats();
    renderGrid();
}
