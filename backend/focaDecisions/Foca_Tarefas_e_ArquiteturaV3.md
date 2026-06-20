# Foca — Documento de Tarefas e Arquitetura de Implementação (MVP Realinhado)

> Plano de implementação do MVP após realinhamento de escopo (15/06/2026).  
> Baseado no repositório [`Hellshi/es_2026_foca`](https://github.com/Hellshi/es_2026_foca) (branch `master`).  
> **V3 — 16/06/2026:** introdução de limites de sessão por disciplina e por dia.

---

## 1. Contexto e escopo deste documento

Após reunião de realinhamento, o escopo do MVP foi **simplificado** para garantir entregabilidade. As principais mudanças da V2 foram mantidas:

- **Removida** a modelagem de `Escola` e toda a complexidade institucional.
- **Removida** a lógica de carga horária semanal e distribuição de sessões.
- **Cronômetro** se torna genérico: começa em zero, conta tempo livre, envia apenas `tempo_total_seg` ao final.
- **Histórico** de sessões fica visível apenas para o aluno (sem painéis complexos).
- **Campos avançados** (como `NivelFoco`) tornam-se opcionais para fases futuras.

**Novas regras introduzidas na V3 (16/06/2026):**

- **RN-S1 — Limite de duração por sessão:** cada sessão de estudo é limitada a **45 minutos por disciplina**. Ao atingir esse limite, a sessão é encerrada automaticamente.
- **RN-S2 — Limite de disciplinas diferentes por dia:** um aluno pode executar sessões de **no máximo 3 disciplinas distintas** por dia calendário.
- **RN-S3 — Limite de sessões por disciplina por dia:** para uma mesma disciplina, o aluno pode executar **no máximo 2 sessões** por dia calendário.

Este documento atualiza a arquitetura, o modelo de domínio e o backlog de tarefas de acordo com essas regras.

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
> **Decisão ADR D6 (nova):** as três regras de limite de sessão (RN-S1, RN-S2, RN-S3) são verificadas **exclusivamente em `src/services/sessao.ts`**, antes de qualquer escrita no banco. Os handlers de rota nunca validam limites de negócio diretamente.

---

## 4. Modelo de domínio (pós-realinhamento V3)

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

### 4.2 Modelo de sessão de estudo (atualizado na V3)

As regras RN-S1, RN-S2 e RN-S3 impõem duas alterações estruturais no modelo:

1. `disciplina_id` torna-se **obrigatório** — sem ele é impossível verificar RN-S2 e RN-S3.
2. `duracao_maxima_seg` é introduzido como constante de domínio (2 700 s = 45 min), e `tempo_total_seg` passa a ser guardado para permitir verificação de encerramento automático por RN-S1.

```prisma
enum StatusSessao {
  CRIADA
  EM_ANDAMENTO
  PAUSADA
  CONCLUIDA
  ENCERRADA_POR_LIMITE   // encerrada automaticamente ao atingir 45 min (RN-S1)
}

model SessaoEstudo {
  id               Int          @id @default(autoincrement())
  aluno_id         Int
  disciplina_id    Int                          // obrigatório (RN-S2, RN-S3)
  iniciada_em      DateTime     @default(now())
  concluida_em     DateTime?
  tempo_total_seg  Int          @default(0)     // acumulado entre pausas
  status           StatusSessao @default(CRIADA)

  aluno      Aluno      @relation(fields: [aluno_id], references: [id], onDelete: Cascade)
  disciplina Disciplina @relation(fields: [disciplina_id], references: [id], onDelete: Cascade)

  // Índice composto para lookup eficiente das regras diárias (RN-S2, RN-S3)
  @@index([aluno_id, disciplina_id, iniciada_em])
  @@map("sessao_estudo")
}
```

> Será preciso adicionar as relações inversas (`sessoes SessaoEstudo[]`) em `Aluno` e `Disciplina`.

### 4.3 Constantes de domínio

As constantes abaixo devem ser definidas em `src/config/sessao.ts` e consumidas apenas pela camada de serviços, nunca hard-coded nos handlers:

```typescript
export const SESSAO_DURACAO_MAXIMA_SEG = 2_700;   // 45 min — RN-S1
export const SESSAO_MAX_DISCIPLINAS_DIA = 3;        // RN-S2
export const SESSAO_MAX_POR_DISCIPLINA_DIA = 2;     // RN-S3
```

---

## 5. Regras de negócio de sessão — especificação detalhada

### RN-S1 — Limite de duração por sessão (45 min)

- **Gatilho:** ao receber a atualização de `tempo_total_seg` (via endpoint de conclusão ou heartbeat), o service verifica se `tempo_total_seg >= SESSAO_DURACAO_MAXIMA_SEG`.
- **Efeito:** se o limite for atingido, o status é alterado para `ENCERRADA_POR_LIMITE` e `concluida_em` é preenchido com o timestamp atual. O aluno é notificado via resposta da API.
- **Observação:** o front-end deve respeitar o limite localmente (bloqueando o timer aos 45 min), mas o back-end aplica a regra de forma autoritativa na conclusão da sessão.

### RN-S2 — Máximo de 3 disciplinas distintas por dia

- **Gatilho:** ao tentar **criar** uma nova `SessaoEstudo`.
- **Verificação:** o service consulta quantas `disciplina_id` distintas o aluno já iniciou no dia calendário corrente (janela: `00:00:00` até `23:59:59` no fuso do servidor).
- **Efeito:** se o resultado for ≥ 3 **e** a nova sessão for de uma disciplina ainda não estudada no dia, a criação é bloqueada com HTTP 422 e código de erro `LIMITE_DISCIPLINAS_DIA_ATINGIDO`.

### RN-S3 — Máximo de 2 sessões por disciplina por dia

- **Gatilho:** ao tentar **criar** uma nova `SessaoEstudo`.
- **Verificação:** o service conta quantas sessões já existem para o par `(aluno_id, disciplina_id)` no dia calendário corrente (qualquer status exceto `CRIADA` cancelada, se houver).
- **Efeito:** se o resultado for ≥ 2, a criação é bloqueada com HTTP 422 e código de erro `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO`.

> **Ordem de verificação no service:** RN-S3 → RN-S2 → criação. Verificar a restrição mais específica primeiro fornece mensagem de erro mais útil ao aluno.

---

## 6. Decisões de arquitetura

| ID | Decisão | Status |
| --- | --- | --- |
| D1 | Regras de negócio em `src/services/`, fora dos handlers | Confirmado |
| D2 | Prisma exposto via plugin decorador (`fastify.prisma`), instância única | A implementar |
| D3 | Auth: JWT stateless; `role` no payload; autorização por `preHandler` parametrizado por perfil | A implementar |
| D4 | Sessões persistidas conforme interação do aluno; sem geração automática de cronograma | Confirmado |
| D5 | Limiares de classificação definidos por configuração, a validar com a coordenadora | A definir com cliente |
| D6 | Limites de sessão (RN-S1/S2/S3) verificados exclusivamente em `services/sessao.ts` | **Novo — V3** |

---

## 7. Backlog de tarefas por épico

Legenda: cada tarefa só está "pronta" quando tem **rota com schema Zod + service testado + teste passando**.

### E0 — Fundação e convenções (transversal)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E0.1 | Plugin `prisma` (decorador `fastify.prisma`, conexão única, shutdown limpo) | — | — | Rotas acessam `fastify.prisma`; nenhuma instância solta |
| E0.2 | Padronizar tratamento de erro com `@fastify/sensible` + formato de erro Zod | RNF05 | — | Respostas de erro com formato único e status correto |
| E0.3 | Definir estrutura `src/services/` e exemplo de service testado | RNF05 | — | 1 service de referência com teste unitário verde |
| E0.4 | Criar `src/config/sessao.ts` com as constantes de domínio (RN-S1/S2/S3) | RN-S1, RN-S2, RN-S3 | — | Constantes importáveis; nenhum valor mágico no código |

### E1 — Autenticação e autorização por perfil

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E1.1 | Endpoint de login: valida credenciais, compara `bcryptjs`, emite JWT com `role` | RF09 | E0.1 | Credencial válida → token; inválida → 401 |
| E1.2 | Plugin de auth: `preHandler` que valida JWT e popula `request.user` | RF09 | E1.1 | Rota protegida sem token → 401 |
| E1.3 | Autorização por perfil: `preHandler` parametrizado (`requireRole('PROFESSOR')`) | RF09 | E1.2 | Perfil errado → 403 |
| E1.4 | Testes de autorização cruzada (cada perfil só acessa seu módulo) | RF09 | E1.3 | Matriz perfil×módulo coberta por testes |

### E2 — Cadastro institucional (RF01–RF05)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E2.1 | CRUD de `Turma` (nome, ano letivo, turno, série) | RF02 | E1.3 | Turma criada e listável |
| E2.2 | CRUD de `Disciplina` | RF03 | E2.1 | Disciplina criada e vinculável |
| E2.3 | Cadastro/vínculo de `Professor` e `Coordenador` | RF04 | E2.1 | Professor vinculável a turmas |
| E2.4 | Cadastro de `Aluno` com vínculo a **exatamente uma** turma por período | RF05 | E2.1 | Tentar 2 turmas no mesmo período → erro de validação |

### E3 — Migration do modelo de sessão (V3)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E3.1 | Migration: adicionar `disciplina_id` (NOT NULL) e `ENCERRADA_POR_LIMITE` ao enum `StatusSessao` | RN-S1, RN-S2, RN-S3 | E0.4 | Schema migrado; relações inversas em `Aluno` e `Disciplina` |
| E3.2 | Migration: índice composto `(aluno_id, disciplina_id, iniciada_em)` | RN-S2, RN-S3 | E3.1 | Query de contagem diária usa o índice (verificar via `EXPLAIN`) |

### E4 — Service de sessão com regras de limite

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E4.1 | `criarSessao(aluno_id, disciplina_id)`: verifica RN-S3 → RN-S2 antes de inserir | RN-S2, RN-S3 | E3.2, E0.4 | 3ª sessão da mesma disciplina no dia → 422 `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO`; 4ª disciplina diferente no dia → 422 `LIMITE_DISCIPLINAS_DIA_ATINGIDO` |
| E4.2 | `iniciarSessao(sessao_id)`: status → `EM_ANDAMENTO`, `iniciada_em` setado | RF06 | E4.1 | Sessão passa a `EM_ANDAMENTO`; timer ativo no front |
| E4.3 | `pausarSessao(sessao_id, tempo_total_seg)`: persiste tempo acumulado, status → `PAUSADA` | RF07 | E4.2 | Retomar continua de onde parou sem perda de progresso |
| E4.4 | `concluirSessao(sessao_id, tempo_total_seg)`: aplica RN-S1; status → `CONCLUIDA` ou `ENCERRADA_POR_LIMITE` | RN-S1 | E4.2 | `tempo_total_seg >= 2700` → status `ENCERRADA_POR_LIMITE`; abaixo → `CONCLUIDA` |
| E4.5 | Testes unitários do service: cobrir os 3 casos de bloqueio (RN-S1, RN-S2, RN-S3) e os caminhos felizes | RN-S1/S2/S3 | E4.4 | Mínimo de 8 casos de teste: 3 bloqueios + 3 bordas + 2 caminhos felizes |

### E5 — Rotas HTTP da sessão

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E5.1 | `POST /sessoes` — cria sessão (chama `criarSessao`) | RN-S2, RN-S3 | E4.1, E1.3 | Schema Zod valida `disciplina_id` obrigatório; erros de limite retornam 422 com código legível |
| E5.2 | `PATCH /sessoes/:id/iniciar` — inicia sessão | RF06 | E4.2 | Sessão já em andamento → 409 |
| E5.3 | `PATCH /sessoes/:id/pausar` — pausa com `tempo_total_seg` no body | RF07 | E4.3 | Sessão não em andamento → 409 |
| E5.4 | `PATCH /sessoes/:id/concluir` — conclui com `tempo_total_seg` no body | RN-S1 | E4.4 | Resposta indica se foi `CONCLUIDA` ou `ENCERRADA_POR_LIMITE` |
| E5.5 | `GET /sessoes/hoje` — lista sessões do aluno no dia, com totais por disciplina | RN-S2, RN-S3 | E4.1 | Resposta inclui contagem de disciplinas distintas e sessões por disciplina no dia |

### E6 — Histórico e visualização do aluno

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E6.1 | `GET /sessoes/historico` — histórico paginado do aluno | — | E5.1 | Retorna sessões ordenadas por `iniciada_em` desc; paginação funcional |

### E7 — Qualidade e RNFs (transversal, contínuo)

| ID | Tarefa | RF/RNF | Critério de aceite |
| --- | --- | --- | --- |
| E7.1 | Cobertura de testes dos services críticos (sessão, auth) | RNF05 | `npm run test:coverage` acima do limite acordado pela equipe |
| E7.2 | Otimizar carregamento da tela principal do aluno (índices Prisma, payload enxuto) | RNF03 | P95 ≤ 2 s |
| E7.3 | Validar compatibilidade cross-browser e responsividade ≥ 360 px (front) | RNF06 | Funcional em Chrome/Firefox/Safari/Edge a partir de 360 px |
| E7.4 | Plano de disponibilidade (healthcheck, deploy, monitoramento) | RNF04 | Healthcheck exposto; estratégia de uptime documentada |

---

## 8. Roadmap sugerido (sprints semanais)

| Sprint | Foco | Tarefas | Entregável demonstrável |
| --- | --- | --- | --- |
| 1 | Fundação + Auth | E0.1–E0.4, E1.1–E1.4 | Login por perfil funcionando; acesso restrito por módulo |
| 2 | Cadastro institucional | E2.1–E2.4 | Turma → disciplina → professor → aluno cadastráveis |
| 3 | Migration do modelo de sessão | E3.1–E3.2 | Schema com `disciplina_id` e novo enum migrado; índice composto no banco |
| 4 | Service de sessão + regras de limite | E4.1–E4.5 | Regras RN-S1/S2/S3 testadas isoladamente; service verde |
| 5 | Rotas HTTP de sessão | E5.1–E5.5 | Fluxo completo criar/iniciar/pausar/concluir via API; erros 422 com código semântico |
| 6 | Histórico + qualidade + RNFs | E6.1, E7.1–E7.4 | Histórico paginado; cobertura, performance e compatibilidade validadas |

> E7 corre em paralelo desde o início (testes junto com cada tarefa); a sprint 6 é o fechamento/ajuste.

---

## 9. Rastreabilidade requisito → tarefa

| Requisito | Coberto por |
| --- | --- |
| RF02 (cadastro de turmas) | E2.1 |
| RF03 (disciplinas) | E2.2 |
| RF04 (professores e coordenadores) | E2.3 |
| RF05 (alunos, 1 turma por período) | E2.4 |
| RF06 (iniciar sessão + timer) | E4.2, E5.2 |
| RF07 (pausar/retomar) | E4.3, E5.3 |
| RF09 (acesso por perfil) | E1.1–E1.4 |
| RN-S1 (limite 45 min por sessão) | E0.4, E3.1, E4.4, E4.5, E5.4 |
| RN-S2 (máx. 3 disciplinas distintas/dia) | E0.4, E3.1, E3.2, E4.1, E4.5, E5.1, E5.5 |
| RN-S3 (máx. 2 sessões por disciplina/dia) | E0.4, E3.1, E3.2, E4.1, E4.5, E5.1, E5.5 |
| RNF03 (P95 ≤ 2 s) | E7.2 |
| RNF04 (uptime ≥ 99,5%) | E7.4 |
| RNF05 (modular, orientado a contratos) | E0.2, E0.3, E7.1 |
| RNF06 (4 navegadores, ≥ 360 px) | E7.3 |

---

## 10. Riscos e pontos de atenção

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| `disciplina_id` agora obrigatório quebra o modelo V2 | Alto — exige migration com cuidado se houver dados existentes | Aplicar migration em ambiente de dev antes de produção; incluir script de backfill se necessário |
| Fuso horário do servidor afeta a janela "dia calendário" de RN-S2 e RN-S3 | Médio — aluno próximo à meia-noite pode ter comportamento inesperado | Definir e documentar o fuso em `src/config/sessao.ts`; considerar enviar data do cliente no body de `criarSessao` |
| Front-end precisa conhecer os limites para UX proativa | Médio — sem feedback antecipado, o aluno só descobre o bloqueio ao tentar criar a sessão | Endpoint `GET /sessoes/hoje` (E5.5) deve retornar contagens para o front exibir limites restantes antes de o usuário tentar |
| Encerramento automático por RN-S1 pode surpreender o aluno | Baixo-médio — timer para do nada sem aviso | Front-end deve monitorar localmente o tempo e exibir aviso antes dos 45 min; back-end é a barreira autoritativa |
| Limiares de classificação (D5) sem validação do cliente | Médio — painéis podem não refletir a realidade pedagógica | Levar à coordenadora numa Sprint Review |
