import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./data-source";
import livroRoutes from "./routes/livroRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Rotas
app.use("/api", livroRoutes);

// Inicialização do servidor
AppDataSource.initialize()
    .then(() => {
        console.log("Conectado ao banco de dados SQLite");
        
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`API Biblioteca disponível em: http://localhost:${PORT}/api/livros`);
        });
    })
    .catch((error) => {
        console.error("Erro ao conectar com o banco de dados:", error);
    });