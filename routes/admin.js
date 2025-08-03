// routes/admin.js
import express from 'express';
import { body, validationResult, param } from 'express-validator';
import { getQuery, allQuery, runQuery } from '../db/index.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @api {get} /admin/site-settings Obtener la configuración global del sitio
 */
export async function getGlobalConfig() {
    return await getQuery('SELECT * FROM site_config WHERE id = 1');
}

/**
 * @api {get} /admin/stats Obtener estadísticas del panel de administración
 */
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = {
            totalUsuarios: (await getQuery('SELECT COUNT(*) AS count FROM usuarios')).count,
            totalDiarios: (await getQuery('SELECT COUNT(*) AS count FROM diarios')).count,
            totalEventos: (await getQuery('SELECT COUNT(*) AS count FROM eventos')).count
        };
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas de admin:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

/**
 * @api {put} /admin/site-settings Actualizar la configuración global del sitio
 */
router.put('/admin/site-settings',
    requireAuth,
    requireAdmin,
    [
        body('siteGlobalName').trim().isLength({ min: 1, max: 255 }).withMessage('El nombre global del sitio es obligatorio y no puede exceder 255 caracteres.'),
        body('allowNewRegistrations').isBoolean().withMessage('El valor de permitir registros debe ser booleano.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { siteGlobalName, allowNewRegistrations } = req.body;
        try {
            await runQuery('UPDATE site_config SET site_global_name = ?, allow_new_registrations = ? WHERE id = 1', [siteGlobalName, allowNewRegistrations]);
            res.status(200).json({ message: 'Configuración del sitio actualizada.' });
        } catch (error) {
            console.error('Error al actualizar la configuración del sitio:', error);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    }
);

/**
 * @api {get} /admin/usuarios Obtener lista de usuarios
 */
router.get('/admin/usuarios', requireAuth, requireAdmin, async (req, res) => {
    try {
        const usuarios = await allQuery('SELECT id, nombre, email, rol FROM usuarios');
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener la lista de usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

/**
 * @api {delete} /admin/usuarios/:id Eliminar un usuario
 */
router.delete('/admin/usuarios/:id', requireAuth, requireAdmin,
    param('id').isInt({ gt: 0 }).withMessage('ID de usuario inválido.'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }
        
        const { id } = req.params;
        const usuarioIdEnSesion = req.session.user.id; // ID del usuario que hace la petición
        
        // **Validación de seguridad agregada**
        if (parseInt(id, 10) === usuarioIdEnSesion) {
            return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
        }

        try {
            await runQuery('DELETE FROM usuarios WHERE id = ?', [id]);
            res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    }
);

export default router;