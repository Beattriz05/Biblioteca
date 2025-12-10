import "reflect-metadata";
import { DataSource } from "typeorm";
import { Livro } from "../entity/Livro";
import * as path from "path";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: process.env.DB_PATH || "database/biblioteca.sqlite",
    synchronize: process.env.NODE_ENV !== "production", // Apenas em desenvolvimento
    logging: process.env.NODE_ENV === "development",
    entities: [Livro],
    migrations: [path.join(__dirname, "migrations/*.ts")],
    subscribers: [],
    poolSize: 10,
    maxQueryExecutionTime: 1000, // 1 segundo
});