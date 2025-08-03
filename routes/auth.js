// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { getQuery, runQuery } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getGlobalConfig } from './admin.js'; // Vamos a crear esta función en el módulo admin
import { loginLimiter } from '../middleware/rate-limiter.js'; // Importar el nuevo middleware

const router = express.Router();

/**
 * @api {post} /registro Registrar un nuevo usuario
 */
router.post('/registro',
    [
        body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
        body('email').trim().isEmail().withMessage('El email no es válido.'),
        body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { nombre, email, password } = req.body;

        try {
            const config = await getGlobalConfig();
            if (!config.allow_new_registrations) {
                return res.status(403).json({ error: 'El registro de nuevos usuarios está deshabilitado.' });
            }

            const existingUser = await getQuery('SELECT id FROM usuarios WHERE email = ?', [email]);
            if (existingUser) {
                return res.status(409).json({ error: 'Este email ya está registrado.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const userResult = await runQuery('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hashedPassword]);
            const newUserId = userResult.lastID;

            // Crear un diario por defecto para el nuevo usuario
            const diarioResult = await runQuery('INSERT INTO diarios (baby_name) VALUES (?)', [`Bebé de ${nombre}`]);
            const newDiarioId = diarioResult.lastID;

            // Asignar el diario al usuario con rol de propietario
            await runQuery('INSERT INTO diarios_acceso (diario_id, usuario_id, rol) VALUES (?, ?, ?)', [newDiarioId, newUserId, 'owner']);

            const newUser = { id: newUserId, nombre, email, rol: 'usuario', active_diario_id: newDiarioId };
            req.session.user = newUser;
            req.session.isPopulated = true;

            res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser });

        } catch (error) {
            console.error('Error en el registro:', error);
            res.status(500).json({ error: 'Error interno del servidor al registrar el usuario.' });
        }
    }
);

/**
 * @api {post} /login Iniciar sesión de usuario
 */
router.post('/login',
    loginLimiter, // Aplicar el limitador de peticiones aquí
    [
        body('email').trim().isEmail().withMessage('El email no es válido.'),
        body('password').isLength({ min: 1 }).withMessage('La contraseña no puede estar vacía.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { email, password } = req.body;

        try {
            const user = await getQuery('SELECT id, nombre, password, rol FROM usuarios WHERE email = ?', [email]);
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Credenciales inválidas.' });
            }

            // Obtener el diario principal del usuario
            const activeDiario = await getQuery(
                `SELECT diario_id FROM diarios_acceso WHERE usuario_id = ? ORDER BY last_accessed_at DESC LIMIT 1`,
                [user.id]
            );

            req.session.user = {
                id: user.id,
                nombre: user.nombre,
                email: email,
                rol: user.rol,
                active_diario_id: activeDiario?.diario_id
            };
            req.session.isPopulated = true;
            // --- AÑADE ESTE LOG ---
            console.log("Sesión establecida para el usuario:", req.session.user);

            res.status(200).json({ message: 'Inicio de sesión exitoso.', user: req.session.user });

        } catch (error) {
            console.error('Error en el inicio de sesión:', error);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    }
);

/**
 * @api {get} /logout Cerrar la sesión del usuario
 */
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ error: 'No se pudo cerrar la sesión correctamente.' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Sesión cerrada.' });
    });
});

/**
 * @api {get} /session-check Verificar si hay una sesión activa
 */
router.get('/session-check', requireAuth, (req, res) => {
    res.status(200).json({ user: req.session.user });
});

export default router;