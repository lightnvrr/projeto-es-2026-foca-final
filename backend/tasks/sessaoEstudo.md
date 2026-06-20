# Plano de Tarefa: Implementação do Cronômetro de Estudo (Sessão de Estudo)

> **Baseado em:** Foca_Tarefas_e_ArquiteturaV3.md (16/06/2026)  
> **Alterações em relação à versão anterior:** introdução das regras RN-S1 (limite de 45 min), RN-S2 (máx. 3 disciplinas/dia) e RN-S3 (máx. 2 sessões por disciplina/dia).

---

## Objetivo

Implementar o backend do cronômetro de estudo do aluno, permitindo que o aluno:

- Crie sessões de estudo vinculadas a uma disciplina
- Inicie, pause, retome e conclua sessões
- Acumule tempo estudado com encerramento automático ao atingir 45 min
- Respeite os limites diários de disciplinas e sessões por disciplina
- Visualize as sessões do dia e o histórico paginado

---

## Pré-requisitos

Antes de iniciar esta tarefa, verifique se os seguintes itens estão concluídos:

| ID | Item | Responsável | Status |
| --- | --- | --- | --- |
| 1 | Plugin Prisma funcionando (`fastify.prisma`) | Backend | ⬜ |
| 2 | Tratamento de erros padronizado (`@fastify/sensible`) | Backend | ⬜ |
| 3 | Estrutura `src/services/` criada | Backend | ⬜ |
| 4 | Migration removendo modelo `Escola` aplicada | Backend | ⬜ |
| 5 | Autenticação JWT funcionando (login + middleware) | Backend | ⬜ |
| 6 | Cadastro de pelo menos 1 aluno e 1 disciplina para testes | Backend | ⬜ |
| 7 | `src/config/sessao.ts` criado com as constantes de domínio | Backend | ⬜ |

> **Atenção ao item 7:** nenhum valor numérico de limite (45 min, 3 disciplinas, 2 sessões) deve aparecer hard-coded em services ou handlers. Sempre importar de `src/config/sessao.ts`.

---

## Constantes de domínio

Criar o arquivo `src/config/sessao.ts` **antes de qualquer outra fase**:

```typescript
// src/config/sessao.ts

export const SESSAO_DURACAO_MAXIMA_SEG = 2_700;  // 45 min — RN-S1
export const SESSAO_MAX_DISCIPLINAS_DIA = 3;       // RN-S2
export const SESSAO_MAX_POR_DISCIPLINA_DIA = 2;    // RN-S3
```

---

## Passo a Passo

### Fase 1: Modelagem e Migration

#### 1A — Schema do modelo de sessão (E3.1)

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 1A.1 | Abrir arquivo `prisma/schema.prisma` | Arquivo existe |
| 1A.2 | Adicionar `enum StatusSessao` com valores: `CRIADA`, `EM_ANDAMENTO`, `PAUSADA`, `CONCLUIDA`, `ENCERRADA_POR_LIMITE` | Enum criado com os 5 valores |
| 1A.3 | Adicionar model `SessaoEstudo` com os campos abaixo | Model criado |
| 1A.4 | Adicionar relação `sessoes SessaoEstudo[]` no model `Aluno` | Relação adicionada |
| 1A.5 | Adicionar relação `sessoes SessaoEstudo[]` no model `Disciplina` | Relação adicionada |

**Schema esperado para `SessaoEstudo`:**

```prisma
model SessaoEstudo {
  id              Int          @id @default(autoincrement())
  aluno_id        Int
  disciplina_id   Int                       // obrigatório — RN-S2, RN-S3
  iniciada_em     DateTime     @default(now())
  concluida_em    DateTime?
  tempo_total_seg Int          @default(0)  // acumulado entre pausas
  status          StatusSessao @default(CRIADA)

  aluno      Aluno      @relation(fields: [aluno_id], references: [id], onDelete: Cascade)
  disciplina Disciplina @relation(fields: [disciplina_id], references: [id], onDelete: Cascade)

  @@index([aluno_id, disciplina_id, iniciada_em])  // suporta lookup diário de RN-S2 e RN-S3
  @@map("sessao_estudo")
}
```

> O valor `ENCERRADA_POR_LIMITE` distingue encerramento automático (RN-S1) de conclusão voluntária (`CONCLUIDA`). Isso é relevante para o histórico e para métricas futuras.

