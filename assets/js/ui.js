import { icons } from './icons.js';
import { esc } from './utils.js';

const TOAST_META = {
    success: { title: 'Listo', icon: 'check' },
    error: { title: 'No se pudo completar', icon: 'alert' },
    warning: { title: 'Atención', icon: 'alert' },
    info: { title: 'Información', icon: 'info' },
};

export function toast(message, type = 'success', title = null) {
    const stack = document.getElementById('toast-root');
    if (!stack) {
        return;
    }

    while (stack.children.length >= 4) {
        stack.firstElementChild?.remove();
    }

    const meta = TOAST_META[type] || TOAST_META.success;
    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    element.setAttribute('role', type === 'error' ? 'alert' : 'status');
    element.innerHTML = `
        <span class="toast-icon">${icons[meta.icon]}</span>
        <span class="toast-body">
            <strong>${esc(title || meta.title)}</strong>
            <span>${esc(message)}</span>
        </span>
    `;

    stack.appendChild(element);

    const remove = () => {
        if (!element.isConnected) {
            return;
        }
        element.classList.add('leaving');
        setTimeout(() => element.remove(), 210);
    };

    const timer = setTimeout(remove, type === 'error' ? 6000 : 4200);
    element.addEventListener('click', () => {
        clearTimeout(timer);
        remove();
    });
}

function focusables(container) {
    return [...container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function openModal(options = {}) {
    const {
        title = '',
        subtitle = '',
        body = '',
        footer = '',
        size = '',
        icon = '',
        iconTone = '',
        className = '',
        closeOnBackdrop = true,
        onMount = null,
        onClose = null,
    } = options;

    const root = document.getElementById('modal-root');
    if (!root) {
        throw new Error('No existe el contenedor de modales.');
    }

    const previouslyFocused = document.activeElement;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const iconHtml = icon && icons[icon]
        ? `<span class="modal-head-icon ${iconTone}">${icons[icon]}</span>`
        : '';

    backdrop.innerHTML = `
        <div class="modal-card ${size} ${className}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-head">
                ${iconHtml}
                <div class="modal-title-wrap">
                    <h2 class="modal-title" id="modal-title">${esc(title)}</h2>
                    ${subtitle ? `<p class="modal-subtitle">${esc(subtitle)}</p>` : ''}
                </div>
                <button class="icon-btn modal-close" type="button" aria-label="Cerrar">${icons.x}</button>
            </div>
            <div class="modal-body">${body}</div>
            ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
        </div>
    `;

    root.appendChild(backdrop);
    document.body.classList.add('modal-open');

    let closed = false;

    const close = () => {
        if (closed) {
            return;
        }
        closed = true;
        document.removeEventListener('keydown', onKeyDown);
        backdrop.remove();

        if (!root.querySelector('.modal-backdrop')) {
            document.body.classList.remove('modal-open');
        }

        previouslyFocused?.focus?.({ preventScroll: true });
        onClose?.();
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const items = focusables(backdrop);
        if (items.length === 0) {
            return;
        }

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    document.addEventListener('keydown', onKeyDown);

    backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop && closeOnBackdrop) {
            close();
        }
    });

    backdrop.querySelector('.modal-close')?.addEventListener('click', close);

    const card = backdrop.querySelector('.modal-card');
    const bodyElement = backdrop.querySelector('.modal-body');
    const footerElement = backdrop.querySelector('.modal-foot');

    setTimeout(() => {
        const target = backdrop.querySelector(
            '[data-autofocus], .modal-body input:not([type="hidden"]), .modal-body select, .modal-body textarea, .modal-foot .btn-primary, .modal-close'
        );
        target?.focus?.({ preventScroll: true });
    }, 40);

    onMount?.({
        root: backdrop,
        card,
        body: bodyElement,
        footer: footerElement,
        close,
    });

    return { root: backdrop, card, body: bodyElement, footer: footerElement, close };
}

export function confirmDialog(options = {}) {
    const {
        title = '¿Confirmas esta acción?',
        subtitle = '',
        message = '',
        confirmText = 'Eliminar',
        cancelText = 'Cancelar',
        danger = true,
        icon = 'alert',
    } = options;

    return new Promise((resolve) => {
        let settled = false;

        const modal = openModal({
            title,
            subtitle,
            size: 'modal-sm',
            icon,
            iconTone: danger ? 'danger' : '',
            closeOnBackdrop: true,
            body: `<p class="confirm-message">${message}</p>`,
            footer: `
                <button class="btn btn-secondary" type="button" data-confirm-cancel>${esc(cancelText)}</button>
                <button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" type="button" data-confirm-ok>${esc(confirmText)}</button>
            `,
            onClose: () => {
                if (!settled) {
                    settled = true;
                    resolve(false);
                }
            },
            onMount: ({ root }) => {
                root.querySelector('[data-confirm-cancel]')?.addEventListener('click', () => {
                    settled = true;
                    resolve(false);
                    modal.close();
                });
                root.querySelector('[data-confirm-ok]')?.addEventListener('click', () => {
                    settled = true;
                    resolve(true);
                    modal.close();
                });
            },
        });
    });
}

export function emptyState(options = {}) {
    const {
        icon = 'box',
        title = 'Sin resultados',
        message = '',
        actionHtml = '',
    } = options;

    return `
        <div class="empty">
            <span class="empty-icon">${icons[icon] || icons.box}</span>
            <h3>${esc(title)}</h3>
            ${message ? `<p>${esc(message)}</p>` : ''}
            ${actionHtml}
        </div>
    `;
}

export function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach((node) => node.remove());
    form.querySelectorAll('.input-error').forEach((node) => node.classList.remove('input-error'));
    form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
}

export function applyFieldErrors(form, errors = {}) {
    clearFieldErrors(form);
    let firstInvalid = null;

    Object.entries(errors || {}).forEach(([name, message]) => {
        let input = null;
        try {
            input = form.querySelector(`[name="${CSS.escape(name)}"]`);
        } catch {
            input = null;
        }

        if (!input) {
            return;
        }

        input.classList.add('input-error');
        input.setAttribute('aria-invalid', 'true');

        const field = input.closest('.field');
        if (field && !field.querySelector('.field-error')) {
            const error = document.createElement('p');
            error.className = 'field-error';
            error.textContent = message;
            field.appendChild(error);
        }

        if (!firstInvalid) {
            firstInvalid = input;
        }
    });

    firstInvalid?.focus?.({ preventScroll: false });
}

export function formValues(form) {
    const values = {};
    new FormData(form).forEach((value, key) => {
        values[key] = typeof value === 'string' ? value.trim() : value;
    });
    return values;
}

export function setButtonLoading(button, loading, text = 'Guardando…') {
    if (!button) {
        return;
    }

    if (loading) {
        if (!button.dataset.originalHtml) {
            button.dataset.originalHtml = button.innerHTML;
        }
        button.disabled = true;
        button.innerHTML = `<span class="spinner spinner-sm" aria-hidden="true"></span><span>${esc(text)}</span>`;
    } else {
        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
            delete button.dataset.originalHtml;
        }
    }
}

export function pageLoader(label = 'Cargando información…') {
    return `
        <div class="page-loader" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <span>${esc(label)}</span>
        </div>
    `;
}
