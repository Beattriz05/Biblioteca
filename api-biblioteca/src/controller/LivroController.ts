import { Request, Response } from "express";
import { LivroService } from "../services/LivroService";
import { CriarLivroDTO, AtualizarLivroDTO } from "../dto/LivroDTO";
import { AppError } from "../errors/AppError";

export class LivroController {
    private livroService: LivroService;

    constructor() {
        this.livroService = new LivroService();
    }

    async criarLivro(req: Request, res: Response) {
        try {
            const livroDTO: CriarLivroDTO = req.body;
            const livro = await this.livroService.criarLivro(livroDTO);
            return res.status(201).json(livro);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    async listarLivros(req: Request, res: Response) {
        try {
            const pagina = parseInt(req.query.pagina as string) || 1;
            const limite = parseInt(req.query.limite as string) || 10;
            
            const resultado = await this.livroService.listarLivros(pagina, limite);
            return res.json(resultado);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    async obterLivroPorId(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new AppError("ID inválido", 400);
            }

            const livro = await this.livroService.obterLivroPorId(id);
            return res.json(livro);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    async atualizarLivro(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new AppError("ID inválido", 400);
            }

            const livroDTO: AtualizarLivroDTO = req.body;
            const livro = await this.livroService.atualizarLivro(id, livroDTO);
            return res.json(livro);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    async excluirLivro(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new AppError("ID inválido", 400);
            }

            const sucesso = await this.livroService.excluirLivro(id);
            if (sucesso) {
                return res.status(204).send();
            }
            throw new AppError("Erro ao excluir livro", 500);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    async buscarPorAutor(req: Request, res: Response) {
        try {
            const { autor } = req.query;
            if (!autor || typeof autor !== 'string') {
                throw new AppError("Parâmetro 'autor' é obrigatório", 400);
            }

            const livros = await this.livroService.buscarPorAutor(autor);
            return res.json(livros);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    async buscarPorTitulo(req: Request, res: Response) {
        try {
            const { titulo } = req.query;
            if (!titulo || typeof titulo !== 'string') {
                throw new AppError("Parâmetro 'titulo' é obrigatório", 400);
            }

            const livros = await this.livroService.buscarPorTitulo(titulo);
            return res.json(livros);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    private handleError(error: unknown, res: Response) {
        console.error("Erro no controller:", error);

        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                error: error.message,
                statusCode: error.statusCode,
                timestamp: new Date().toISOString()
            });
        }

        if (error instanceof Error) {
            return res.status(500).json({
                error: "Erro interno do servidor",
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor desconhecido"
        });
    }
}