#### 1B — Migration e geração do client (E3.2)

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 1B.1 | Executar `npx prisma migrate dev --name add_sessao_estudo_v3` | Migration gerada |
| 1B.2 | Executar `npx prisma generate` | Client atualizado em `src/generated` |
| 1B.3 | Verificar no banco se tabela `sessao_estudo` foi criada com a coluna `disciplina_id` | Tabela existe; coluna NOT NULL presente |
| 1B.4 | Verificar se o índice composto `(aluno_id, disciplina_id, iniciada_em)` existe | `\d sessao_estudo` no psql lista o índice |
| 1B.5 | Executar `EXPLAIN` em uma query de contagem diária e confirmar que o índice é usado | Plano de execução não faz Seq Scan na tabela |

**Critério de aceite:** tabela criada com `disciplina_id` NOT NULL, índice composto presente e utilizado em queries de contagem diária.

---

### Fase 2: Service de Sessão

Criar arquivo `src/services/sessaoService.ts`. O service **não importa nada do Fastify** — recebe o client Prisma pelo constructor e exporta métodos puros testáveis.

#### 2.1 — Estrutura base

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.1.1 | Criar `src/services/sessaoService.ts` com classe `SessaoService` | Arquivo existe |
| 2.1.2 | Constructor recebe instância do Prisma Client | Sem import direto do Prisma no service |
| 2.1.3 | Importar constantes de `src/config/sessao.ts` no topo do arquivo | Nenhum número mágico no service |

#### 2.2 — `criarSessao(alunoId, disciplinaId)` — RN-S2, RN-S3

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.2.1 | Determinar a janela do dia atual (início e fim em UTC ou fuso configurado) | Janela correta para o dia calendário |
| 2.2.2 | Contar sessões do par `(alunoId, disciplinaId)` na janela do dia | Query usa o índice composto |
| 2.2.3 | Se contagem ≥ `SESSAO_MAX_POR_DISCIPLINA_DIA` → lançar erro `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO` | Bloqueio correto antes de qualquer escrita |
| 2.2.4 | Contar `disciplina_id` distintos do aluno na janela do dia (excluindo a disciplina atual, se já presente) | Query de distinct correto |
| 2.2.5 | Se disciplina não estudada hoje E contagem distinta ≥ `SESSAO_MAX_DISCIPLINAS_DIA` → lançar erro `LIMITE_DISCIPLINAS_DIA_ATINGIDO` | Bloqueio correto; disciplina já estudada não recontada |
| 2.2.6 | Inserir `SessaoEstudo` com `status: CRIADA` | Registro criado no banco |

> **Ordem de verificação obrigatória:** RN-S3 antes de RN-S2. A restrição mais específica (mesma disciplina) deve gerar a mensagem de erro mais útil para o aluno.

#### 2.3 — `iniciarSessao(sessaoId, alunoId)`

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.3.1 | Buscar sessão por `id` e `aluno_id` | Sessão não encontrada → erro 404 |
| 2.3.2 | Verificar se status é `CRIADA` ou `PAUSADA` | Status inválido → erro 409 |
| 2.3.3 | Atualizar status para `EM_ANDAMENTO` | Status persistido |

#### 2.4 — `pausarSessao(sessaoId, alunoId, tempoTotalSeg)`

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.4.1 | Buscar sessão por `id` e `aluno_id` | Sessão não encontrada → erro 404 |
| 2.4.2 | Verificar se status é `EM_ANDAMENTO` | Status inválido → erro 409 |
| 2.4.3 | Persistir `tempo_total_seg` recebido e atualizar status para `PAUSADA` | Tempo acumulado salvo corretamente |

#### 2.5 — `retomarSessao(sessaoId, alunoId)`

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.5.1 | Buscar sessão por `id` e `aluno_id` | Sessão não encontrada → erro 404 |
| 2.5.2 | Verificar se status é `PAUSADA` | Status inválido → erro 409 |
| 2.5.3 | Atualizar status para `EM_ANDAMENTO` | Retomada sem perda de `tempo_total_seg` |

