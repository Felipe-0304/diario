const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const csrf = require('csurf');
const { body, validationResult } = require('express-validator');

const csrfProtection = csrf({ cookie: true });

// Todas las rutas en este archivo requieren ser admin
router.use(requireAdmin);

// Obtener métricas del sistema
router.get('/metrics', async (req, res) => {
    try {
        const totalUsers = await db.getQuery('SELECT COUNT(*) as count FROM usuarios');
        const totalDiaries = await db.getQuery('SELECT COUNT(*) as count FROM diarios');
        const totalEvents = await db.getQuery('SELECT COUNT(*) as count FROM eventos');
        res.json({
            totalUsers: totalUsers.count,
            totalDiaries: totalDiaries.count,
            totalEvents: totalEvents.count
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las métricas.' });
    }
});

// Obtener configuración global
router.get('/config', async (req, res) => {
    try {
        const config = await db.getQuery('SELECT * FROM site_config WHERE id = 1');
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la configuración.' });
    }
});

// Modificar configuración global
router.put('/config', csrfProtection, [
    body('site_global_name').trim().notEmpty().withMessage('El nombre del sitio es requerido.').isLength({ max: 50 }).escape(),
    body('allow_new_registrations').isBoolean().withMessage('El valor para permitir registros debe ser un booleano.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { site_global_name, allow_new_registrations } = req.body;
        await db.runQuery('UPDATE site_config SET site_global_name = ?, allow_new_registrations = ? WHERE id = 1', [site_global_name, allow_new_registrations]);
        res.json({ message: 'Configuración actualizada correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la configuración.' });
    }
});

// Listar usuarios
router.get('/users', async (req, res) => {
    try {
        const users = await db.getAllQuery('SELECT id, nombre, email, rol FROM usuarios');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar los usuarios.' });
    }
});

// Eliminar usuario
router.delete('/users/:id', csrfProtection, async (req, res) => {
    const { id } = req.params;

    if (req.session.user.id == id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
    }

    try {
        await db.runQuery('DELETE FROM usuarios WHERE id = ?', [id]);
        // Considerar eliminar datos asociados (diarios, eventos, etc.) o anonimizarlos.
        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el usuario.' });
    }
});

module.exports = router;
