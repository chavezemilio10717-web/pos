import { normalize } from './utils.js';

const VISUALS = [
    {
        keys: ['fruta', 'verdura', 'hortaliza', 'vegetal'],
        emoji: '🥬',
        bg: '#e8f7df',
        color: '#2f7d32',
    },
    {
        keys: ['carne', 'pescado', 'marisco', 'pollo', 'cerdo', 'res'],
        emoji: '🥩',
        bg: '#fdecea',
        color: '#b33a35',
    },
    {
        keys: ['lacteo', 'leche', 'huevo', 'queso', 'yogur'],
        emoji: '🥛',
        bg: '#edf3ff',
        color: '#3b5eae',
    },
    {
        keys: ['pan', 'panaderia', 'tortilla', 'reposteria'],
        emoji: '🥖',
        bg: '#fdf1dc',
        color: '#a76a18',
    },
    {
        keys: ['bebida', 'agua', 'refresco', 'jugo', 'cafe', 'cerveza', 'te'],
        emoji: '🥤',
        bg: '#e0f2fe',
        color: '#0369a1',
    },
    {
        keys: ['limpieza', 'detergente', 'hogar', 'cloro', 'jabon'],
        emoji: '🧽',
        bg: '#e0f7f1',
        color: '#0f766e',
    },
    {
        keys: ['cuidado', 'personal', 'higiene', 'belleza', 'shampoo'],
        emoji: '🧴',
        bg: '#fce7f3',
        color: '#9d174d',
    },
    {
        keys: ['despensa', 'abarrote', 'enlatado', 'grano', 'aceite'],
        emoji: '🥫',
        bg: '#fff4d6',
        color: '#a16207',
    },
    {
        keys: ['congelado', 'helado'],
        emoji: '🧊',
        bg: '#e0f2fe',
        color: '#0369a1',
    },
    {
        keys: ['mascota', 'animal'],
        emoji: '🐾',
        bg: '#f3e8ff',
        color: '#7e22ce',
    },
];

const FALLBACK = {
    emoji: '🛒',
    bg: '#eef4ec',
    color: '#4b6355',
};

export function categoryVisual(name) {
    const value = normalize(name);
    const visual = VISUALS.find((item) => item.keys.some((key) => value.includes(key)));
    return visual || FALLBACK;
}

export function productVisual(product) {
    return categoryVisual(product?.categoria || '');
}

export function stockInfo(product) {
    const stock = Number(product?.stock) || 0;
    const threshold = Number(window.APP_CONFIG?.lowStockThreshold) || 10;

    if (stock <= 0) {
        return { state: 'agotado', label: 'Agotado', badge: 'badge-red' };
    }
    if (stock <= threshold) {
        return { state: 'bajo', label: 'Stock bajo', badge: 'badge-amber' };
    }
    return { state: 'disponible', label: 'Disponible', badge: 'badge-green' };
}

export function thumbStyle(visual) {
    return `--thumb-bg:${visual.bg};--cat-bg:${visual.bg};`;
}