#### 2.6 — `concluirSessao(sessaoId, alunoId, tempoTotalSeg)` — RN-S1

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.6.1 | Buscar sessão por `id` e `aluno_id` | Sessão não encontrada → erro 404 |
| 2.6.2 | Verificar se status é `EM_ANDAMENTO` ou `PAUSADA` | Status inválido → erro 409 |
| 2.6.3 | Se `tempoTotalSeg >= SESSAO_DURACAO_MAXIMA_SEG` → status `ENCERRADA_POR_LIMITE` | RN-S1 aplicada pelo back-end autoritativamente |
| 2.6.4 | Caso contrário → status `CONCLUIDA` | Conclusão voluntária registrada |
| 2.6.5 | Persistir `tempo_total_seg` e `concluida_em = now()` | Campos preenchidos corretamente |
| 2.6.6 | Retornar o status final ao handler para inclusão na resposta | Front-end pode diferenciar os dois casos |

#### 2.7 — `listarSessoesHoje(alunoId)`

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.7.1 | Buscar todas as sessões do aluno na janela do dia | Mesma janela usada em `criarSessao` |
| 2.7.2 | Agregar contagem de disciplinas distintas e contagem por disciplina | Dados para o front exibir limites restantes |
| 2.7.3 | Retornar sessões + metadados de limite (`disciplinas_distintas_hoje`, `sessoes_por_disciplina`) | Front consegue exibir feedback proativo ao aluno |

#### 2.8 — `listarHistorico(alunoId, page, limit, status?)`

| Etapa | Ação | Verificação |
| --- | --- | --- |
| 2.8.1 | Buscar sessões do aluno com filtro opcional de `status` | Filtro funcional |
| 2.8.2 | Ordenar por `iniciada_em` decrescente | Sessões mais recentes primeiro |
| 2.8.3 | Aplicar paginação com `skip`/`take` do Prisma | Retorno inclui `data` e metadados de `pagination` |

**Critério de aceite da fase:** todos os métodos implementados com validações de propriedade e status; nenhum número mágico no código; constantes importadas de `src/config/sessao.ts`.

---

### Fase 3: Endpoints (Rotas)

Todos os endpoints exigem `preHandler` de autenticação + role `ALUNO`. O handler nunca valida regras de negócio — apenas repassa ao service e formata a resposta.

#### 3.1 — Criar sessão `POST /sessoes`

| Etapa | Ação |
| --- | --- |
| 3.1.1 | Criar pasta `src/routes/sessoes/` |
| 3.1.2 | Criar arquivo `src/routes/sessoes/criar.ts` |
| 3.1.3 | Definir schema Zod para body: `{ disciplina_id: z.number().int().positive() }` |
| 3.1.4 | Definir schema Zod para resposta 201 com dados da sessão criada |
| 3.1.5 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.1.6 | Chamar `sessaoService.criarSessao(alunoId, disciplinaId)` |
| 3.1.7 | Mapear erro `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO` → HTTP 422 com código no body |
| 3.1.8 | Mapear erro `LIMITE_DISCIPLINAS_DIA_ATINGIDO` → HTTP 422 com código no body |
| 3.1.9 | Retornar resposta 201 com dados da sessão |

#### 3.2 — Iniciar sessão `PATCH /sessoes/:id/iniciar`

| Etapa | Ação |
| --- | --- |
| 3.2.1 | Criar arquivo `src/routes/sessoes/[id]/iniciar.ts` |
| 3.2.2 | Definir schema Zod com params `{ id: z.coerce.number().int() }` |
| 3.2.3 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.2.4 | Chamar `sessaoService.iniciarSessao(id, alunoId)` |
| 3.2.5 | Sessão já em andamento → 409 |
| 3.2.6 | Retornar resposta 200 com status atualizado |

#### 3.3 — Pausar sessão `PATCH /sessoes/:id/pausar`

| Etapa | Ação |
| --- | --- |
| 3.3.1 | Criar arquivo `src/routes/sessoes/[id]/pausar.ts` |
| 3.3.2 | Definir schema Zod com params `id` + body `{ tempo_total_seg: z.number().int().min(0) }` |
| 3.3.3 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.3.4 | Chamar `sessaoService.pausarSessao(id, alunoId, tempoTotalSeg)` |
| 3.3.5 | Sessão não em andamento → 409 |
| 3.3.6 | Retornar resposta 200 com `tempo_total_seg` acumulado atual |

#### 3.4 — Retomar sessão `PATCH /sessoes/:id/retomar`

| Etapa | Ação |
| --- | --- |
| 3.4.1 | Criar arquivo `src/routes/sessoes/[id]/retomar.ts` |
| 3.4.2 | Definir schema Zod com params `id` |
| 3.4.3 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.4.4 | Chamar `sessaoService.retomarSessao(id, alunoId)` |
| 3.4.5 | Sessão não pausada → 409 |
| 3.4.6 | Retornar resposta 200 com status `EM_ANDAMENTO` e `tempo_total_seg` atual |

