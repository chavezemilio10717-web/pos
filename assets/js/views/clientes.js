import { api } from '../api.js';
import { icons } from '../icons.js';
import {
    applyFieldErrors,
    confirmDialog,
    emptyState,
    formValues,
    openModal,
    setButtonLoading,
    toast,
} from '../ui.js';
import { esc, formatDate, initials, money, normalize, number, sum } from '../utils.js';

export async function renderClientes(root) {
    let clientes = [];
    let search = '';

    root.innerHTML = `
        <div class="page">
            <div class="page-head">
                <div class="page-head-text">
                    <span class="eyebrow">Relaciones</span>
                    <h2>Clientes</h2>
                    <p class="page-subtitle">Consulta el historial de compras y mantén actualizados los datos de contacto.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" type="button" data-refresh>${icons.refresh}<span>Actualizar</span></button>
                    <button class="btn btn-primary" type="button" data-new>${icons.plus}<span>Nuevo cliente</span></button>
                </div>
            </div>

            <div class="summary-inline">
                <span><strong data-stat-total>0</strong> clientes registrados</span>
                <span class="dot"></span>
                <span><strong data-stat-buyers>0</strong> con compras</span>
                <span class="dot"></span>
                <span><strong data-stat-spent>${money(0)}</strong> en ventas acumuladas</span>
            </div>

            <div class="toolbar">
                <div class="search">
                    ${icons.search}
                    <input class="input" type="search" data-search placeholder="Buscar por nombre, correo o teléfono…" autocomplete="off">
                </div>
                <div class="toolbar-spacer"></div>
                <span class="text-muted" data-result-count></span>
            </div>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Contacto</th>
                            <th class="text-right">Compras</th>
                            <th class="text-right">Total gastado</th>
                            <th>Última compra</th>
                            <th aria-label="Acciones"></th>
                        </tr>
                    </thead>
                    <tbody data-rows></tbody>
                </table>
            </div>
        </div>
    `;

    const rows = root.querySelector('[data-rows]');
    const searchInput = root.querySelector('[data-search]');
    const resultCount = root.querySelector('[data-result-count]');
    const statTotal = root.querySelector('[data-stat-total]');
    const statBuyers = root.querySelector('[data-stat-buyers]');
    const statSpent = root.querySelector('[data-stat-spent]');

    function renderStats() {
        statTotal.textContent = number(clientes.length);
        statBuyers.textContent = number(clientes.filter((client) => client.compras > 0).length);
        statSpent.textContent = money(sum(clientes, (client) => client.total_gastado));
    }

    function renderRows() {
        const term = normalize(search);
        const list = clientes
            .filter((client) => !term
                || normalize(client.nombre_completo).includes(term)
                || normalize(client.correo).includes(term)
                || normalize(client.telefono).includes(term))
            .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, 'es'));

        resultCount.textContent = `${list.length} de ${clientes.length} clientes`;

        if (list.length === 0) {
            rows.innerHTML = `
                <tr>
                    <td colspan="6">
                        ${emptyState({
                            icon: 'users',
                            title: clientes.length === 0 ? 'Aún no hay clientes' : 'No encontramos ese cliente',
                            message: clientes.length === 0
                                ? 'Registra clientes para asociar sus compras y consultar su historial.'
                                : 'Prueba con otro nombre, correo o teléfono.',
                            actionHtml: `<button class="btn btn-primary btn-sm" type="button" data-new-empty>${icons.plus}<span>Nuevo cliente</span></button>`,
                        })}
                    </td>
                </tr>
            `;
            return;
        }

        rows.innerHTML = list.map((client) => `
            <tr>
                <td>
                    <div class="prod-cell">
                        <span class="client-avatar">${esc(initials(client.nombre_completo))}</span>
                        <div class="cell-main">
                            <strong>${esc(client.nombre_completo)}</strong>
                            <small>${client.compras > 0 ? 'Cliente frecuente' : 'Cliente nuevo'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="cell-main">
                        <strong>${esc(client.correo || 'Sin correo')}</strong>
                        <small>${esc(client.telefono || 'Sin teléfono')}</small>
                    </div>
                </td>
                <td class="num text-right">
                    <span class="badge ${client.compras > 0 ? 'badge-green' : 'badge-neutral'}">${client.compras}</span>
                </td>
                <td class="num text-right"><strong>${money(client.total_gastado)}</strong></td>
                <td class="text-muted">${client.ultima_compra ? formatDate(client.ultima_compra) : 'Sin compras'}</td>
                <td>
                    <div class="cell-actions">
                        <button class="icon-btn" type="button" data-edit="${client.id}" aria-label="Editar ${esc(client.nombre_completo)}" title="Editar">${icons.edit}</button>
                        <button class="icon-btn danger" type="button" data-delete="${client.id}" aria-label="Eliminar ${esc(client.nombre_completo)}" title="Eliminar">${icons.trash}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function reload() {
        const response = await api.clientes.list();
        clientes = response.items;
        renderStats();
        renderRows();
    }

    function openClientForm(client = null) {
        const editing = Boolean(client);

        const modal = openModal({
            title: editing ? 'Editar cliente' : 'Nuevo cliente',
            subtitle: editing ? 'Actualiza los datos de contacto.' : 'Registra un cliente para dar seguimiento a sus compras.',
            icon: 'users',
            body: `
                <form id="client-form" novalidate>
                    <div class="form-grid">
                        <div class="field">
                            <label for="client-name">Nombre <span class="required">*</span></label>
                            <input class="input" id="client-name" name="nombre" maxlength="50" required data-autofocus
                                value="${esc(client?.nombre || '')}" placeholder="Ej. María">
                        </div>
                        <div class="field">
                            <label for="client-lastname">Apellido <span class="required">*</span></label>
                            <input class="input" id="client-lastname" name="apellido" maxlength="50" required
                                value="${esc(client?.apellido || '')}" placeholder="Ej. García">
                        </div>
                        <div class="field">
                            <label for="client-email">Correo electrónico</label>
                            <input class="input" id="client-email" name="correo" type="email" maxlength="100"
                                value="${esc(client?.correo || '')}" placeholder="cliente@correo.com">
                        </div>
                        <div class="field">
                            <label for="client-phone">Teléfono</label>
                            <input class="input" id="client-phone" name="telefono" maxlength="15" inputmode="tel"
                                value="${esc(client?.telefono || '')}" placeholder="555 123 4567">
                        </div>
                        <div class="span-2 modal-note">
                            ${icons.info}
                            <span>El correo y el teléfono son opcionales, pero ayudan a identificar al cliente en caja.</span>
                        </div>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
                <button class="btn btn-primary" type="button" data-save>${icons.save}<span>${editing ? 'Guardar cambios' : 'Crear cliente'}</span></button>
            `,
            onMount: ({ root: modalRoot }) => {
                const form = modalRoot.querySelector('#client-form');
                const saveButton = modalRoot.querySelector('[data-save]');

                modalRoot.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());

                const submit = async () => {
                    const values = formValues(form);
                    setButtonLoading(saveButton, true, editing ? 'Guardando…' : 'Creando…');

                    try {
                        if (editing) {
                            await api.clientes.update(client.id, values);
                        } else {
                            await api.clientes.create(values);
                        }

                        modal.close();
                        toast(
                            editing ? 'Cliente actualizado.' : 'Cliente registrado.',
                            'success',
                            editing ? 'Cambios guardados' : 'Cliente creado'
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

    async function removeClient(client) {
        const confirmed = await confirmDialog({
            title: 'Eliminar cliente',
            subtitle: client.nombre_completo,
            message: `¿Deseas eliminar a <strong>${esc(client.nombre_completo)}</strong>? Si tiene ventas registradas, no podrá eliminarse.`,
            confirmText: 'Eliminar cliente',
            cancelText: 'Cancelar',
            icon: 'trash',
        });

        if (!confirmed) {
            return;
        }

        try {
            await api.clientes.remove(client.id);
            toast('Cliente eliminado.', 'success');
            await reload();
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    searchInput.addEventListener('input', () => {
        search = searchInput.value;
        renderRows();
    });

    root.querySelector('.page').addEventListener('click', (event) => {
        const newButton = event.target.closest('[data-new], [data-new-empty]');
        if (newButton) {
            openClientForm();
            return;
        }

        const editButton = event.target.closest('[data-edit]');
        if (editButton) {
            const client = clientes.find((row) => row.id === Number(editButton.dataset.edit));
            if (client) {
                openClientForm(client);
            }
            return;
        }

        const deleteButton = event.target.closest('[data-delete]');
        if (deleteButton) {
            const client = clientes.find((row) => row.id === Number(deleteButton.dataset.delete));
            if (client) {
                removeClient(client);
            }
        }
    });

    root.querySelector('[data-refresh]').addEventListener('click', async () => {
        try {
            await reload();
            toast('Clientes actualizados.', 'info');
        } catch (error) {
            toast(error.message, 'error');
        }
    });

    const response = await api.clientes.list();
    clientes = response.items;
    renderStats();
    renderRows();
}
