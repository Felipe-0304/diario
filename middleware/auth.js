// middleware/auth.js
import { getQuery } from '../db/index.js';

/**
 * Middleware para asegurar que el usuario ha iniciado sesión.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        // Para peticiones de API (ej. AJAX), enviamos 401.
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        // Para peticiones de página completa, redirigimos.
        return res.redirect('/login.html');
    }
    next();
};

/**
 * Middleware para asegurar que el usuario es un administrador.
 * Asume que `requireAuth` se ha ejecutado primero.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador.' });
    }
    next();
};

/**
 * Middleware para verificar el acceso a un diario y establecer el rol.
 * Asume que `requireAuth` se ha ejecutado primero.
 * @param {string[]} requiredRoles - Array de roles permitidos (ej. ['owner', 'editor']).
 */
export const requireDiaryAccess = (requiredRoles) => {
    return async (req, res, next) => {
        const { diarioId } = req.params;
        const usuarioId = req.session.user.id;

        if (!diarioId) {
            return res.status(400).json({ error: 'ID del diario no proporcionado.' });
        }

        try {
            const acceso = await getQuery(
                `SELECT rol FROM diarios_acceso WHERE diario_id = ? AND usuario_id = ?`,
                [diarioId, usuarioId]
            );

            if (!acceso || !requiredRoles.includes(acceso.rol)) {
                return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
            }

            req.diarioId = diarioId; // Adjuntar el diarioId para facilitar su uso
            req.userRole = acceso.rol; // Adjuntar el rol para facilitar su uso
            next();
        } catch (error) {
            console.error('Error al verificar acceso al diario:', error);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    };
};