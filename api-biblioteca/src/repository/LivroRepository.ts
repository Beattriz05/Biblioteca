import { AppDataSource } from "../data-source";
import { Livro } from "../entity/Livro";
import { Repository } from "typeorm";

// Repositório customizado com métodos específicos
export class LivroRepository {
    private repository: Repository<Livro>;

    constructor() {
        this.repository = AppDataSource.getRepository(Livro);
    }

    async findAll(): Promise<Livro[]> {
        return await this.repository.find();
    }

    async findById(id: number): Promise<Livro | null> {
        return await this.repository.findOneBy({ id });
    }

    async save(livro: Livro): Promise<Livro> {
        return await this.repository.save(livro);
    }

    async update(id: number, livroData: Partial<Livro>): Promise<Livro | null> {
        await this.repository.update(id, livroData);
        return await this.findById(id);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    async findByAutor(autor: string): Promise<Livro[]> {
        return await this.repository.find({ where: { autor } });
    }
}

export const livroRepository = new LivroRepository();