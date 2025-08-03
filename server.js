require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const fs = require('fs-extra');
const path = require('path');
const helmet = require('helmet');
const csrf = require('csurf');
const db = require('./db');
const multer = require('multer');

// --- RUTAS ---
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const diariesRoutes = require('./routes/diaries');
const eventsRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES DE SEGURIDAD Y PARSEO ---
app.use(helmet()); // Añade cabeceras de seguridad importantes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE SESIÓN ---
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './db',
        concurrentDB: true
    }),
    secret: process.env.SESSION_SECRET || 'un-secreto-muy-secreto-y-largo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// --- CONFIGURACIÓN DE PROTECCIÓN CSRF ---
const csrfProtection = csrf({ cookie: true });

// Ruta especial para que el frontend obtenga un token CSRF válido
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});


// --- RUTAS DE LA API ---
// Se aplica la protección CSRF en cada ruta que modifica datos (POST, PUT, DELETE)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/diarios', diariesRoutes);
app.use('/api/eventos', eventsRoutes);


// --- SERVIR ARCHIVOS HTML ESTÁTICOS ---
const publicPages = ['/login.html', '/index.html', '/admin.html', '/fotos.html', '/calendario.html', '/linea-tiempo.html', '/configuracion.html'];
publicPages.forEach(page => {
    app.get(page, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

// Redirección de la raíz a la página principal
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// --- MANEJO DE ERRORES GLOBAL ---
app.use((err, req, res, next) => {
    console.error(err);

    // Error de CSRF
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Acción no permitida. Token de seguridad inválido o expirado.' });
    }

    // Errores de Multer (subida de archivos)
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo es demasiado grande. El límite es de 25MB.' });
        }
    }

    // Otros errores
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
    } else {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});


// --- INICIAR SERVIDOR ---
(async () => {
    try {
        await db.initDB();
        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error al inicializar la base de datos:", error);
        process.exit(1);
    }
})();
