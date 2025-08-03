require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const fs = require('fs-extra');
const path = require('path');
const helmet = require('helmet'); // Importado para seguridad
const csrf = require('csurf'); // Importado para protección CSRF
const db = require('./db');

// --- RUTAS ---
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const diariesRoutes = require('./routes/diaries');
const eventsRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet()); // Usa helmet para añadir cabeceras de seguridad
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- SESIÓN ---
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './db'
    }),
    secret: process.env.SESSION_SECRET || 'un-secreto-muy-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// --- PROTECCIÓN CSRF ---
const csrfProtection = csrf({ cookie: true });
// Ruta para que el frontend obtenga un token CSRF válido
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// --- API ROUTES ---
// Aplicamos la protección CSRF a todas las rutas de la API que la necesiten
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/diarios', diariesRoutes);
app.use('/api/eventos', eventsRoutes);


// --- SERVIR ARCHIVOS HTML ---
const publicPages = ['/login.html', '/index.html', '/admin.html', '/fotos.html', '/calendario.html', '/linea-tiempo.html', '/configuracion.html'];
publicPages.forEach(page => {
    app.get(page, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// --- MANEJO DE ERRORES GLOBAL ---
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Manejo específico de error CSRF
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Acción no permitida. Token de seguridad inválido.' });
    }

    // Otros errores...
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
});


// --- INICIAR SERVIDOR ---
(async () => {
    await db.initDB();
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
})();
