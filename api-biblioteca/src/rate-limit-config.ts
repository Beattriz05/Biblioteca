import rateLimit from 'express-rate-limit';

export const createRateLimiter = (options?: {
    windowMs?: number;
    max?: number;
    message?: string;
    skipKey?: string;
}) => {
    return rateLimit({
        windowMs: options?.windowMs || 15 * 60 * 1000,
        max: options?.max || 100,
        message: options?.message || 'Muitas requisições deste IP, tente novamente mais tarde',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Pular rate limiting para endpoints específicos
            if (options?.skipKey && req.headers['x-api-key'] === options.skipKey) {
                return true;
            }
            return false;
        },
        keyGenerator: (req) => {
            // Considerar API key ou token no rate limiting
            const apiKey = req.headers['x-api-key'] as string;
            const token = req.headers['authorization'];
            
            if (apiKey) {
                return apiKey;
            }
            
            if (token) {
                return token;
            }
            
            return req.ip || 'unknown';
        }
    });
};

// Limiters específicos
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Muitas tentativas de login, tente novamente mais tarde'
});

export const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Limite de requisições excedido para esta API key'
});

export const publicLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Limite de requisições públicas excedido'
});