import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { AppDataSource } from "./config/data-source";
import livroRoutes from "./routes/livroRoutes";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/errorHandler";
import { sanitizeInput, validateContentType } from "./middlewares/validation";
import { AppError } from "./errors/AppError";

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configuração de Rate Limiting aprimorada
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"), // padrão 100 requisições por IP
    message: {
        error: "Muitas requisições deste IP",
        message: "Tente novamente mais tarde",
        retryAfter: 15 * 60 // 15 minutos em segundos
    },
    standardHeaders: true, // Retorna informações de rate limit nos headers
    legacyHeaders: false, // Desabilita headers legados
    keyGenerator: (req) => {
        // Usar IP real mesmo atrás de proxy
        return req.ip || 
               (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.socket.remoteAddress ||
               'unknown';
    },
    skipSuccessfulRequests: false, // Contar todas as requisições
    skip: (req) => {
        // Pular rate limiting para rotas de health check
        if (req.path === "/health") return true;
        return false;
    }
});

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    crossOriginResourcePolicy: { policy: "same-site" }
}));

// Configuração CORS aprimorada
const corsOptions = {
    origin: NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'] 
        : process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar pre-flight para todas as rotas

// Middlewares de parsing
app.use(express.json({
    limit: process.env.MAX_REQUEST_SIZE || '10mb',
    verify: (req: any, res, buf) => {
        req.rawBody = buf; // Manter o buffer original para validações
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 50 // Limitar número de parâmetros
}));

// Logging aprimorado
const morganFormat = NODE_ENV === 'development' ? 'dev' : 'combined';
const morganOptions = {
    skip: (req: Request, res: Response) => {
        // Pular logging de health checks em produção
        if (req.path === '/health' && NODE_ENV === 'production') return true;
        return false;
    }
};
app.use(morgan(morganFormat, morganOptions));

// Rate limiting (aplicar após logging mas antes das rotas principais)
app.use(limiter);

// Middlewares de validação e sanitização
app.use(sanitizeInput);
app.use(validateContentType());

// Rota de saúde da API aprimorada
app.get("/health", (req: Request, res: Response) => {
    const healthCheck = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: AppDataSource.isInitialized ? "connected" : "disconnected",
        environment: NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        platform: process.platform
    };

    // Status 500 se o banco de dados não estiver conectado
    const statusCode = AppDataSource.isInitialized ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
});

// Rota de documentação (opcional - pode ser implementada com Swagger)
app.get("/api/docs", (req: Request, res: Response) => {
    res.json({
        documentation: "Documentação da API Biblioteca",
        version: "1.0.0",
        endpoints: [
            {
                path: "/api/livros",
                method: "GET",
                description: "Listar todos os livros com paginação",
                queryParams: [
                    { name: "pagina", type: "number", required: false, default: 1 },
                    { name: "limite", type: "number", required: false, default: 10 },
                    { name: "ordenarPor", type: "string", required: false, options: ["titulo", "autor", "anoPublicacao", "dataCriacao"] }
                ]
            },
            {
                path: "/api/livros",
                method: "POST",
                description: "Criar um novo livro",
                body: {
                    titulo: { type: "string", required: true, maxLength: 200 },
                    autor: { type: "string", required: true, maxLength: 100 },
                    isbn: { type: "string", required: true, pattern: "ISBN-10 ou ISBN-13" },
                    anoPublicacao: { type: "number", required: true, min: 0, max: "ano atual" }
                }
            },
            {
                path: "/api/livros/:id",
                method: "GET",
                description: "Buscar livro por ID",
                pathParams: [
                    { name: "id", type: "number", required: true }
                ]
            },
            {
                path: "/api/livros/:id",
                method: "PUT",
                description: "Atualizar livro",
                pathParams: [
                    { name: "id", type: "number", required: true }
                ],
                body: {
                    titulo: { type: "string", required: false, maxLength: 200 },
                    autor: { type: "string", required: false, maxLength: 100 },
                    isbn: { type: "string", required: false, pattern: "ISBN-10 ou ISBN-13" },
                    anoPublicacao: { type: "number", required: false, min: 0, max: "ano atual" },
                    disponivel: { type: "boolean", required: false }
                }
            },
            {
                path: "/api/livros/:id",
                method: "DELETE",
                description: "Excluir livro",
                pathParams: [
                    { name: "id", type: "number", required: true }
                ]
            }
        ],
        examples: {
            createBook: {
                method: "POST",
                url: "/api/livros",
                body: {
                    titulo: "Dom Casmurro",
                    autor: "Machado de Assis",
                    isbn: "978-85-7232-144-9",
                    anoPublicacao: 1899
                }
            }
        }
    });
});

// Rota raiz aprimorada
app.get("/", (req: Request, res: Response) => {
    res.json({
        message: "📚 API Biblioteca - Sistema de Gerenciamento de Livros",
        version: process.env.npm_package_version || '1.0.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        links: {
            self: { href: "/", method: "GET" },
            health: { href: "/health", method: "GET" },
            documentation: { href: "/api/docs", method: "GET" },
            livros: { href: "/api/livros", method: "GET" }
        },
        endpoints: {
            livros: {
                listar: { method: "GET", path: "/api/livros", description: "Listar livros com paginação" },
                criar: { method: "POST", path: "/api/livros", description: "Criar novo livro" },
                buscar: { method: "GET", path: "/api/livros/:id", description: "Buscar livro por ID" },
                atualizar: { method: "PUT", path: "/api/livros/:id", description: "Atualizar livro" },
                excluir: { method: "DELETE", path: "/api/livros/:id", description: "Excluir livro" },
                buscar_por_autor: { method: "GET", path: "/api/livros/buscar/autor?autor=NOME", description: "Buscar livros por autor" },
                buscar_por_titulo: { method: "GET", path: "/api/livros/buscar/titulo?titulo=TITULO", description: "Buscar livros por título" }
            }
        },
        status: "online",
        uptime: process.uptime(),
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    });
});

