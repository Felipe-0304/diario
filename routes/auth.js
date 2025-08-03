// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const csrf = require('csurf');
const { body, validationResult } = require('express-validator');

const csrfProtection = csrf({ cookie: true });

// POST /api/auth/login
router.post('/login', csrfProtection, [
    body('email').isEmail().withMessage('Por favor, introduce un email válido.').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña no puede estar vacía.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        const user = await db.getQuery('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = {
                id: user.id,
                nombre: user.nombre,
                rol: user.rol,
                active_diario_id: null
            };
            res.json({ message: 'Login exitoso.', user: req.session.user });
        } else {
            res.status(401).json({ error: 'Credenciales incorrectas.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor durante el login.' });
    }
});

// POST /api/auth/register
router.post('/register', csrfProtection, [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido.').isLength({ min: 2, max: 50 }).escape(),
    body('email').isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Comprobar si los registros están permitidos
    const config = await db.getQuery('SELECT allow_new_registrations FROM site_config WHERE id = 1');
    if (config.allow_new_registrations !== 1) {
        return res.status(403).json({ error: 'El registro de nuevos usuarios no está permitido.' });
    }

    const { nombre, email, password } = req.body;
    try {
        const existingUser = await db.getQuery('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({ error: 'El email ya está en uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.runQuery('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', [nombre, email, hashedPassword, 'usuario']);
        
        res.status(201).json({ message: 'Usuario registrado correctamente.', userId: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor durante el registro.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
        }
        res.clearCookie('connect.sid'); // El nombre de la cookie puede variar
        res.json({ message: 'Sesión cerrada correctamente.' });
    });
});

module.exports = router;
