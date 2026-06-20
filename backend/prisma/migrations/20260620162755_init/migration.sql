/*
  Warnings:

  - You are about to drop the column `escola_id` on the `coordenador` table. All the data in the column will be lost.
  - You are about to drop the column `carga_horaria_semanal` on the `disciplina` table. All the data in the column will be lost.
  - You are about to drop the column `escola_id` on the `disciplina` table. All the data in the column will be lost.
  - You are about to drop the column `escola_id` on the `professor` table. All the data in the column will be lost.
  - You are about to drop the column `escola_id` on the `turma` table. All the data in the column will be lost.
  - You are about to drop the `escola` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[nome]` on the table `disciplina` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusSessao" AS ENUM ('CRIADA', 'EM_ANDAMENTO', 'PAUSADA', 'CONCLUIDA', 'ENCERRADA_POR_LIMITE');

-- DropForeignKey
ALTER TABLE "coordenador" DROP CONSTRAINT "coordenador_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "disciplina" DROP CONSTRAINT "disciplina_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "professor" DROP CONSTRAINT "professor_escola_id_fkey";

-- DropForeignKey
ALTER TABLE "turma" DROP CONSTRAINT "turma_escola_id_fkey";

-- DropIndex
DROP INDEX "disciplina_escola_id_idx";

-- DropIndex
DROP INDEX "disciplina_escola_id_nome_key";

-- DropIndex
DROP INDEX "professor_escola_id_idx";

-- DropIndex
DROP INDEX "turma_escola_id_idx";

-- AlterTable
ALTER TABLE "coordenador" DROP COLUMN "escola_id";

-- AlterTable
ALTER TABLE "disciplina" DROP COLUMN "carga_horaria_semanal",
DROP COLUMN "escola_id";

-- AlterTable
ALTER TABLE "professor" DROP COLUMN "escola_id";

-- AlterTable
ALTER TABLE "turma" DROP COLUMN "escola_id";

-- DropTable
DROP TABLE "escola";

-- CreateTable
CREATE TABLE "sessao_estudo" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "disciplina_id" INTEGER NOT NULL,
    "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluida_em" TIMESTAMP(3),
    "tempo_total_seg" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusSessao" NOT NULL DEFAULT 'CRIADA',

    CONSTRAINT "sessao_estudo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessao_estudo_aluno_id_disciplina_id_iniciada_em_idx" ON "sessao_estudo"("aluno_id", "disciplina_id", "iniciada_em");

-- CreateIndex
CREATE UNIQUE INDEX "disciplina_nome_key" ON "disciplina"("nome");

-- AddForeignKey
ALTER TABLE "sessao_estudo" ADD CONSTRAINT "sessao_estudo_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_estudo" ADD CONSTRAINT "sessao_estudo_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
