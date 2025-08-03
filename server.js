// server.js
import express from 'express';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { initDB } from './db/index.js';
import multer from 'multer';

// Rutas refactorizadas
import authRoutes from './routes/auth.js';
import diariesRoutes from './routes/diaries.js';
import eventsRoutes from './routes/events.js';
import adminRoutes, { getGlobalConfig } from './routes/admin.js';

// Middlewares
import { requireAuth } from './middleware/auth.js';

// --- Configuración Inicial ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Directorios ---
const directories = {
  db: path.join(__dirname, 'db'),
  public: path.join(__dirname, 'public'),
  mediaUploads: path.join(__dirname, 'public', 'media', 'diarios')
};

const ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Directorio creado: ${dirPath}`);
    }
    return true;
  } catch (err) {
    console.error(`Error al crear/verificar directorio ${dirPath}:`, err);
    return false;
  }
};

Object.values(directories).forEach(dirPath => {
  if (!ensureDirectoryExists(dirPath)) {
    console.error(`No se pudo crear el directorio crítico ${dirPath}. Saliendo...`);
    process.exit(1);
  }
});

// --- Middlewares de Express ---
app.use(express.static(directories.public));
app.use(express.json());

// Configuración de la sesión
const SqliteStore = connectSqlite3(session);
const sessionStore = new SqliteStore({ db: 'sessions.db', dir: directories.db });

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'mi-secreto-super-secreto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// --- Rutas de Archivos Estáticos (para páginas HTML) ---
app.get('/', async (req, res) => {
  const config = await getGlobalConfig();
  if (!config.allow_new_registrations) {
    // Si no se permiten registros, redirigir a login
    return res.sendFile(path.join(directories.public, 'login.html'));
  }
  // Si se permiten, redirigir a la página de inicio
  res.sendFile(path.join(directories.public, 'index.html'));
});
app.get('/login.html', (req, res) => res.sendFile(path.join(directories.public, 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(directories.public, 'index.html')));
app.get('/calendario.html', (req, res) => res.sendFile(path.join(directories.public, 'calendario.html')));
app.get('/linea-tiempo.html', (req, res) => res.sendFile(path.join(directories.public, 'linea-tiempo.html')));
app.get('/fotos.html', (req, res) => res.sendFile(path.join(directories.public, 'fotos.html')));
app.get('/configuracion.html', (req, res) => res.sendFile(path.join(directories.public, 'configuracion.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(directories.public, 'admin.html')));

// --- Rutas de la API (Endpoints) ---
// La ruta de autenticación se monta sin requireAuth a este nivel
app.use('/api', authRoutes);
// Las demás rutas requieren autenticación
app.use('/api', requireAuth, diariesRoutes);
app.use('/api', requireAuth, eventsRoutes);
app.use('/api', requireAuth, adminRoutes);

// --- Manejo de Errores Global ---
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  if (process.env.NODE_ENV !== 'production') console.error("Stack:", err.stack);
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Archivo demasiado grande. Límite: 25MB.` });
    return res.status(400).json({ error: `Error de subida: ${err.message}`});
  }
  if (err.message.includes('Tipo de archivo no permitido')) {
      return res.status(400).json({ error: err.message });
  }
  if (err.message.includes('ID del diario no proporcionado')) {
      return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Ocurrió un error inesperado.' : err.message
  });
});

// --- Inicialización y Arranque ---
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Servidor v3.5 corriendo en http://localhost:${PORT}`);
      console.log(`Media se guarda en subdirectorios de: ${directories.mediaUploads}`);
    });
  } catch (error) {
    console.error("FALLO CRÍTICO AL INICIAR APP (v3.5):", error.message, error.stack);
    process.exit(1);
  }
}

startServer();