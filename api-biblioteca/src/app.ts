import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./data-source";
import livroRoutes from "./routes/livroRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Rota raiz para verificar se a API está funcionando
app.get("/", (req, res) => {
    res.json({
        message: "API Biblioteca - Sistema de Gerenciamento de Livros",
        endpoints: {
            listar_livros: "GET /api/livros",
            criar_livro: "POST /api/livros",
            buscar_livro: "GET /api/livros/:id",
            atualizar_livro: "PUT /api/livros/:id",
            excluir_livro: "DELETE /api/livros/:id"
        },
        status: "Online"
    });
});

// Rotas
app.use("/api", livroRoutes);

// Rota para 404 - Não encontrado
app.use("*", (req, res) => {
    res.status(404).json({
        error: "Rota não encontrada",
        message: `A rota ${req.originalUrl} não existe nesta API.`
    });
});

// Inicialização do servidor
AppDataSource.initialize()
    .then(() => {
        console.log("Conectado ao banco de dados SQLite");
        console.log("Arquivo do banco: biblioteca.sqlite");
        
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`URL da API: http://localhost:${PORT}`);
            console.log(`Endpoints disponíveis em: http://localhost:${PORT}/api/livros`);
        });
    })
    .catch((error) => {
        console.error("Erro ao conectar com o banco de dados:", error);
    });