#### 3.5 — Concluir sessão `PATCH /sessoes/:id/concluir` — RN-S1

| Etapa | Ação |
| --- | --- |
| 3.5.1 | Criar arquivo `src/routes/sessoes/[id]/concluir.ts` |
| 3.5.2 | Definir schema Zod com params `id` + body `{ tempo_total_seg: z.number().int().min(0) }` |
| 3.5.3 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.5.4 | Chamar `sessaoService.concluirSessao(id, alunoId, tempoTotalSeg)` |
| 3.5.5 | Retornar resposta 200 com a sessão concluída e o `status` final (`CONCLUIDA` ou `ENCERRADA_POR_LIMITE`) |

> O campo `status` na resposta é essencial: o front-end precisa saber se o encerramento foi voluntário ou forçado para exibir a mensagem correta ao aluno.

#### 3.6 — Sessões de hoje `GET /sessoes/hoje` — RN-S2, RN-S3

| Etapa | Ação |
| --- | --- |
| 3.6.1 | Criar arquivo `src/routes/sessoes/hoje.ts` |
| 3.6.2 | Definir schema Zod para resposta: lista de sessões + `disciplinas_distintas_hoje` + `sessoes_por_disciplina` |
| 3.6.3 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.6.4 | Chamar `sessaoService.listarSessoesHoje(alunoId)` |
| 3.6.5 | Retornar resposta 200 com dados e metadados de limite |

> Esse endpoint é o principal mecanismo de UX proativa: o front-end o consulta ao abrir o app para exibir quantas sessões o aluno ainda pode criar antes de atingir os limites do dia.

#### 3.7 — Histórico paginado `GET /sessoes/historico`

| Etapa | Ação |
| --- | --- |
| 3.7.1 | Criar arquivo `src/routes/sessoes/historico.ts` |
| 3.7.2 | Definir schema Zod com querystring `{ page?: z.coerce.number().default(1), limit?: z.coerce.number().default(20), status?: StatusSessaoEnum }` |
| 3.7.3 | Adicionar `preHandler` de autenticação e role `ALUNO` |
| 3.7.4 | Chamar `sessaoService.listarHistorico(alunoId, page, limit, status)` |
| 3.7.5 | Retornar resposta 200 com `{ data, pagination: { page, limit, total } }` |

---

### Fase 4: Testes

#### 4A — Testes unitários do service (`test/services/sessaoService.test.ts`)

| Etapa | Ação | Obrigatório |
| --- | --- | --- |
| 4A.1 | Criar `test/services/sessaoService.test.ts` com mock do Prisma Client | ✅ Sim |
| 4A.2 | **`criarSessao` — caminho feliz:** 1ª sessão da disciplina no dia → criada com sucesso | ✅ Sim |
| 4A.3 | **`criarSessao` — RN-S3 bloqueio:** 3ª tentativa da mesma disciplina no dia → erro `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO` | ✅ Sim |
| 4A.4 | **`criarSessao` — RN-S3 borda:** 2ª sessão da mesma disciplina → permitida | ✅ Sim |
| 4A.5 | **`criarSessao` — RN-S2 bloqueio:** 4ª disciplina diferente no mesmo dia → erro `LIMITE_DISCIPLINAS_DIA_ATINGIDO` | ✅ Sim |
| 4A.6 | **`criarSessao` — RN-S2 borda:** 3ª disciplina diferente no mesmo dia → permitida | ✅ Sim |
| 4A.7 | **`criarSessao` — RN-S3 tem prioridade sobre RN-S2:** aluno com 3 disciplinas distintas e 2ª sessão da 3ª disciplina → erro `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO` (não RN-S2) | ✅ Sim |
| 4A.8 | **`iniciarSessao` — caminho feliz:** sessão `CRIADA` → `EM_ANDAMENTO` | ✅ Sim |
| 4A.9 | **`iniciarSessao` — erro:** sessão já `EM_ANDAMENTO` → 409 | ✅ Sim |
| 4A.10 | **`pausarSessao`:** tempo acumulado persistido corretamente | ✅ Sim |
| 4A.11 | **`retomarSessao`:** sessão `PAUSADA` → `EM_ANDAMENTO`; `tempo_total_seg` não zerado | ✅ Sim |
| 4A.12 | **`concluirSessao` — RN-S1 não atingida:** `tempo_total_seg < 2700` → status `CONCLUIDA` | ✅ Sim |
| 4A.13 | **`concluirSessao` — RN-S1 atingida:** `tempo_total_seg = 2700` → status `ENCERRADA_POR_LIMITE` | ✅ Sim |
| 4A.14 | **`concluirSessao` — RN-S1 ultrapassada:** `tempo_total_seg > 2700` → status `ENCERRADA_POR_LIMITE` | ✅ Sim |
| 4A.15 | **Propriedade:** aluno tenta operar sessão de outro aluno → erro 404 (não vaza 403) | ✅ Sim |
| 4A.16 | **`listarSessoesHoje`:** metadados `disciplinas_distintas_hoje` e `sessoes_por_disciplina` corretos | ✅ Sim |
| 4A.17 | **`listarHistorico`:** paginação funcional; filtro por status funcional | ✅ Sim |

