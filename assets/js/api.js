const BASE = new URL('api/', document.baseURI).href.replace(/\/+$/, '');

export class ApiError extends Error {
    constructor(message, status = 0, errors = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors || {};
    }
}

function buildUrl(path, query) {
    const cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;
    const url = new URL(`${BASE}${cleanPath}`);

    if (query && typeof query === 'object') {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }

    return url;
}

async function request(path, options = {}) {
    const { method = 'GET', body, query } = options;
    const url = buildUrl(path, query);

    let response;
    try {
        response = await fetch(url, {
            method,
            headers: {
                Accept: 'application/json',
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            credentials: 'same-origin',
            cache: 'no-store',
        });
    } catch {
        throw new ApiError(
            'No se pudo conectar con el servidor. Verifica que Apache y MariaDB estén en ejecución.',
            0
        );
    }

    const text = await response.text();
    let payload = null;

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            throw new ApiError('El servidor devolvió una respuesta no válida.', response.status);
        }
    }

    if (!response.ok || payload?.ok === false) {
        throw new ApiError(
            payload?.message || `Ocurrió un error (${response.status}).`,
            response.status,
            payload?.errors || {}
        );
    }

    return payload?.data ?? null;
}

const crud = (resource) => ({
    list: (query) => request(`/${resource}`, { query }),
    get: (id) => request(`/${resource}/${id}`),
    create: (data) => request(`/${resource}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/${resource}/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
});

export const api = {
    health: () => request('/health'),
    dashboard: () => request('/dashboard'),
    categorias: crud('categorias'),
    productos: crud('productos'),
    clientes: crud('clientes'),
    ventas: crud('ventas'),
};
