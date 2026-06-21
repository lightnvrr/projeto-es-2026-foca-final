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
- Next.js 16 (App Router)
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
docker-compose -f docker-compose/postgres.docker-compose.yml up -d
```

**Configure as variáveis de ambiente** — crie um arquivo `.env` na pasta `backend/` com o conteúdo:
```env
DATABASE_URL="postgresql://foca_user:password@localhost:3015/foca"
JWT_SECRET="sua_chave_secreta"
```

> As credenciais acima correspondem exatamente ao que está configurado no `docker-compose/postgres.docker-compose.yml`.

**Instale as dependências e prepare o banco:**
```bash
npm install
npx prisma migrate dev
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

**Terminal 1 — Banco de dados + Backend:**
```bash
cd backend
docker-compose -f docker-compose/postgres.docker-compose.yml up -d
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

### Fluxo de teste — Aluno

O painel do aluno é totalmente integrado ao backend.

1. Acesse `http://localhost:3001/login`
2. Faça login com `aluno@foca.dev` / `senha123`
3. Visualize as disciplinas disponíveis e os contadores do dia
4. Clique em uma disciplina para **Iniciar** uma sessão de estudo
5. Observe o cronômetro circular em tempo real
6. Clique em **Pausar** para interromper a sessão e **Retomar** para continuar
7. Clique em **Concluir** para finalizar — a sessão aparece registrada na lista
8. Ao atingir 45 minutos, a sessão é encerrada automaticamente
9. Clique em **Sair** para encerrar a sessão

**Limites aplicados:**
- Máximo de 3 disciplinas diferentes por dia
- Máximo de 2 sessões por disciplina por dia
- Máximo de 45 minutos por sessão

---

### Fluxo de teste — Professor

> O painel de monitoramento exibe dados simulados (mock). A integração com o endpoint de turmas/alunos está prevista para próxima iteração.

1. Faça login com `professor@foca.dev` / `senha123`
2. Visualize o painel com o status de rotina dos alunos por turma (dados mockados)
3. Alterne entre as turmas disponíveis usando os botões no topo
4. Clique em **Cadastrar Aluno** para registrar um novo aluno via formulário real (integrado ao backend)
5. Clique em **Sair** para encerrar a sessão

---

### Fluxo de teste — Coordenador

> O painel de professores exibe dados simulados (mock). A integração com o endpoint de professores vinculados está prevista para próxima iteração.

1. Faça login com `coordenador@foca.dev` / `senha123`
2. Visualize o painel com o resumo de professores ativos e inativos (dados mockados)
3. Clique em **Cadastrar Equipe** para registrar um novo professor ou coordenador via formulário real (integrado ao backend)
4. Clique em **Sair** para encerrar a sessão

---

## Funcionalidades

| Funcionalidade | Status |
|---|---|
| Login com autenticação JWT por papel (aluno, professor, coordenador) | Implementado |
| Painel do aluno: registro de sessões por disciplina (iniciar, pausar, retomar, concluir) | Implementado |
| Limites de sessão (45 min, 2 sessões/disciplina, 3 disciplinas/dia) | Implementado |
| Painel do professor: cadastro de alunos | Implementado |
| Painel do professor: monitoramento de rotina por turma | Mock (integração pendente) |
| Painel da coordenação: cadastro de equipe pedagógica | Implementado |
| Painel da coordenação: visão geral dos professores | Mock (integração pendente) |
| Logout e proteção de rotas por papel | Implementado |

---

## Equipe

Desenvolvido por: Hellem Cristina, Jamily Barbosa, João Felipe Rufino, Nildo Carlos Araújo e Sarah Maria Rocha.  
Disciplina de Engenharia de Software — Universidade Federal de Alagoas (UFAL).