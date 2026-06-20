# Foca — Documento de Tarefas e Arquitetura de Implementação (MVP Realinhado)

> Plano de implementação do MVP após realinhamento de escopo (15/06/2026).  
> Baseado no repositório [`Hellshi/es_2026_foca`](https://github.com/Hellshi/es_2026_foca) (branch `master`).

---

## 1. Contexto e escopo deste documento

Após reunião de realinhamento, o escopo do MVP foi **simplificado** para garantir entregabilidade. As principais mudanças:

- **Removida** a modelagem de `Escola` e toda a complexidade institucional.
- **Removida** a lógica de carga horária semanal e distribuição de sessões.
- **Cronômetro** se torna genérico: começa em zero, conta tempo livre, envia apenas `tempo_total_seg` ao final.
- **Histórico** de sessões fica visível apenas para o aluno (sem painéis complexos).
- **Campos avançados** (como `NivelFoco`) tornam-se opcionais para fases futuras.

Este documento atualiza a arquitetura, o modelo de domínio e o backlog de tarefas de acordo com o **MVP mínimo viável**.

---

## 2. Stack real (confirmada no repositório)

| Camada | Tecnologia |
| --- | --- |
| Linguagem | TypeScript 5.9 |
| Framework HTTP | **Fastify 5** + `fastify-cli` + `@fastify/autoload` |
| Validação | **Zod 4** + `fastify-type-provider-zod` |
| Persistência | **Prisma 7** sobre **PostgreSQL** |
| Autenticação | `bcryptjs` + `jsonwebtoken` (JWT) |
| Testes | Jest + `ts-jest` + `c8` |
| Qualidade | ESLint + Prettier + Husky |

---

## 3. Arquitetura simplificada

| Camada lógica | Onde vive no código |
| --- | --- |
| API (rotas) | `src/routes/**` — handlers Fastify + schemas Zod |
| Serviços (regras de negócio) | `src/services/**` — **testáveis isoladamente** |
| Suporte transversal | `src/plugins/**` — Prisma, auth, etc. |
| Dados | `prisma/schema.prisma` + Prisma Client (`src/generated`) |

> **Decisão ADR D1 confirmada:** regras de negócio ficam em `services/`, fora dos handlers.

---

## 4. Modelo de domínio (pós-realinhamento)

### 4.1 O que permanece do schema original

| Modelo | Status |
| --- | --- |
| `Usuario` | Mantido (role, senha_hash, ativo) |
| `Aluno` | Mantido (turno, vínculo 1:1 com `Usuario`) |
| `Professor` | Mantido (vínculo com `Usuario`) |
| `Coordenador` | Mantido (vínculo com `Usuario`) |
| `Turma` | Mantido (nome, ano letivo, turno, série) |
| `Disciplina` | Mantido (carga_horaria_semanal — **torna-se opcional**) |

> **Escola foi removida** em nível de modelo e de todas as relações.

### 4.2 Modelo de sessão de estudo (simplificado)

```prisma
enum StatusSessao {
  CRIADA
  EM_ANDAMENTO
  PAUSADA
  CONCLUIDA
}

model SessaoEstudo {
  id             Int          @id @default(autoincrement())
  aluno_id       Int
  iniciada_em    DateTime     @default(now())
  concluida_em   DateTime?
  tempo_total_seg Int         @default(0)  // tempo estudado (sem distribuição)
  status         StatusSessao @default(CRIADA)

  aluno Aluno @relation(fields: [aluno_id], references: [id], onDelete: Cascade)

  @@index([aluno_id])
  @@map("sessao_estudo")
}