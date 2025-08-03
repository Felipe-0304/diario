// public/js/utils.js
'use strict';

/**
 * Realiza una petición a la API.
 * @param {string} endpoint - El endpoint de la API.
 * @param {string} [method='GET'] - El método HTTP.
 * @param {object|FormData|null} [body=null] - El cuerpo de la petición.
 * @param {boolean} [isFormData=false] - Indica si el cuerpo es FormData.
 * @returns {Promise<any>} - La respuesta de la API.
 * @throws {Error} Si la respuesta no es OK o hay un error de red.
 */

export async function fetchAPI(endpoint, method = 'GET', body = null, isFormData = false) {
    const options = {
        method: method,
        headers: {}
    };

    if (body) {
        if (isFormData) {
            options.body = body; // Multer maneja el Content-Type automáticamente
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(endpoint, options);

        if (response.status === 401) {
            console.warn('Usuario no autorizado o sesión expirada. Redirigiendo a login.');
            if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('/login')) {
                window.location.href = '/login.html';
            }
            return null; // O throw new Error('No autorizado');
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Error en API ${method} ${endpoint} (${response.status}): ${response.statusText}`;
            if (errorText) {
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage += ` - ${errorJson.error || errorText}`;
                } catch (e) {
                    errorMessage += ` - ${errorText}`;
                }
            }
            console.error('Error en API:', errorMessage);
            throw new Error(response.statusText || 'Error desconocido.');
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return await response.text();
        }
        
    } catch (error) {
        console.error(`Excepción en fetchAPI (${method} ${endpoint}):`, error);
        throw error;
    }
}

/**
 * Cierra la sesión del usuario y redirige a la página de login.
 */
export async function cerrarSesion() {
    try {
        await fetchAPI('/api/logout');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    } finally {
        window.location.href = 'login.html';
    }
}

/**
 * Muestra un mensaje global en la UI.
 * @param {string} mensaje - El mensaje a mostrar.
 * @param {'success'|'error'|'info'|'carga'} tipo - El tipo de mensaje para aplicar estilos.
 * @param {HTMLElement} contenedor - El contenedor donde se mostrará el mensaje.
 */
export function mostrarMensajeGlobal(mensaje, tipo, contenedor) {
    if (!contenedor) return;
    contenedor.textContent = mensaje;
    contenedor.className = `alert alert-${tipo}`;
    if (mensaje) {
        contenedor.style.display = 'block';
    } else {
        contenedor.style.display = 'none';
    }
}

/**
 * Establece el título de la página con el nombre del diario.
 * @param {string} nombreDiario - El nombre del diario.
 */
export function setTituloDiario(nombreDiario) {
    const tituloBase = 'Diario del Bebé';
    document.title = nombreDiario ? `${nombreDiario} | ${tituloBase}` : tituloBase;
}

/**
 * Establece el nombre del diario en la UI.
 * @param {string} nombreDiario - El nombre del diario.
 */
export function setNombreDiarioUI(nombreDiario) {
    const nombreDiarioEl = document.getElementById('nombre-diario-actual');
    if (nombreDiarioEl) {
        nombreDiarioEl.textContent = nombreDiario || 'Diario no seleccionado';
    }
}

/**
 * Actualiza el año en el pie de página.
 */
function actualizarAnioFooter() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear().toString();
    }
}

/**
 * Muestra un mensaje en un elemento específico del DOM.
 * @param {string} texto - El texto del mensaje.
 * @param {'exito'|'error'|'carga'|'info'|'vacio'} tipo - El tipo de mensaje (usado para clases CSS).
 * @param {HTMLElement|string} elementoOId - El elemento HTML o su ID donde mostrar el mensaje.
 * @param {number} [timeout=0] - Tiempo en milisegundos para ocultar el mensaje automáticamente. 0 para no ocultar.
 */
function mostrarMensajeGlobal(texto, tipo, elementoOId, timeout = 0) {
    const elemento = typeof elementoOId === 'string' ? document.getElementById(elementoOId) : elementoOId;
    if (!elemento) {
        console.warn("Elemento para mostrar mensaje no encontrado:", elementoOId);
        return;
    }

    elemento.textContent = texto;
    elemento.className = `mensaje mensaje-${tipo}`;
    elemento.style.display = texto ? 'block' : 'none';

    if (timeout > 0) {
        setTimeout(() => {
            if (elemento.textContent === texto) { 
                elemento.style.display = 'none';
                elemento.textContent = '';
                elemento.className = 'mensaje'; 
            }
        }, timeout);
    }
}

/**
 * Obtiene el ID del diario activo actualmente.
 * @returns {number|null} El ID del diario activo o null si no está definido.
 */
function getActiveDiarioId() {
    const storedId = sessionStorage.getItem('activeDiarioId');
    return storedId ? parseInt(storedId, 10) : null;
}

/**
 * Establece el ID del diario activo.
 * @param {number|null} diarioId - El ID del diario a establecer como activo.
 */
function setActiveDiarioId(diarioId) {
    const currentId = getActiveDiarioId();
    if (currentId !== diarioId) {
        if (diarioId) {
            sessionStorage.setItem('activeDiarioId', diarioId.toString());
        } else {
            sessionStorage.removeItem('activeDiarioId');
        }
        window.dispatchEvent(new CustomEvent('activeDiarioChanged', { detail: { diarioId } }));
    }
}


/**
 * Añade o quita el estado de carga a un botón, mostrando un spinner.
 * @param {HTMLButtonElement} boton - El elemento del botón a modificar.
 * @param {boolean} cargando - `true` para activar el estado de carga, `false` para desactivarlo.
 * @param {string} [textoCarga='Guardando...'] - El texto a mostrar durante la carga.
 */
function setBotonCargando(boton, cargando, textoCarga = 'Guardando...') {
    if (!boton) return;

    if (cargando) {
        boton.disabled = true;
        if (!boton.dataset.originalText) {
            boton.dataset.originalText = boton.innerHTML;
        }
        boton.innerHTML = `
            <span class="spinner"></span>
            <span>${textoCarga}</span>
        `;
    } else {
        boton.disabled = false;
        if (boton.dataset.originalText) {
            boton.innerHTML = boton.dataset.originalText;
            // Limpiar el dataset para la próxima vez
            delete boton.dataset.originalText;
        }
    }
}

/**
 * Encapsula la lógica de inicialización para páginas que dependen de un diario activo.
 * Encuentra los elementos comunes de la UI, carga el diario y la configuración,
 * y ejecuta un callback con la configuración cargada.
 * @param {function(object): void} callbackConConfig - Función que se ejecuta si se carga un diario, recibe el objeto de configuración.
 */
async function inicializarPaginaConDiario(callbackConConfig) {
    const elementosComunes = {
        globalMessageEl: document.querySelector('#global-index-message, #global-config-message, #global-gallery-message, #global-calendar-message, #global-timeline-message'),
        diarioActivoInfoEl: document.querySelector('.diario-activo-info, .diario-activo-fotos-info, .diario-activo-timeline-info, .diario-activo-config-info'),
        nombreDiarioActualEl: document.querySelector('#nombre-diario-actual-fotos, #nombre-diario-actual-timeline, #nombre-diario-actual-config, #nombre-diario-activo'),
        tituloPrincipalEl: document.querySelector('#titulo-principal-fotos, #titulo-principal-timeline, #titulo-principal-config, #nombre-app-titulo, #titulo-principal-calendario')
    };

    let activeDiarioId = getActiveDiarioId();
    let configDiarioActual;

    try {
        if (!activeDiarioId) {
            const diarios = await fetchAPI('/api/diarios');
            if (diarios && diarios.length > 0) {
                activeDiarioId = diarios[0].id; // El primer diario es el último accedido
                setActiveDiarioId(activeDiarioId);
            } else {
                if (elementosComunes.globalMessageEl) {
                    mostrarMensajeGlobal('No tienes diarios. Ve a Configuración para crear uno.', 'info', elementosComunes.globalMessageEl);
                }
                document.body.classList.add('sin-diario-activo'); // Clase para deshabilitar UI si es necesario
                return;
            }
        }
        
        configDiarioActual = await fetchAPI('/api/configuracion');

        if (!configDiarioActual || configDiarioActual.diario_id !== activeDiarioId) {
            setActiveDiarioId(null);
            return inicializarPaginaConDiario(callbackConConfig);
        }

        if (elementosComunes.diarioActivoInfoEl && elementosComunes.nombreDiarioActualEl) {
            elementosComunes.nombreDiarioActualEl.textContent = configDiarioActual.nombre_diario_personalizado || `Diario ID: ${activeDiarioId}`;
            elementosComunes.diarioActivoInfoEl.style.display = 'block';
        }

        if (elementosComunes.tituloPrincipalEl && configDiarioActual.nombre_diario_personalizado) {
            const tituloOriginal = elementosComunes.tituloPrincipalEl.textContent;
            const emoji = tituloOriginal.split(' ')[0];
            const tituloBase = document.title.split(' - ')[1] || 'Mi Pequeño Tesoro';
            elementosComunes.tituloPrincipalEl.textContent = `${emoji} ${configDiarioActual.nombre_diario_personalizado}`;
            document.title = `${configDiarioActual.nombre_diario_personalizado} - ${tituloBase}`;
        }
        
        if (callbackConConfig && typeof callbackConConfig === 'function') {
            callbackConConfig(configDiarioActual);
        }

    } catch (error) {
        if (error.message !== 'No autorizado') {
            console.error("Error fatal en la inicialización de la página:", error);
            if (elementosComunes.globalMessageEl) {
                mostrarMensajeGlobal('Error crítico al cargar los datos del diario. Recarga la página.', 'error', elementosComunes.globalMessageEl);
            }
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    actualizarAnioFooter();
});
