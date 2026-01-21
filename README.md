# 📑 API Biblioteca 

Esta API foi desenvolvida para ser uma solução escalável e segura no gerenciamento de acervos bibliográficos. O projeto demonstra a aplicação prática de conceitos avançados de Análise e Desenvolvimento de Sistemas, como middlewares de segurança, monitoramento de recursos e encerramento gracioso.

⚙️ Principais Funcionalidades

- Gestão de Livros: Cadastro e listagem com suporte a paginação e ordenação.

- Segurança Integrada: Proteção contra ataques comuns, controle de acessos e limite de requisições.

- Monitoramento de Saúde: Endpoint/health para verificar o status do sistema e banco de dados em tempo real.

- Validação Automatizada: Middlewares para sanitização de dados e verificação de tipos de conteúdo.

- Encerramento Seguro: Sistema de Graceful Shutdown para proteção da integridade dos dados

🛠️ Stack Tecnológica 

O projeto foi estruturado para garantir performance e facilidade de manutenção:

- Backend: Node.js + Express

- Linguagem: TypeScript

- Banco de Dados: SQLite (via TypeORM)

- Segurança: Helmet, Express-Rate-Limit, CORS

- Logs: Morgan

🪻 Como Iniciar

1. Instalação

```
npm install
```

2. Configuração

O sistema já vem configurado para rodar localmente por padrão, mas você pode customizar as portas no arquivo .env.

3. Execução

```
# Modo Desenvolvimento
npm run dev

# Modo Produção
npm run build && npm start
```