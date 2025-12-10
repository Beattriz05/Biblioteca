export interface CriarLivroDTO {
    titulo: string;
    autor: string;
    isbn: string;
    anoPublicacao: number;
}

export interface AtualizarLivroDTO {
    titulo?: string;
    autor?: string;
    isbn?: string;
    anoPublicacao?: number;
    disponivel?: boolean;
}

export interface LivroResponse {
    id: number;
    titulo: string;
    autor: string;
    isbn: string;
    anoPublicacao: number;
    disponivel: boolean;
    dataCriacao: Date;
    dataAtualizacao: Date;
}