#### 4B — Testes de integração das rotas (`test/routes/sessoes.test.ts`)

| Etapa | Ação | Obrigatório |
| --- | --- | --- |
| 4B.1 | Criar `test/routes/sessoes.test.ts` | ✅ Sim |
| 4B.2 | `POST /sessoes` sem `disciplina_id` → 400 (validação Zod) | ✅ Sim |
| 4B.3 | `POST /sessoes` com `disciplina_id` válido → 201 | ✅ Sim |
| 4B.4 | `POST /sessoes` na 3ª tentativa da mesma disciplina → 422 com código `LIMITE_SESSOES_DISCIPLINA_DIA_ATINGIDO` | ✅ Sim |
| 4B.5 | `POST /sessoes` na 4ª disciplina diferente → 422 com código `LIMITE_DISCIPLINAS_DIA_ATINGIDO` | ✅ Sim |
| 4B.6 | Fluxo completo: `POST /sessoes` → `PATCH iniciar` → `PATCH pausar` → `PATCH retomar` → `PATCH concluir` | ✅ Sim |
| 4B.7 | `PATCH concluir` com `tempo_total_seg = 2700` → resposta com `status: "ENCERRADA_POR_LIMITE"` | ✅ Sim |
| 4B.8 | `GET /sessoes/hoje` retorna `disciplinas_distintas_hoje` e `sessoes_por_disciplina` corretamente | ✅ Sim |
| 4B.9 | `GET /sessoes/historico` retorna paginação funcional | ✅ Sim |
| 4B.10 | Qualquer rota sem token → 401 | ✅ Sim |
| 4B.11 | Rota com token de PROFESSOR → 403 | ✅ Sim |
| 4B.12 | Executar `npm run test:coverage` | Cobertura ≥ 70% |

---

## Resumo das diferenças em relação à versão anterior do plano

| Área | Versão anterior | Esta versão |
| --- | --- | --- |
| `disciplina_id` em `SessaoEstudo` | Inexistente | **Obrigatório** (NOT NULL) — RN-S2, RN-S3 |
| `StatusSessao` | 4 valores | **5 valores** — adicionado `ENCERRADA_POR_LIMITE` |
| Índice na tabela | `aluno_id` simples | **Índice composto** `(aluno_id, disciplina_id, iniciada_em)` |
| Constantes de domínio | Ausentes | **`src/config/sessao.ts`** com os 3 limites |
| `criarSessao` | Recebe apenas `alunoId` | Recebe `alunoId` + `disciplinaId`; verifica RN-S3 → RN-S2 antes de inserir |
| `concluirSessao` | Conclui sempre como `CONCLUIDA` | Verifica RN-S1; conclui como `CONCLUIDA` ou `ENCERRADA_POR_LIMITE` |
| `nivel_foco` | Parâmetro obrigatório | **Removido** (campo avançado adiado para fase futura) |
| `retomarSessao` | Método separado | **Mantido** como método separado |
| Endpoint de sessões do dia | Ausente | **`GET /sessoes/hoje`** com metadados de limite para UX proativa |
| Histórico | `GET /sessoes` | **`GET /sessoes/historico`** (rota dedicada; sem conflito com `/hoje`) |
| Casos de teste | 11 casos | **17 unitários + 12 de integração** — cobre os 3 bloqueios, bordas e caminhos felizes |
