import { LivroRepository } from "../repository/LivroRepository";
import { CriarLivroDTO, AtualizarLivroDTO, LivroResponse } from "../dto/LivroDTO";
import { Livro } from "../entity/Livro";
import { AppError } from "../errors/AppError";

export class LivroService {
    private livroRepository: LivroRepository;

    constructor() {
        this.livroRepository = new LivroRepository();
    }

    async criarLivro(dto: CriarLivroDTO): Promise<Livro> {
        // Validações de negócio
        this.validarDadosLivro(dto);

        // Verificar se ISBN já existe
        const isbnExistente = await this.livroRepository.verificarISBNExistente(dto.isbn);
        if (isbnExistente) {
            throw new AppError("ISBN já cadastrado", 400);
        }

        // Verificar ano de publicação
        const anoAtual = new Date().getFullYear();
        if (dto.anoPublicacao > anoAtual) {
            throw new AppError("Ano de publicação não pode ser futuro", 400);
        }

        return await this.livroRepository.create(dto);
    }

    async listarLivros(pagina: number = 1, limite: number = 10) {
        const skip = (pagina - 1) * limite;
        const [livros, total] = await this.livroRepository.findAll({
            skip,
            take: limite,
            order: { dataCriacao: "DESC" }
        });

        return {
            livros,
            paginacao: {
                pagina,
                limite,
                total,
                totalPaginas: Math.ceil(total / limite)
            }
        };
    }

    async obterLivroPorId(id: number): Promise<Livro> {
        const livro = await this.livroRepository.findById(id);
        if (!livro) {
            throw new AppError("Livro não encontrado", 404);
        }
        return livro;
    }

    async atualizarLivro(id: number, dto: AtualizarLivroDTO): Promise<Livro> {
        const livroExistente = await this.obterLivroPorId(id);

        // Se está alterando o ISBN, verificar se já existe
        if (dto.isbn && dto.isbn !== livroExistente.isbn) {
            const isbnExistente = await this.livroRepository.verificarISBNExistente(dto.isbn, id);
            if (isbnExistente) {
                throw new AppError("ISBN já cadastrado para outro livro", 400);
            }
        }

        const livroAtualizado = await this.livroRepository.update(id, dto);
        if (!livroAtualizado) {
            throw new AppError("Erro ao atualizar livro", 500);
        }

        return livroAtualizado;
    }

    async excluirLivro(id: number): Promise<boolean> {
        await this.obterLivroPorId(id); // Verifica se existe
        return await this.livroRepository.delete(id);
    }

    async buscarPorAutor(autor: string): Promise<Livro[]> {
        return await this.livroRepository.findByAutor(autor);
    }

    async buscarPorTitulo(titulo: string): Promise<Livro[]> {
        return await this.livroRepository.findByTitulo(titulo);
    }

    private validarDadosLivro(dto: CriarLivroDTO | AtualizarLivroDTO): void {
        // Validação de título
        if (dto.titulo && dto.titulo.length < 2) {
            throw new AppError("Título deve ter pelo menos 2 caracteres", 400);
        }

        // Validação de autor
        if (dto.autor && dto.autor.length < 3) {
            throw new AppError("Nome do autor deve ter pelo menos 3 caracteres", 400);
        }

        // Validação de ISBN (formato básico)
        if (dto.isbn && !this.validarISBN(dto.isbn)) {
            throw new AppError("ISBN inválido. Formato aceito: ISBN-10 ou ISBN-13", 400);
        }

        // Validação de ano
        if (dto.anoPublicacao && (dto.anoPublicacao < 0 || dto.anoPublicacao > new Date().getFullYear())) {
            throw new AppError("Ano de publicação inválido", 400);
        }
    }

    private validarISBN(isbn: string): boolean {
        // Remove hífens e espaços
        const isbnLimpo = isbn.replace(/[-\s]/g, '');
        
        // Verifica se é ISBN-10 ou ISBN-13
        if (isbnLimpo.length === 10) {
            return this.validarISBN10(isbnLimpo);
        } else if (isbnLimpo.length === 13) {
            return this.validarISBN13(isbnLimpo);
        }
        
        return false;
    }

    private validarISBN10(isbn: string): boolean {
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            const digito = parseInt(isbn[i]);
            if (isNaN(digito)) return false;
            soma += digito * (10 - i);
        }
        
        const ultimoChar = isbn[9].toUpperCase();
        const ultimoDigito = ultimoChar === 'X' ? 10 : parseInt(ultimoChar);
        if (isNaN(ultimoDigito)) return false;
        
        soma += ultimoDigito;
        return soma % 11 === 0;
    }

    private validarISBN13(isbn: string): boolean {
        let soma = 0;
        for (let i = 0; i < 13; i++) {
            const digito = parseInt(isbn[i]);
            if (isNaN(digito)) return false;
            soma += digito * (i % 2 === 0 ? 1 : 3);
        }
        return soma % 10 === 0;
    }
}