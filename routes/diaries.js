// routes/diaries.js
import express from 'express';
import * as db from '../db/index.js';
import { requireDiaryAccess } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Obtener todos los diarios del usuario
router.get('/diarios', requireAuth, async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    const diarios = await db.getQuery(
      `SELECT d.id, d.baby_name FROM diarios d
       JOIN diarios_acceso da ON d.id = da.diario_id
       WHERE da.usuario_id = ?`,
      [usuarioId]
    );
    res.json({ diarios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los diarios.' });
  }
});

// Crear un nuevo diario
router.post(
  '/diarios',
  requireAuth,
  body('baby_name').trim().notEmpty().isLength({ max: 50 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Nombre inválido del bebé.' });
    }

    try {
      const usuarioId = req.session.user.id;
      const { baby_name } = req.body;
      const result = await db.runQuery('INSERT INTO diarios (baby_name) VALUES (?)', [baby_name]);
      const diarioId = result.lastID;
      await db.runQuery(
        'INSERT INTO diarios_acceso (diario_id, usuario_id, rol) VALUES (?, ?, ?)',
        [diarioId, usuarioId, 'owner']
      );
      res.status(201).json({ id: diarioId, baby_name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al crear el diario.' });
    }
  }
);

// Establecer el diario activo
router.put('/diarios/activo', requireAuth, body('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ID inválido del diario.' });
  }

  try {
    const { id } = req.body;
    const usuarioId = req.session.user.id;

    const acceso = await db.getQuery(
      'SELECT * FROM diarios_acceso WHERE diario_id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
    if (!acceso) return res.status(403).json({ error: 'Acceso denegado al diario.' });

    req.session.user.active_diario_id = id;
    await db.runQuery(
      'UPDATE diarios_acceso SET last_accessed_at = CURRENT_TIMESTAMP WHERE diario_id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al establecer el diario activo.' });
  }
});

// Obtener configuración del diario
router.get('/diarios/:id/config', requireAuth, requireDiaryAccess, async (req, res) => {
  try {
    const diarioId = req.params.id;
    const config = await db.getQuery('SELECT config_tema_json FROM diarios_acceso WHERE diario_id = ? AND usuario_id = ?', [diarioId, req.session.user.id]);
    res.json({ config: config?.config_tema_json || '{}' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener configuración.' });
  }
});

// Guardar configuración del diario
router.put(
  '/diarios/:id/config',
  requireAuth,
  requireDiaryAccess,
  body('config').notEmpty().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Configuración inválida.' });
    }

    try {
      const diarioId = req.params.id;
      const config = req.body.config;
      await db.runQuery('UPDATE diarios_acceso SET config_tema_json = ? WHERE diario_id = ? AND usuario_id = ?', [config, diarioId, req.session.user.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar configuración.' });
    }
  }
);

export default router;
