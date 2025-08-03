// public/js/theme-manager.js

import { fetchAPI } from './utils.js';

/**
 * Aplica la configuración visual al documento.
 * @param {object} config - El objeto de configuración con las propiedades del tema.
 */
function aplicarConfiguracionVisual(config) {
    const root = document.documentElement;
    const defaults = {
        color_primario: '#FFB6C1',
        color_secundario: '#FFD1DC',
        color_accento: '#FFD700',
        color_fondo: '#FFF9FB',
        color_tarjetas: '#FFFFFF',
        color_texto: '#5D3B45',
        color_texto_claro: '#A78B94',
        color_bordes: '#F0D6DE',
        fuente_principal: "'Comic Neue', cursive",
        tamano_fuente: '16px'
    };

    root.style.setProperty('--color-primario', config.color_primario || defaults.color_primario);
    root.style.setProperty('--color-secundario', config.color_secundario || defaults.color_secundario);
    root.style.setProperty('--color-accento', config.color_accento || defaults.color_accento);
    root.style.setProperty('--color-fondo', config.color_fondo || defaults.color_fondo);
    root.style.setProperty('--color-tarjetas', config.color_tarjetas || defaults.color_tarjetas);
    root.style.setProperty('--color-texto', config.color_texto || defaults.color_texto);
    root.style.setProperty('--color-texto-claro', config.color_texto_claro || defaults.color_texto_claro);
    root.style.setProperty('--color-bordes', config.color_bordes || defaults.color_bordes);
    root.style.setProperty('--fuente-principal', config.fuente_principal || defaults.fuente_principal);
    root.style.setProperty('--tamano-fuente', config.tamano_fuente || defaults.tamano_fuente);
}

/**
 * Carga y aplica la configuración de tema del diario activo.
 * @param {number} diarioId - El ID del diario activo.
 */
export async function cargarYAplicarTema(diarioId) {
    if (!diarioId) {
        console.warn('No hay un diario activo. Se aplicarán estilos por defecto.');
        aplicarConfiguracionVisual({});
        return;
    }
    try {
        const response = await fetchAPI(`/api/diarios/${diarioId}/config`);

        const config = response; // fetchAPI ya devuelve el JSON parseado

        if (config) {
            const temaConfig = config.config_tema_json ? JSON.parse(config.config_tema_json) : {};
            aplicarConfiguracionVisual(temaConfig);
        } else {
            aplicarConfiguracionVisual({});
        }
    } catch (error) {
        console.error('Fallo al cargar y aplicar tema:', error);
        aplicarConfiguracionVisual({});
    }
}