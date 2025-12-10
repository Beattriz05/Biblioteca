import { Router } from "express";
import { LivroController } from "../controller/LivroController";
import { livroValidators, paginacaoValidators } from "../middlewares/validation";
import { catchAsync } from "../middlewares/errorHandler";

const router = Router();
const livroController = new LivroController();

// CRUD de livros com validação
router.post(
  "/livros",
  livroValidators.criar,
  catchAsync(livroController.criarLivro)
);

router.get(
  "/livros",
  paginacaoValidators,
  catchAsync(livroController.listarLivros)
);

router.get(
  "/livros/:id",
  livroValidators.idParam,
  catchAsync(livroController.obterLivroPorId)
);

router.put(
  "/livros/:id",
  livroValidators.atualizar,
  catchAsync(livroController.atualizarLivro)
);

router.delete(
  "/livros/:id",
  livroValidators.idParam,
  catchAsync(livroController.excluirLivro)
);

// Rotas de busca
router.get(
  "/livros/buscar/autor",
  livroValidators.buscar,
  catchAsync(livroController.buscarPorAutor)
);

router.get(
  "/livros/buscar/titulo",
  livroValidators.buscar,
  catchAsync(livroController.buscarPorTitulo)
);

export default router;