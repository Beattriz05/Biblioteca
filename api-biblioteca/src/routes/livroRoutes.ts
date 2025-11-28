import { Router } from "express";
import { LivroController } from "../controller/LivroController";

const router = Router();
const livroController = new LivroController();

// Definindo as rotas
router.post("/livros", livroController.criarLivro);
router.get("/livros", livroController.listarLivros);
router.get("/livros/:id", livroController.obterLivroPorId);
router.put("/livros/:id", livroController.atualizarLivro);
router.delete("/livros/:id", livroController.excluirLivro);

export default router;