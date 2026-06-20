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
- Docker Desktop (com o Docker rodando)
- npm
- Git

---

## Como Rodar o Projeto (Primeira Vez)

### 1. Clone o repositório

```bash
git clone https://github.com/lightnvrr/projeto-es-2026-foca-final.git
cd projeto-es-2026-foca-final
```

---

### 2. Configure e inicie o backend

Abra um terminal dentro da pasta `backend/`:

```bash
cd backend
```

**Suba o banco de dados:**
```bash
docker compose -f docker-compose/postgres.docker-compose.yml up -d
```

**Configure as variáveis de ambiente** — crie um arquivo `.env` na pasta `backend/` com o conteúdo:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:3015/foca"
JWT_SECRET="sua_chave_secreta"
```

**Instale as dependências e prepare o banco:**
```bash
npm install
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

**Inicie o servidor:**
```bash
npm run dev
```

O backend estará disponível em `http://localhost:3000`. Deixe esse terminal aberto.

---

### 3. Configure e inicie o frontend

Abra **outro terminal** dentro da pasta `frontend/`:

```bash
cd frontend
```

**Instale as dependências:**
```bash
npm install
```

**Configure as variáveis de ambiente** — crie um arquivo `.env.local` na pasta `frontend/` com o conteúdo:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Inicie o servidor:**
```bash
npm run dev -- -p 3001
```

Acesse **`http://localhost:3001/login`** no navegador.

---

## Como Rodar no Dia a Dia

Após a primeira configuração, basta rodar os seguintes comandos:

**Terminal 1 — Backend:**
```bash
cd backend
docker compose -f docker-compose/postgres.docker-compose.yml up -d
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev -- -p 3001
```

---

## Como Testar

### Usuários disponíveis (seed)

| E-mail                 | Senha    | Papel        |
|------------------------|----------|--------------|
| coordenador@foca.dev   | senha123 | Coordenador  |
| professor@foca.dev     | senha123 | Professor    |
| aluno@foca.dev         | senha123 | Aluno        |

---

### Fluxo de teste — Coordenador

1. Acesse `http://localhost:3001/login`
2. Faça login com `coordenador@foca.dev` / `senha123`
3. Visualize o painel com resumo de professores ativos e inativos
4. Clique em **Cadastrar Equipe** e registre um novo professor ou coordenador
5. Clique em **Sair** para encerrar a sessão

---

### Fluxo de teste — Professor

1. Faça login com `professor@foca.dev` / `senha123`
2. Visualize o painel de monitoramento com status dos alunos por turma
3. Alterne entre as turmas disponíveis
4. Clique em **Cadastrar Aluno** e registre um novo aluno (informe nome, e-mail, senha, turma e turno)
5. Clique em **Sair** para encerrar a sessão

---

### Fluxo de teste — Aluno

1. Faça login com `aluno@foca.dev` / `senha123`
2. Visualize as disciplinas disponíveis
3. Clique em uma disciplina para **Iniciar** uma sessão de estudo
4. Clique em **Pausar** para interromper a sessão
5. Clique em **Retomar** para continuar
6. Clique em **Concluir** para finalizar a sessão
7. Verifique que a sessão aparece registrada na lista
8. Clique em **Sair** para encerrar a sessão

---

## Funcionalidades

- Login com autenticação JWT por papel (aluno, professor, coordenador)
- Painel do aluno: registro de sessões de estudo por disciplina (iniciar, pausar, retomar, concluir)
- Painel do professor: monitoramento da rotina dos alunos por turma + cadastro de alunos
- Painel da coordenação: visão geral dos professores + cadastro de equipe pedagógica
- Logout e proteção de rotas por papel

---

## Equipe

Desenvolvido por: Hellem Cristina, Jamily Barbosa, João Felipe Rufino, Nildo Carlos Araújo e Sarah Maria Rocha.  
Disciplina de Engenharia de Software — Universidade Federal de Alagoas (UFAL).
