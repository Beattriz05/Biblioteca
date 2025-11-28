import { Request, Response } from "express";
import { livroRepository } from "../repository/LivroRepository";
import { Livro } from "../entity/Livro";

export class LivroController {
    
    // CREATE - POST /api/livros
    async criarLivro(req: Request, res: Response) {
        try {
            const { titulo, autor, isbn, anoPublicacao } = req.body;
            
            // Validações básicas
            if (!titulo || !autor || !isbn || !anoPublicacao) {
                return res.status(400).json({ 
                    error: "Todos os campos são obrigatórios: titulo, autor, isbn, anoPublicacao" 
                });
            }

            const livro = new Livro();
            livro.titulo = titulo;
            livro.autor = autor;
            livro.isbn = isbn;
            livro.anoPublicacao = anoPublicacao;
            livro.disponivel = true;

            const livroSalvo = await livroRepository.save(livro);
            return res.status(201).json(livroSalvo);
        } catch (error) {
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    // READ ALL - GET /api/livros
    async listarLivros(req: Request, res: Response) {
        try {
            const livros = await livroRepository.findAll();
            return res.json(livros);
        } catch (error) {
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    // READ BY ID - GET /api/livros/:id
    async obterLivroPorId(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const livro = await livroRepository.findById(id);
            
            if (!livro) {
                return res.status(404).json({ error: "Livro não encontrado" });
            }
            
            return res.json(livro);
        } catch (error) {
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    // UPDATE - PUT /api/livros/:id
    async atualizarLivro(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const livroExistente = await livroRepository.findById(id);
            
            if (!livroExistente) {
                return res.status(404).json({ error: "Livro não encontrado" });
            }

            const livroAtualizado = await livroRepository.update(id, req.body);
            return res.json(livroAtualizado);
        } catch (error) {
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    // DELETE - DELETE /api/livros/:id
    async excluirLivro(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const livro = await livroRepository.findById(id);
            
            if (!livro) {
                return res.status(404).json({ error: "Livro não encontrado" });
            }

            await livroRepository.delete(id);
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}