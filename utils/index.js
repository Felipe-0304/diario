// utils/index.js
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const diarioId = req.params.diarioId;
        if (!diarioId || !/^\d+$/.test(diarioId)) {
            const err = new Error('ID del diario no proporcionado o inválido.');
            err.status = 400;
            return cb(err);
        }
        const dir = path.join(__dirname, '..', 'public', 'media', 'diarios', diarioId);
        fs.ensureDir(dir) // Crear el directorio si no existe
            .then(() => cb(null, dir))
            .catch(err => {
                console.error('Error al crear directorio para media:', err);
                cb(err);
            });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname).toLowerCase();
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const fileFilter = (req, file, cb) => {
    // Aceptar solo imágenes y videos
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes y videos.'), false);
    }
};

export const uploadEventMedia = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // Límite de 25MB
    fileFilter: fileFilter
});

/**
 * Elimina un archivo multimedia del sistema de archivos.
 * @param {string} filePath - La ruta del archivo a eliminar.
 */
export const removeEventMedia = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Archivo eliminado: ${filePath}`);
        }
    } catch (error) {
        console.error('Error al eliminar archivo multimedia:', error);
    }
};