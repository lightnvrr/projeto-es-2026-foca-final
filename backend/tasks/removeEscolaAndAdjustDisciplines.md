# Tarefa: Remover o modelo Escola e Fixar Disciplinas

## Objetivo

Simplificar o modelo de dados do sistema removendo completamente a entidade **Escola** e transformando **Disciplina** em uma lista fixa de 12 registros, eliminando seu CRUD.

---

# Parte 1 — Remover o modelo Escola

## 1. Atualizar o schema do Prisma

### Remover relações com `Escola`

Localizar todos os modelos que possuem relação com `Escola` e remover:

* campo `escola_id`
* relacionamento `escola`
* relações inversas existentes no model `Escola`

Modelos que devem ser verificados:

* `Turma`
* `Disciplina`
* `Professor`
* `Coordenador`

Exemplo:

**Antes**

```prisma
model Turma {
  id        Int     @id @default(autoincrement())
  nome      String
  escola_id Int

  escola Escola @relation(fields: [escola_id], references: [id])
}
```

**Depois**

```prisma
model Turma {
  id   Int    @id @default(autoincrement())
  nome String
}
```

---

### Remover completamente o model `Escola`

Excluir o bloco:

```prisma
model Escola {
  ...
}
```

---

## 2. Criar migration

```bash
npx prisma migrate dev --name remove_escola
```

Validar se a migration contém operações como:

* DROP FOREIGN KEY
* DROP COLUMN
* DROP TABLE

---

## 3. Ajustar código da aplicação

Buscar por referências a:

* `prisma.escola`
* `escola_id`
* `include: { escola }`
* consultas SQL utilizando a tabela `escola`

Remover ou adaptar todas as ocorrências.

---

## 4. Ajustar testes

Atualizar ou remover testes que dependam do modelo `Escola`.

---

## 5. Validar alterações

```bash
npx prisma validate
npx tsc --noEmit
npm run test
```

---

# Parte 2 — Transformar Disciplina em lista fixa

## Disciplinas oficiais

O sistema deverá possuir exatamente as seguintes disciplinas:

* Matemática
* Português
* Ciências
* História
* Geografia
* Inglês
* Artes
* Educação Física
* Filosofia
* Sociologia
* Física
* Química

---

## Atualizar o model `Disciplina`

O modelo deverá possuir apenas:

```prisma
model Disciplina {
  id   Int    @id @default(autoincrement())
  nome String @unique
}
```

Remover:

* `escola_id`
* `carga_horaria_semanal`
* quaisquer outros campos específicos de configuração

---

## Criar migration

```bash
npx prisma migrate dev --name fix_disciplinas_schema
```

---

## Criar seed

Criar `prisma/seed.ts` utilizando `upsert` para garantir a existência das 12 disciplinas.

Estrutura esperada:

* lista fixa das disciplinas
* `upsert` por `nome`
* execução do seed via `PrismaClient`

---

## Configurar o seed

No `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Executar:

```bash
npx prisma db seed
```

---

## Remover o CRUD de Disciplina

Remover ou desabilitar:

* POST `/disciplinas`
* PATCH `/disciplinas/:id`
* DELETE `/disciplinas/:id`

Manter apenas:

* GET `/disciplinas`

---

## Atualizar o service

O serviço de disciplinas deverá apenas realizar consultas.

Não deverá permitir:

* criação
* atualização
* exclusão

---

## Ajustar relacionamentos

Verificar modelos relacionados à disciplina.

### `ProfessorTurma`

Manter:

* `disciplina_id`

### `SessaoEstudo`

Para o MVP, **não deve possuir** `disciplina_id`.

Caso exista:

* remover o campo
* criar migration

```bash
npx prisma migrate dev --name remove_disciplina_id_from_sessao
```

---

## Ajustar testes

Remover ou adaptar testes que:

* criam disciplinas
* atualizam disciplinas
* removem disciplinas
* dependem de `carga_horaria_semanal`

---

## Validação final

Executar:

```bash
npx prisma generate
npx prisma validate
npx tsc --noEmit
npm run test
```

---

# Critérios de Aceitação

A implementação será considerada concluída quando:

* [ ] O model `Escola` não existir mais.
* [ ] Nenhum modelo possuir `escola_id`.
* [ ] A migration `remove_escola` estiver aplicada.
* [ ] O model `Disciplina` possuir apenas `id` e `nome`.
* [ ] O campo `nome` for único.
* [ ] O campo `carga_horaria_semanal` não existir.
* [ ] A tabela `Disciplina` possuir exatamente 12 registros.
* [ ] O seed puder ser executado sem criar duplicidades.
* [ ] Apenas o endpoint `GET /disciplinas` permanecer disponível.
* [ ] O service de disciplinas for somente leitura.
* [ ] `SessaoEstudo` não possuir `disciplina_id` (caso aplicável).
* [ ] Todos os testes passarem.
* [ ] O projeto compilar sem erros de TypeScript.
