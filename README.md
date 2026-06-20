# Foca — Plataforma de Gestão de Rotina Acadêmica

Projeto desenvolvido para a disciplina de Engenharia de Software (2026) na UFAL.

O **Foca** é uma plataforma web que permite a alunos registrar e acompanhar suas sessões de estudo, enquanto professores monitoram a rotina das turmas e coordenadores gerenciam a equipe pedagógica.

---

## Estrutura do Repositório

```
projeto-es-2026-foca-final/
├── backend/    # API REST com Fastify + Prisma + PostgreSQL
└── frontend/   # Interface web com Next.js + Tailwind CSS
```

---

## Tecnologias

**Backend**
- Node.js + TypeScript
- Fastify 5
- Prisma 7 (ORM)
- PostgreSQL (via Docker)
- Autenticação com JWT (HTTP Basic Auth no login)
- Zod para validação de schemas

**Frontend**
- Next.js 15 (App Router)
- Tailwind CSS v4
- TypeScript

---

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- npm
- Git

---

## Como Rodar o Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/lightnvrr/projeto-es-2026-foca-final.git
cd projeto-es-2026-foca-final
```

### 2. Suba o banco de dados

```bash
cd backend
docker compose up -d
```

### 3. Configure as variáveis de ambiente do backend

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

O arquivo `.env` deve conter:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:3015/foca"
JWT_SECRET="sua_chave_secreta"
```

### 4. Instale as dependências e rode as migrations do backend

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
npm run dev
```

O backend estará disponível em `http://localhost:3000`.

### 5. Configure e rode o frontend

Em outro terminal:

```bash
cd ../frontend
npm install
```

Crie o arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Inicie o frontend:

```bash
npm run dev -- -p 3001
```

O frontend estará disponível em `http://localhost:3001`.

---

## Usuários de Teste (Seed)

| E-mail                     | Senha      | Papel        |
|----------------------------|------------|--------------|
| coordenador@foca.dev       | senha123   | Coordenador  |
| professor@foca.dev         | senha123   | Professor    |
| aluno@foca.dev             | senha123   | Aluno        |

---

## Funcionalidades

- Login com autenticação JWT por papel (aluno, professor, coordenador)
- Painel do aluno: registro de sessões de estudo por disciplina (iniciar, pausar, retomar, concluir)
- Painel do professor: monitoramento da rotina dos alunos por turma + cadastro de alunos
- Painel da coordenação: visão geral dos professores + cadastro de equipe
- Logout e proteção de rotas por papel

---

## Equipe

Desenvolvido por estudantes da UFAL — Universidade Federal de Alagoas.
