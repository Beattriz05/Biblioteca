import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("livros")
export class Livro {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 200 })
    titulo: string;

    @Column({ type: "varchar", length: 100 })
    autor: string;

    @Column({ type: "varchar", length: 17, unique: true })
    isbn: string;

    @Column({ type: "int", name: "ano_publicacao" })
    anoPublicacao: number;

    @Column({ type: "boolean", default: true })
    disponivel: boolean;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    dataCriacao: Date;

    @Column({ type: "timestamp", nullable: true, onUpdate: "CURRENT_TIMESTAMP" })
    dataAtualizacao: Date;
}