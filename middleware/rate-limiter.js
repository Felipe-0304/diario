// middleware/rate-limiter.js
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 peticiones por IP por ventana
    message: 'Demasiados intentos de inicio de sesión. Intente de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false
});