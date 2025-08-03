// routes/events.js
import express from 'express';
import * as db from '../db/index.js';
import { requireDiaryAccess } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/:diarioId', requireAuth, requireDiaryAccess, async (req, res) => {
  try {
    const eventos = await db.getQuery(
      'SELECT * FROM eventos WHERE diario_id = ? ORDER BY fecha DESC',
      [req.params.diarioId]
    );
    res.json({ eventos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener eventos.' });
  }
});

router.post(
  '/:diarioId',
  requireAuth,
  requireDiaryAccess,
  upload.single('imagen'),
  body('tipo').isIn(['texto', 'foto', 'hito']),
  body('titulo').trim().notEmpty().isLength({ max: 100 }),
  body('descripcion').optional().isLength({ max: 500 }),
  body('fecha').isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: errors.array() });
    }

    try {
      const { tipo, titulo, descripcion, fecha } = req.body;
      const imagen = req.file ? req.file.filename : null;

      const result = await db.runQuery(
        'INSERT INTO eventos (diario_id, tipo, titulo, descripcion, fecha, imagen) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.diarioId, tipo, titulo, descripcion || '', fecha, imagen]
      );

      res.status(201).json({ id: result.lastID });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al crear evento.' });
    }
  }
);

router.delete('/:diarioId/:eventoId', requireAuth, requireDiaryAccess, async (req, res) => {
  try {
    const evento = await db.getQuery(
      'SELECT * FROM eventos WHERE id = ? AND diario_id = ?',
      [req.params.eventoId, req.params.diarioId]
    );
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado.' });

    if (evento.imagen) {
      const ruta = path.join('uploads', evento.imagen);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    await db.runQuery('DELETE FROM eventos WHERE id = ?', [req.params.eventoId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar evento.' });
  }
});

export default router;
