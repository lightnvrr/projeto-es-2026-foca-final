-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('MANHA', 'TARDE', 'NOITE');

-- CreateTable
CREATE TABLE "escola" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,

    CONSTRAINT "escola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coordenador" (
    "id" SERIAL NOT NULL,
    "escola_id" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,

    CONSTRAINT "coordenador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor" (
    "id" SERIAL NOT NULL,
    "escola_id" INTEGER NOT NULL,
    "coordenador_id" INTEGER,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,

    CONSTRAINT "professor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turma" (
    "id" SERIAL NOT NULL,
    "escola_id" INTEGER NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "ano_letivo" INTEGER NOT NULL,

    CONSTRAINT "turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplina" (
    "id" SERIAL NOT NULL,
    "escola_id" INTEGER NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "carga_horaria_semanal" INTEGER NOT NULL,

    CONSTRAINT "disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aluno" (
    "id" SERIAL NOT NULL,
    "turma_id" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "turno" "Turno" NOT NULL,

    CONSTRAINT "aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor_turma" (
    "professor_id" INTEGER NOT NULL,
    "turma_id" INTEGER NOT NULL,

    CONSTRAINT "professor_turma_pkey" PRIMARY KEY ("professor_id","turma_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escola_cnpj_key" ON "escola"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "coordenador_email_key" ON "coordenador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professor_email_key" ON "professor"("email");

-- CreateIndex
CREATE INDEX "professor_escola_id_idx" ON "professor"("escola_id");

-- CreateIndex
CREATE INDEX "turma_escola_id_idx" ON "turma"("escola_id");

-- CreateIndex
CREATE INDEX "disciplina_escola_id_idx" ON "disciplina"("escola_id");

-- CreateIndex
CREATE UNIQUE INDEX "aluno_email_key" ON "aluno"("email");

-- CreateIndex
CREATE INDEX "aluno_turma_id_idx" ON "aluno"("turma_id");

-- AddForeignKey
ALTER TABLE "coordenador" ADD CONSTRAINT "coordenador_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escola"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor" ADD CONSTRAINT "professor_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escola"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor" ADD CONSTRAINT "professor_coordenador_id_fkey" FOREIGN KEY ("coordenador_id") REFERENCES "coordenador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turma" ADD CONSTRAINT "turma_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escola"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplina" ADD CONSTRAINT "disciplina_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escola"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno" ADD CONSTRAINT "aluno_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_turma" ADD CONSTRAINT "professor_turma_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_turma" ADD CONSTRAINT "professor_turma_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
