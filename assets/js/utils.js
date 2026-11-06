export const CONFIG = Object.assign(
    {
        store: 'Mercado Central',
        currency: 'MXN',
        locale: 'es-MX',
        lowStockThreshold: 10,
    },
    window.APP_CONFIG || {}
);

const moneyFormatter = new Intl.NumberFormat(CONFIG.locale, {
    style: 'currency',
    currency: CONFIG.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(CONFIG.locale);

export function money(value) {
    return moneyFormatter.format(Number(value) || 0);
}

export function number(value) {
    return numberFormatter.format(Number(value) || 0);
}

export function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function normalize(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function initials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return 'C';
    }

    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function parseDate(value) {
    if (!value) {
        return null;
    }

    const normalizedValue = String(value).includes('T')
        ? String(value)
        : String(value).replace(' ', 'T');

    const date = new Date(normalizedValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options = {}) {
    const date = value instanceof Date ? value : parseDate(value);
    if (!date) {
        return '—';
    }

    return new Intl.DateTimeFormat(CONFIG.locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options,
    }).format(date);
}

export function formatDateTime(value, options = {}) {
    const date = value instanceof Date ? value : parseDate(value);
    if (!date) {
        return '—';
    }

    return new Intl.DateTimeFormat(CONFIG.locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    }).format(date);
}

export function formatTime(value) {
    const date = value instanceof Date ? value : parseDate(value);
    if (!date) {
        return '—';
    }

    return new Intl.DateTimeFormat(CONFIG.locale, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatWeekday(value) {
    const date = value instanceof Date ? value : parseDate(`${value}T12:00:00`);
    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat(CONFIG.locale, {
        weekday: 'short',
    }).format(date);
}

export function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function todayISO() {
    return toISODate(new Date());
}

export function daysAgoISO(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - Number(days || 0));
    return toISODate(date);
}

export function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(Number(value), min), max);
}

export function debounce(fn, wait = 240) {
    let timer;
    return function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}

export function sum(items, selector = (item) => item) {
    return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

export function pctChange(current, previous) {
    const now = Number(current) || 0;
    const before = Number(previous) || 0;

    if (before === 0) {
        return now === 0
            ? { direction: 'flat', label: 'Sin cambios' }
            : { direction: 'up', label: '+100%' };
    }

    const change = ((now - before) / Math.abs(before)) * 100;
    return {
        direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat',
        label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    };
}

export function folio(id) {
    return `V-${String(id ?? 0).padStart(6, '0')}`;
}

export const PAYMENT_LABELS = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
};

export function paymentLabel(method) {
    return PAYMENT_LABELS[method] || 'Efectivo';
}

export function paymentBadgeClass(method) {
    if (method === 'tarjeta') {
        return 'badge-blue';
    }
    if (method === 'transferencia') {
        return 'badge-purple';
    }
    return 'badge-green';
}

const CASHIER_KEY = 'superpos.cashier';

export function getCashier() {
    try {
        return localStorage.getItem(CASHIER_KEY)?.trim() || 'Cajero';
    } catch {
        return 'Cajero';
    }
}

export function setCashier(name) {
    const clean = String(name || '').trim().slice(0, 40) || 'Cajero';
    try {
        localStorage.setItem(CASHIER_KEY, clean);
    } catch {
        /* almacenamiento no disponible */
    }
    return clean;
}

export function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Buenos días';
    }
    if (hour < 19) {
        return 'Buenas tardes';
    }
    return 'Buenas noches';
}
