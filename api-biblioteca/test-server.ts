import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
    res.send("Servidor Express está funcionando!");
});

app.listen(PORT, () => {
    console.log(`Servidor teste rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});