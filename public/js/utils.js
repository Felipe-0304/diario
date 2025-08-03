// public/js/utils.js
'use strict';

/**
 * Muestra un mensaje temporal en la parte superior de la página.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - 'success' o 'error'.
 */
function mostrarMensaje(message, type = 'success') {
    const container = document.createElement('div');
    container.className = `mensaje-flotante ${type}`;
    container.textContent = message;
    document.body.appendChild(container);

    setTimeout(() => {
        container.remove();
    }, 4000);
}

/**
 * Muestra u oculta el spinner de carga global.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function toggleSpinner(show) {
    let spinner = document.getElementById('global-spinner');
    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            document.body.appendChild(spinner);
        }
        spinner.style.display = 'block';
    } else {
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
}

/**
 * Wrapper centralizado para todas las peticiones fetch a la API.
 * Automáticamente maneja el token CSRF, el spinner de carga y los errores.
 * @param {string} url - La URL del endpoint de la API.
 * @param {object} options - Las opciones de configuración de fetch (method, body, etc.).
 * @returns {Promise<any>} - La respuesta JSON de la API.
 */
async function fetchAPI(url, options = {}) {
    toggleSpinner(true);
    try {
        // Para métodos que no son GET y que no son FormData, obtenemos y añadimos el token CSRF.
        const isModifyingMethod = options.method && options.method.toUpperCase() !== 'GET';
        const isNotFormData = !(options.body instanceof FormData);

        if (isModifyingMethod && isNotFormData) {
            const tokenResponse = await fetch('/api/csrf-token');
            if (!tokenResponse.ok) throw new Error('No se pudo obtener el token de seguridad.');
            const { csrfToken } = await tokenResponse.json();

            options.headers = {
                ...options.headers,
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            };
        }
        
        // Convertimos el body a JSON si no es FormData
        if (options.body && isNotFormData) {
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido en el servidor' }));
            
            // Manejo de errores de validación de express-validator
            if (errorData.errors) {
                const errorMessages = errorData.errors.map(e => e.msg).join('\n');
                throw new Error(errorMessages);
            }
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        // Si la respuesta no tiene contenido (ej. DELETE exitoso)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null;
        }

        return await response.json();

    } catch (error) {
        mostrarMensaje(error.message, 'error');
        console.error('Error en fetchAPI:', error);
        throw error; // Propaga el error para que el código que llama pueda manejarlo si es necesario.
    } finally {
        toggleSpinner(false);
    }
}

/**
 * Formatea una fecha en formato 'DD/MM/YYYY'.
 * @param {string | Date} dateString - La fecha a formatear.
 * @returns {string} - La fecha formateada.
 */
function formatoFecha(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

