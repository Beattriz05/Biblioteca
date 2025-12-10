import rateLimit from 'express-rate-limit';

// Defina uma interface mínima para evitar conflitos de tipos
interface RateLimitRequest {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    socket?: {
        remoteAddress?: string;
    };
    connection?: {
        remoteAddress?: string;
    };
}

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
        skip: (request: RateLimitRequest) => {
            // Pular rate limiting para endpoints específicos
            const apiKeyHeader = request.headers['x-api-key'];
            const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
            
            if (options?.skipKey && apiKey === options.skipKey) {
                return true;
            }
            return false;
        },
        keyGenerator: (request: RateLimitRequest) => {
            // Considerar API key ou token no rate limiting
            const apiKeyHeader = request.headers['x-api-key'];
            const authHeader = request.headers['authorization'];
            
            const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
            const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
            
            if (apiKey) {
                return apiKey;
            }
            
            if (token) {
                return token;
            }
            
            return request.ip || 
                   (request.socket?.remoteAddress) || 
                   (request.connection?.remoteAddress) || 
                   'unknown';
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