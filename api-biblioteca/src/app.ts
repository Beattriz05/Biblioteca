import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit"; // Importe rateLimit diretamente
import { AppDataSource } from "./config/data-source";
import livroRoutes from "./routes/livroRoutes";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/errorHandler";
import { sanitizeInput, validateContentType } from "./middlewares/validation";
import { AppError } from "./errors/AppError";

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
app.options('*', cors(corsOptions));

// Middlewares de parsing
app.use(express.json({
    limit: process.env.MAX_REQUEST_SIZE || '10mb',
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 50
}));

// Logging
const morganFormat = NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat, {
    skip: (req: Request, res: Response) => {
        if (req.path === '/health' && NODE_ENV === 'production') return true;
        return false;
    }
}));

// Middlewares de validação e sanitização
app.use(sanitizeInput);
app.use(validateContentType());

// Rota de saúde
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

    const statusCode = AppDataSource.isInitialized ? 200 : 503;
    res.status(statusCode).json(healthCheck);
});

// Rota de documentação
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
            }
        ]
    });
});

// Rota raiz
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
        }
    });
});

// Rota para métricas
app.get("/metrics", (req: Request, res: Response) => {
    if (NODE_ENV !== 'development' && !req.headers['authorization']) {
        return res.status(401).json({ error: "Acesso não autorizado" });
    }

    res.json({
        metrics: {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime()
        }
    });
});

// Crie um router para as rotas da API
import { Router } from 'express';
const apiRouter = Router();

// Aplique rate limit apenas ao router da API
apiRouter.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
        message: JSON.stringify({
            error: "Muitas requisições deste IP",
            message: "Tente novamente mais tarde",
            retryAfter: 15 * 60
        }),
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// Adicione as rotas de livros ao router
apiRouter.use("/livros", livroRoutes);

// Use o router no app principal
app.use("/api", apiRouter);

// Middlewares de erro
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Inicialização do servidor
async function startServer() {
    try {
        console.log("Inicializando servidor...");
        console.log(` Ambiente: ${NODE_ENV}`);
        console.log(` Porta: ${PORT}`);
        
        await AppDataSource.initialize();
        
        console.log(" Conectado ao banco de dados SQLite");
        console.log(` Arquivo do banco: ${AppDataSource.options.database}`);
        
        // Verificar tabela com tratamento de erro correto
        try {
            const tableExists = await AppDataSource.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='livros'"
            );
            
            if (tableExists.length === 0) {
                console.warn("Tabela 'livros' não encontrada. As tabelas serão criadas automaticamente.");
            } else {
                console.log("Tabela 'livros' encontrada");
                
                const countResult = await AppDataSource.query("SELECT COUNT(*) as total FROM livros");
                console.log(`Total de livros cadastrados: ${countResult[0]?.total || 0}`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.warn(" Não foi possível verificar a tabela 'livros':", error.message);
            } else {
                console.warn(" Não foi possível verificar a tabela 'livros':", String(error));
            }
        }

        // Iniciar servidor
        const server = app.listen(PORT, () => {
            console.log(`Servidor inicializado com sucesso!`);
            console.log(`URL: http://localhost:${PORT}`);
        });

        // Graceful shutdown
        const gracefulShutdown = (signal: string) => {
            console.log(`\n${signal} recebido. Encerrando servidor...`);
            
            server.close(async () => {
                console.log("Servidor HTTP fechado");
                
                if (AppDataSource.isInitialized) {
                    await AppDataSource.destroy();
                    console.log("Conexão com banco de dados fechada");
                }
                
                console.log("Encerramento concluído");
                process.exit(0);
            });

            setTimeout(() => {
                console.error("Timeout de shutdown atingido");
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
    } catch (error: unknown) {
        console.error("Erro crítico ao iniciar o servidor:");
        
        if (error instanceof Error) {
            console.error("Detalhes:", {
                name: error.name,
                message: error.message,
                stack: NODE_ENV === 'development' ? error.stack : 'Oculto em produção'
            });
        } else {
            console.error("Erro desconhecido:", error);
        }
        
        process.exit(1);
    }
}

// Iniciar servidor
if (NODE_ENV !== 'test' && process.env.SKIP_SERVER !== 'true') {
    startServer();
}

export { app, AppDataSource };