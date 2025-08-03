// db/index.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'mi-pequeno-tesoro.db');
let db;

/**
 * Función auxiliar para asegurar que un directorio existe.
 * @param {string} dirPath - Ruta del directorio.
 * @returns {boolean} - true si el directorio existe o fue creado, false en caso de error.
 */
export const ensureDirectoryExists = (dirPath) => {
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

/**
 * Inicializa la base de datos y crea las tablas si no existen.
 */
export async function initDB() {
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS site_config (
            id INTEGER PRIMARY KEY,
            site_global_name TEXT NOT NULL DEFAULT 'Mi Pequeño Tesoro',
            allow_new_registrations BOOLEAN NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT NOT NULL DEFAULT 'usuario',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS diarios (
            id INTEGER PRIMARY KEY,
            baby_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY,
            diario_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            descripcion TEXT,
            fecha DATE NOT NULL,
            media_path TEXT,
            is_favorite BOOLEAN NOT NULL DEFAULT 0,
            autor_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(diario_id) REFERENCES diarios(id) ON DELETE CASCADE,
            FOREIGN KEY(autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS diarios_acceso (
            id INTEGER PRIMARY KEY,
            diario_id INTEGER NOT NULL,
            usuario_id INTEGER NOT NULL,
            rol TEXT NOT NULL DEFAULT 'viewer',
            config_tema_json TEXT,
            last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(diario_id) REFERENCES diarios(id) ON DELETE CASCADE,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            UNIQUE(diario_id, usuario_id)
        );

        CREATE INDEX IF NOT EXISTS idx_diarios_acceso_usuario ON diarios_acceso(usuario_id);
        CREATE INDEX IF NOT EXISTS idx_eventos_diario ON eventos(diario_id);
    `);

    // Insertar configuración por defecto si la tabla está vacía
    const config = await db.get('SELECT * FROM site_config WHERE id = 1');
    if (!config) {
        await db.run('INSERT INTO site_config (id, site_global_name, allow_new_registrations) VALUES (1, ?, ?)', ['Mi Pequeño Tesoro', true]);
    }

    console.log("Base de datos inicializada y tablas verificadas.");
}

/**
 * Funciones de ayuda para las consultas
 */
export async function runQuery(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    return db.run(sql, params);
}

export async function getQuery(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    return db.get(sql, params);
}

export async function allQuery(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    return db.all(sql, params);
}