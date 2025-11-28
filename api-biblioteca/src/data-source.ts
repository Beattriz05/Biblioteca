import "reflect-metadata";
import { DataSource } from "typeorm";
import { Livro } from "./entity/Livro";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "biblioteca.sqlite",
    synchronize: true,
    logging: false,
    entities: [Livro],
    migrations: [],
    subscribers: [],
});