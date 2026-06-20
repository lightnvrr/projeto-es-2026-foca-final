# Foca — Documento de Tarefas e Arquitetura de Implementação

> Plano de implementação do MVP a partir da base já existente (CRUD de usuários + fundação do sistema).
> Alinhado ao repositório [`Hellshi/es_2026_foca`](https://github.com/Hellshi/es_2026_foca) (branch `master`).

---

## 1. Contexto e escopo deste documento

A proposta do Foca, a análise de requisitos e os diagramas já estão definidos. A **base do sistema e o CRUD de usuários já foram implementados**. Este documento cobre **o que ainda falta construir** para fechar o MVP, organizado em:

- a **stack real** confirmada no repositório;
- a **arquitetura** (camadas mapeadas para a estrutura concreta do projeto Fastify);
- o **modelo de domínio** — o que já existe e o que precisa ser criado;
- decisões de arquitetura abertas que precisam ser fechadas antes de codar;
- um **backlog de tarefas** por épico, com requisito coberto, dependências e critérios de aceite;
- um **roadmap por sprint** e a **rastreabilidade requisito → tarefa**.

---

## 2. Stack real (confirmada no repositório)

A camada de serviços / API já está montada com:

| Camada | Tecnologia |
| --- | --- |
| Linguagem | TypeScript 5.9 |
| Framework HTTP | **Fastify 5** + `fastify-cli` + `@fastify/autoload` + `@fastify/sensible` + `fastify-plugin` |
| Validação / serialização | **Zod 4** + `fastify-type-provider-zod` (compiladores já configurados em `src/app.ts`) |
| Persistência | **Prisma 7** sobre **PostgreSQL** (`@prisma/adapter-pg`), client gerado em `src/generated` |
| Autenticação | `bcryptjs` (hash de senha) + `jsonwebtoken` (JWT) — instalados, ainda a ligar |
| Testes | Jest + `ts-jest` + `c8` (cobertura) — pasta `test/` |
| Qualidade | ESLint + Prettier + Husky + `lint-staged` |
| Infra local | Docker Compose (`docker-compose/`) |

> **Atenção:** a base é **Fastify**, não Express nem Nest. Isso muda alguns padrões de implementação: autorização por perfil é um `preHandler` (ou plugin decorador), não um middleware Express; rotas são carregadas por convenção via autoload; e validação de entrada/saída usa schemas Zod, não DTOs de classe.

---

## 3. Arquitetura

A arquitetura definida é **monolítica em camadas** (apresentação → serviços → dados). No projeto real ela se mapeia assim:

| Camada lógica (diagrama) | Onde vive no código |
| --- | --- |
| Apresentação (clientes web aluno/professor/coordenador) | Front-end (fora deste repo) consumindo a API REST |
| Apresentação da API (rotas / contratos) | `src/routes/**` — handlers Fastify + schemas Zod (entrada e saída) |
| Serviços (regras de negócio) | `src/services/**` ou `src/modules/**` — **a criar** (ver decisão D1) |
| Suporte transversal (decoradores, infra) | `src/plugins/**` — autoload de plugins reutilizáveis (Prisma, auth, etc.) |
| Dados | `prisma/schema.prisma` + Prisma Client (`src/generated`) sobre PostgreSQL |

### Convenções já existentes (de `src/app.ts`)

- `@fastify/autoload` carrega **automaticamente** tudo em `src/plugins/` (plugins de suporte) e `src/routes/` (rotas). Basta criar o arquivo na pasta certa.
- Os compiladores Zod (`validatorCompiler` / `serializerCompiler`) já estão setados globalmente: **toda rota nova deve declarar `schema` com Zod** para entrada e saída.
- O Prisma Client é gerado em `src/generated` — exponha-o como um **decorador** via plugin (`fastify.prisma`) para não instanciar conexões soltas.

### Padrão proposto por módulo (manter consistência)

Para cada módulo de negócio novo, sugerimos a tríade:

```
src/
  routes/<modulo>/          -> contrato HTTP: rota + schema Zod + chamada ao service
  services/<modulo>.ts      -> regra de negócio pura (sem Fastify, testável isolada)
  plugins/                  -> só suporte transversal (prisma, auth, etc.)
prisma/schema.prisma        -> modelos de dados
test/<modulo>.test.ts       -> testes (unit do service + integração da rota)
```

Esse corte mantém o RNF05 (manutenibilidade / orientação a contratos): a rota depende do contrato Zod, e o service depende de uma interface de repositório/Prisma — trocar um não obriga a mexer no outro.

---

## 4. Modelo de domínio

### 4.1 O que já existe em `prisma/schema.prisma`

| Modelo | Observações |
| --- | --- |
| `Usuario` | `role` (ALUNO/PROFESSOR/COORDENADOR), `senha_hash`, `ativo` — base de auth pronta |
| `Coordenador`, `Professor` | ligados a `Usuario` e `Escola`; professor referencia coordenador (1:N) |
| `Turma` | ligada à `Escola` |
| `Disciplina` | `carga_horaria_semanal` ✓, mas **vinculada à `Escola`**, não diretamente à `Turma` |
| `Aluno` | `turno`, vínculo 1:1 com `Usuario` e N:1 com `Turma` |
| `ProfessorTurma` | associativa N:N (professor × turma × disciplina) |

### 4.2 O que está faltando (o maior bloco de trabalho)

Não existe nenhum modelo para o **app do aluno**: nem sessão de estudo, nem cronograma, nem feedback de foco. Sem isso, os RF06–RF08 (o coração do produto) não têm onde persistir. Modelos propostos:

```prisma
enum StatusSessao {
  PENDENTE
  EM_ANDAMENTO
  PAUSADA
  CONCLUIDA
  REDISTRIBUIDA
  ADIADA
}

enum NivelFoco {
  SIM
  PARCIALMENTE
  NAO
}

model SessaoEstudo {
  id                   Int          @id @default(autoincrement())
  aluno_id             Int
  disciplina_id        Int
  semana_ref           DateTime     // segunda-feira da semana do cronograma
  data_prevista        DateTime
  duracao_prevista_min Int
  tempo_decorrido_seg  Int          @default(0)
  status               StatusSessao @default(PENDENTE)
  nivel_foco           NivelFoco?
  iniciada_em          DateTime?
  concluida_em         DateTime?

  aluno      Aluno      @relation(fields: [aluno_id], references: [id], onDelete: Cascade)
  disciplina Disciplina @relation(fields: [disciplina_id], references: [id], onDelete: Cascade)

  @@index([aluno_id, semana_ref])
  @@index([status])
  @@map("sessao_estudo")
}
```

> Será preciso adicionar a relação inversa (`sessoes SessaoEstudo[]`) em `Aluno` e `Disciplina`.

### 4.3 Decisão de modelagem aberta — RF03 (precisa ser fechada antes do épico de cronograma)

O RF03 diz "disciplinas **vinculadas a uma turma**", mas no schema atual `Disciplina` está vinculada à `Escola` e só se conecta à `Turma` através de `ProfessorTurma`. Para gerar o cronograma de um aluno (que precisa da carga horária das disciplinas **daquela turma**), há duas opções:

- **Opção A (sem mudar schema):** derivar as disciplinas da turma via `aluno → turma → ProfessorTurma → disciplina`. Funciona, mas acopla "disciplinas da turma" à existência de um professor alocado.
- **Opção B (vínculo direto):** introduzir uma associativa `TurmaDisciplina` (ou `disciplina.turma_id`) para representar a grade da turma independentemente de professor. Mais fiel ao RF03.

Recomendação: **Opção B** se o cadastro de grade puder existir antes da alocação de professores; caso contrário, Opção A com a ressalva documentada.

---

## 5. Decisões de arquitetura (ADRs curtos)

| ID | Decisão | Status |
| --- | --- | --- |
| D1 | Regra de negócio fica em `src/services/`, fora dos handlers de rota, para isolar do Fastify e permitir teste unitário | A confirmar com a equipe |
| D2 | Prisma exposto via plugin decorador (`fastify.prisma`), instância única | A implementar |
| D3 | Auth: JWT stateless; `role` no payload; autorização por `preHandler` parametrizado por perfil | A implementar |
| D4 | Cronograma persistido como linhas de `SessaoEstudo` serão salvas a partir do que o aluno enviar pelo front-end
| D5 | Limiares de "estável / irregular / ausente" definidos por configuração, validados com a coordenadora (cliente) | A definir com cliente |

---

## 6. Backlog de tarefas por épico

Legenda de critérios: cada tarefa só está "pronta" quando tem **rota com schema Zod + service testado + teste passando**.

### E0 — Fundação e convenções (transversal)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E0.1 | Plugin `prisma` (decorador `fastify.prisma`, conexão única, shutdown limpo) | — | — | Rotas acessam `fastify.prisma`; nenhuma instância solta |
| E0.2 | Padronizar tratamento de erro com `@fastify/sensible` + formato de erro Zod | RNF05 | — | Respostas de erro com formato único e status correto |
| E0.3 | Definir estrutura `src/services/` e exemplo de service testado | RNF05 | — | 1 service de referência com teste unitário verde |
| E0.4 | Confirmar D5 (modelagem Disciplina↔Turma) e aplicar migration | RF03 | — | Schema migrado; decisão registrada no ADR |

### E1 — Autenticação e autorização por perfil (RF09)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E1.1 | Endpoint de login: valida credenciais, compara `bcryptjs`, emite JWT com `role` | RF09 | E0.1 | Credencial válida → token; inválida → 401 |
| E1.2 | Plugin de auth: `preHandler` que valida JWT e popula `request.user` | RF09 | E1.1 | Rota protegida sem token → 401 |
| E1.3 | Autorização por perfil: `preHandler` parametrizado (`requireRole('PROFESSOR')`) | RF09 | E1.2 | Perfil errado → 403; gating dos 4 módulos (aluno/professor/coordenador/escola) |
| E1.4 | Testes de autorização cruzada (cada perfil só acessa seu módulo) | RF09 | E1.3 | Matriz perfil×módulo coberta por testes |

### E2 — Cadastro institucional (RF01–RF05)

> Verificar o que o "CRUD de usuários" já cobre e completar o que faltar. Modelos já existem no schema.

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E2.1 | CRUD de `Escola` (dados institucionais — razão social, CNPJ, contato, logo) | RF01 | E1.3 | Escola criada serve de raiz; CNPJ único validado |
| E2.2 | CRUD de `Turma` (nome, ano letivo, turno, série) vinculada à escola | RF02 | E2.1 | Turma só existe sob uma escola |
| E2.3 | CRUD de `Disciplina` com `carga_horaria_semanal` (conforme D5) | RF03 | E0.4 | Carga horária obrigatória; base para cronograma |
| E2.4 | Cadastro/vínculo de `Professor` (≥1 turma) e `Coordenador` (↔ professores) | RF04 | E2.2 | Professor vinculável a turmas; coordenador a professores |
| E2.5 | Cadastro de `Aluno` com vínculo a **exatamente uma** turma por período | RF05 | E2.2 | Tentar 2 turmas no mesmo período → erro de validação |

### E3 — Geração de cronograma (base do RF06)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E3.1 | Migration dos modelos `SessaoEstudo`, `StatusSessao`, `NivelFoco` (§4.2) | RF06–RF08 | E0.4 | Schema migrado; relações inversas adicionadas |
| E3.2 | Service `gerarCronogramaSemanal(aluno)`: distribui sessões proporcionalmente à carga horária das disciplinas da turma | RF03→RF06 | E3.1, E2.3 | Soma das sessões por disciplina respeita proporção da carga horária |
| E3.3 | Gatilho de geração (no 1º acesso da semana / job) — semana já vem montada | RF06, RNF02 | E3.2 | Aluno novo abre o app e já vê a semana, sem configuração |
| E3.4 | Endpoint "cronograma do dia/semana" do aluno | RF06, RNF03 | E3.2, E1.3 | Retorna sessões do dia; tela principal carrega rápido (ver E7.2) |

### E4 — App do aluno: sessão de estudo (RF06, RF07, RF08)

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E4.1 | Iniciar sessão: status → `EM_ANDAMENTO`, `iniciada_em` setado, timer ativado | RF06 | E3.4 | Selecionar sessão inicia o timer automaticamente |
| E4.2 | Pausar/retomar: persiste `tempo_decorrido_seg`; status `PAUSADA`/`EM_ANDAMENTO` | RF07 | E4.1 | Retomar continua de onde parou, sem perda de progresso |
| E4.3 | Concluir sessão: exige registro de foco (`SIM`/`PARCIALMENTE`/`NAO`) | RF08 | E4.1 | Concluir sem foco → bloqueado; com foco → `CONCLUIDA` |
| E4.4 | Garantir fluxo principal em ≤ 3 cliques (login → cronograma → foco) | RNF01 | E4.3 | Teste de fluxo confirma ≤ 3 cliques, sem etapas intermediárias |

### E5 — Resiliência da rotina: redistribuição e adiamento

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E5.1 | Detectar sessão não cumprida e oferecer **redistribuir na semana** ou **adiar p/ semana seguinte** | RF08, RNF02 | E4.3 | Nunca exibe lista de pendências acumuladas |
| E5.2 | Service de redistribuição: realoca duração no restante da semana | RNF02 | E5.1, E3.2 | Sessão redistribuída muda status e gera nova alocação coerente |
| E5.3 | Adiamento: move a sessão para a semana seguinte sem acúmulo visível | RNF02 | E5.1 | Semana atual não mostra a sessão adiada |

### E6 — Indicadores e painéis

| ID | Tarefa | RF/RNF | Depende de | Critério de aceite |
| --- | --- | --- | --- | --- |
| E6.1 | Service de classificação por aluno: **estável / irregular / ausente** (limiares de D6) | — | E4.3 | Classificação determinística a partir do histórico de sessões |
| E6.2 | Painel do professor: turmas monitoradas, alunos por estado | — | E6.1, E1.3 | Professor vê só suas turmas; estados corretos |
| E6.3 | Painel do coordenador: acompanhamento dos professores vinculados (turmas monitoradas) | RF10 | E6.2 | Coordenador vê professores sob sua supervisão |

### E7 — Requisitos não-funcionais e qualidade (transversal, contínuo)

| ID | Tarefa | RF/RNF | Critério de aceite |
| --- | --- | --- | --- |
| E7.1 | Cobertura de testes dos services críticos (cronograma, sessão, redistribuição, auth) | RNF05 | `npm run test:coverage` acima do limite acordado pela equipe |
| E7.2 | Otimizar carregamento da tela principal do aluno (índices Prisma, payload enxuto) | RNF03 | P95 ≤ 2 s (medir com Lighthouse/WebPageTest no front) |
| E7.3 | Validar compatibilidade cross-browser e responsividade ≥ 360 px (front) | RNF06 | Funcional em Chrome/Firefox/Safari/Edge a partir de 360 px |
| E7.4 | Plano de disponibilidade (healthcheck, deploy, monitoramento) | RNF04 | Healthcheck exposto; estratégia de uptime documentada |

---

## 7. Roadmap sugerido (Scrum simplificado, sprints semanais)

| Sprint | Foco | Tarefas | Entregável demonstrável |
| --- | --- | --- | --- |
| 1 | Fundação + Auth | E0.1–E0.4, E1.1–E1.4 | Login por perfil funcionando, acesso restrito por módulo |
| 2 | Cadastro institucional | E2.1–E2.5 | Escola → turma → disciplina → professor/coordenador → aluno cadastráveis |
| 3 | Cronograma | E3.1–E3.4 | Aluno abre o app e vê a semana já montada |
| 4 | Sessão de estudo (coração do MVP) | E4.1–E4.4, E5.1 | Fluxo iniciar/pausar/concluir + foco em ≤ 3 cliques |
| 5 | Resiliência + painéis | E5.2–E5.3, E6.1–E6.3 | Redistribuição/adiamento + painéis professor/coordenador |
| 6 | Qualidade + RNFs | E7.1–E7.4 + folga p/ ajustes | Cobertura, performance e compatibilidade validadas |

> E7 corre em paralelo desde o início (testes junto com cada tarefa); a sprint 6 é o fechamento/ajuste.

---

## 8. Rastreabilidade requisito → tarefa

| Requisito | Coberto por |
| --- | --- |
| RF01 (dados institucionais da escola) | E2.1 |
| RF02 (cadastro de turmas) | E2.2 |
| RF03 (disciplinas + carga horária) | E0.4, E2.3, E3.2 |
| RF04 (professores e coordenadores) | E2.4 |
| RF05 (alunos, 1 turma por período) | E2.5 |
| RF06 (iniciar sessão + timer) | E3.4, E4.1 |
| RF07 (pausar/retomar) | E4.2 |
| RF08 (registro de foco Sim/Parcial/Não) | E4.3, E5.1 |
| RF09 (acesso por perfil) | E1.1–E1.4 |
| RF10 (painel do coordenador) | E6.3 |
| RNF01 (≤ 3 cliques) | E4.4 |
| RNF02 (sem pendências acumuladas) | E3.3, E5.1–E5.3 |
| RNF03 (P95 ≤ 2 s) | E3.4, E7.2 |
| RNF04 (uptime ≥ 99,5%) | E7.4 |
| RNF05 (modular, orientado a contratos) | E0.2, E0.3, E7.1 |
| RNF06 (4 navegadores, ≥ 360 px) | E7.3 |

---

## 9. Riscos e pontos de atenção

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Modelo de domínio do app do aluno inexistente | Alto — bloqueia o coração do MVP | Priorizar E3.1 cedo; é pré-requisito de E4/E5/E6 |
| Decisão D5 (Disciplina↔Turma) ainda aberta | Médio — afeta geração de cronograma | Fechar em E0.4 antes de iniciar E3 |
| Limiares de classificação (D6) sem validação do cliente | Médio — painéis podem não refletir a realidade pedagógica | Levar à coordenadora numa Sprint Review |
| Algoritmo de distribuição proporcional com arredondamento | Médio — sobra/falta de minutos por disciplina | Cobrir com testes de borda (cargas horárias desiguais) |
| RNF03/RNF06 dependem do front (fora deste repo) | Médio | Alinhar contrato da API enxuto e medir cedo |

