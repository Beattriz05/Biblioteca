import { AppDataSource } from "../config/data-source";
import { Livro } from "../entity/Livro";
import { Repository, Like, Between } from "typeorm";
import { CriarLivroDTO, AtualizarLivroDTO } from "../dto/LivroDTO";

export class LivroRepository {
    private repository: Repository<Livro>;

    constructor() {
        this.repository = AppDataSource.getRepository(Livro);
    }

    async findAll(options?: {
        skip?: number;
        take?: number;
        order?: Record<string, "ASC" | "DESC">;
    }): Promise<[Livro[], number]> {
        return await this.repository.findAndCount({
            skip: options?.skip || 0,
            take: options?.take || 10,
            order: options?.order || { id: "ASC" }
        });
    }

    async findById(id: number): Promise<Livro | null> {
        return await this.repository.findOne({
            where: { id },
            cache: true // Cache para consultas frequentes
        });
    }

    async create(livroData: CriarLivroDTO): Promise<Livro> {
        const livro = this.repository.create({
            ...livroData,
            disponivel: true
        });
        return await this.repository.save(livro);
    }

    async update(id: number, livroData: AtualizarLivroDTO): Promise<Livro | null> {
        await this.repository.update(id, {
            ...livroData,
            dataAtualizacao: new Date()
        });
        return await this.findById(id);
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.delete(id);
        return result.affected !== null && result.affected > 0;
    }

    async findByAutor(autor: string): Promise<Livro[]> {
        return await this.repository.find({
            where: { autor: Like(`%${autor}%`) },
            order: { titulo: "ASC" }
        });
    }

    async findByTitulo(titulo: string): Promise<Livro[]> {
        return await this.repository.find({
            where: { titulo: Like(`%${titulo}%`) }
        });
    }

    async findByAnoPublicacao(anoInicio: number, anoFim: number): Promise<Livro[]> {
        return await this.repository.find({
            where: { anoPublicacao: Between(anoInicio, anoFim) }
        });
    }

    async findByDisponibilidade(disponivel: boolean): Promise<Livro[]> {
        return await this.repository.find({
            where: { disponivel }
        });
    }

    async verificarISBNExistente(isbn: string, excludeId?: number): Promise<boolean> {
        const query = this.repository.createQueryBuilder("livro")
            .where("livro.isbn = :isbn", { isbn });
        
        if (excludeId) {
            query.andWhere("livro.id != :excludeId", { excludeId });
        }
        
        const count = await query.getCount();
        return count > 0;
    }
}