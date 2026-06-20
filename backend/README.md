# FOCA — Sistema de Gestão Acadêmica

API REST desenvolvida com Fastify, Prisma e PostgreSQL.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) e Docker Compose

## Rodando o projeto localmente

### 1. Instale as dependências

```bash
npm install
```

### 2. Suba o banco de dados

```bash
docker compose -f docker-compose/postgres.docker-compose.yml up -d
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
DATABASE_URL="postgresql://foca_user:password@localhost:3015/foca"
JWT_SECRET="sua-chave-secreta-aqui"
SESSAO_DURACAO_MAXIMA_SEG=3600
SESSAO_MAX_DISCIPLINAS_DIA=3
SESSAO_MAX_POR_DISCIPLINA_DIA=1
```

### 4. Rode as migrations e o seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

O seed cria automaticamente um usuário por role para testes manuais:

| Role | Email | Senha |
|---|---|---|
| COORDENADOR | coordenador@foca.dev | senha123 |
| PROFESSOR | professor@foca.dev | senha123 |
| ALUNO | aluno@foca.dev | senha123 |

### 5. Inicie o servidor em modo desenvolvimento

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

### Documentação interativa (Swagger)

Acesse `http://localhost:3000/docs` para explorar e testar os endpoints via Swagger UI.

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento com hot-reload |
| `npm start` | Build e inicia em modo produção |
| `npm test` | Roda os testes unitários |
| `npm run test:coverage` | Roda os testes com relatório de cobertura |
| `npm run lint` | Verifica problemas de lint |
| `npm run lint:fix` | Corrige problemas de lint automaticamente |

---

## Recursos

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Prisma Documentation](https://www.prisma.io/docs)