// Rotas da API
app.use("/api", livroRoutes);

// Rota para métricas (opcional - pode ser implementada com Prometheus)
app.get("/metrics", (req: Request, res: Response) => {
    if (NODE_ENV !== 'development' && !req.headers['authorization']) {
        return res.status(401).json({ error: "Acesso não autorizado" });
    }

    res.json({
        metrics: {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime(),
            connections: (app as any)._connections || 0
        }
    });
});

// Middleware para rotas não encontradas (404)
app.use(notFoundMiddleware);

// Middleware centralizado de tratamento de erros
app.use(errorMiddleware);

// Inicialização do servidor com mais robustez
async function startServer() {
    try {
        console.log("Inicializando servidor...");
        console.log(` Ambiente: ${NODE_ENV}`);
        console.log(` Porta: ${PORT}`);
        
        // Conectar ao banco de dados com timeout
        const dbTimeout = setTimeout(() => {
            console.warn("A conexão com o banco de dados está demorando mais que o esperado...");
        }, 5000);

        await AppDataSource.initialize();
        clearTimeout(dbTimeout);
        
        console.log(" Conectado ao banco de dados SQLite");
        console.log(` Arquivo do banco: ${AppDataSource.options.database}`);
        
        // Verificar se a tabela de livros existe
        try {
            const tableExists = await AppDataSource.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='livros'"
            );
            
            if (tableExists.length === 0) {
                console.warn("Tabela 'livros' não encontrada. As tabelas serão criadas automaticamente.");
            } else {
                console.log("Tabela 'livros' encontrada");
                
                // Contar registros
                const countResult = await AppDataSource.query("SELECT COUNT(*) as total FROM livros");
                console.log(`Total de livros cadastrados: ${countResult[0]?.total || 0}`);
            }
        } catch (error) {
            console.warn(" Não foi possível verificar a tabela 'livros':", error.message);
        }

        // Iniciar servidor
        const server = app.listen(PORT, () => {
            console.log(`Servidor inicializado com sucesso!`);
            console.log(`══════════════════════════════════════════════════`);
            console.log(`URL da API: http://localhost:${PORT}`);
            console.log(`Endpoint principal: http://localhost:${PORT}/api/livros`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Documentação: http://localhost:${PORT}/api/docs`);
            console.log(`══════════════════════════════════════════════════`);
            
            if (NODE_ENV === 'development') {
                console.log(`Modo de desenvolvimento ativo`);
                console.log(`Logs detalhados habilitados`);
                console.log(`Depuração disponível`);
            }
            
            console.log(`Status: ONLINE`);
            console.log(`Iniciado em: ${new Date().toLocaleString()}`);
        });

        // Tratamento de sinais para shutdown graceful
        const gracefulShutdown = (signal: string) => {
            console.log(`\n${signal} recebido. Encerrando servidor graciosamente...`);
            
            server.close(async () => {
                console.log("Servidor HTTP fechado");
                
                if (AppDataSource.isInitialized) {
                    await AppDataSource.destroy();
                    console.log("Conexão com banco de dados fechada");
                }
                
                console.log("Encerramento concluído");
                process.exit(0);
            });

            // Forçar encerramento após 10 segundos
            setTimeout(() => {
                console.error("Timeout de shutdown atingido, forçando encerramento...");
                process.exit(1);
            }, 10000);
        };

        // Capturar sinais de encerramento
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Tratamento de erros não capturados
        process.on('uncaughtException', (error) => {
            console.error('Erro não capturado:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Promise rejeitada não tratada:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

        // Monitorar uso de memória
        setInterval(() => {
            const memoryUsage = process.memoryUsage();
            const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            
            if (memoryMB > 500) { // Aviso se usar mais de 500MB
                console.warn(`Uso alto de memória: ${memoryMB}MB`);
            }
        }, 60000); // Verificar a cada minuto

    } catch (error) {
        console.error("Erro crítico ao iniciar o servidor:");
        
        if (error instanceof Error) {
            console.error("Detalhes do erro:", {
                name: error.name,
                message: error.message,
                stack: NODE_ENV === 'development' ? error.stack : 'Oculto em produção'
            });
        } else {
            console.error("Erro desconhecido:", error);
        }
        
        // Tentar fazer uma saída mais informativa
        if (error instanceof Error && error.message.includes('already been')) {
            console.log("Dica: O servidor já pode estar rodando em outra instância.");
            console.log("Verifique se a porta", PORT, "está disponível.");
        }
        
        process.exit(1);
    }
}

// Iniciar o servidor apenas se não estiver em teste
if (NODE_ENV !== 'test' && process.env.SKIP_SERVER !== 'true') {
    startServer();
} else if (NODE_ENV === 'test') {
    console.log("Modo de teste ativo - Servidor não será iniciado automaticamente");
}

// Exportar app para testes
export { app, AppDataSource };