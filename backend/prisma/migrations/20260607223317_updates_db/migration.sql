/*
  Warnings:

  - You are about to drop the column `email` on the `aluno` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `aluno` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `coordenador` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `coordenador` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `professor` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `professor` table. All the data in the column will be lost.
  - The primary key for the `professor_turma` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[usuario_id]` on the table `aluno` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[usuario_id]` on the table `coordenador` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[escola_id,nome]` on the table `disciplina` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[usuario_id]` on the table `professor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `usuario_id` to the `aluno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuario_id` to the `coordenador` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuario_id` to the `professor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `disciplina_id` to the `professor_turma` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ALUNO', 'PROFESSOR', 'COORDENADOR');

-- DropIndex
DROP INDEX "aluno_email_key";

-- DropIndex
DROP INDEX "coordenador_email_key";

-- DropIndex
DROP INDEX "professor_email_key";

-- AlterTable
ALTER TABLE "aluno" DROP COLUMN "email",
DROP COLUMN "nome",
ADD COLUMN     "usuario_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "coordenador" DROP COLUMN "email",
DROP COLUMN "nome",
ADD COLUMN     "usuario_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "professor" DROP COLUMN "email",
DROP COLUMN "nome",
ADD COLUMN     "usuario_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "professor_turma" DROP CONSTRAINT "professor_turma_pkey",
ADD COLUMN     "disciplina_id" INTEGER NOT NULL,
ADD CONSTRAINT "professor_turma_pkey" PRIMARY KEY ("professor_id", "turma_id", "disciplina_id");

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_role_idx" ON "usuario"("role");

-- CreateIndex
CREATE UNIQUE INDEX "aluno_usuario_id_key" ON "aluno"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "coordenador_usuario_id_key" ON "coordenador"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "disciplina_escola_id_nome_key" ON "disciplina"("escola_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "professor_usuario_id_key" ON "professor"("usuario_id");

-- CreateIndex
CREATE INDEX "professor_coordenador_id_idx" ON "professor"("coordenador_id");

-- AddForeignKey
ALTER TABLE "coordenador" ADD CONSTRAINT "coordenador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor" ADD CONSTRAINT "professor_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno" ADD CONSTRAINT "aluno_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_turma" ADD CONSTRAINT "professor_turma_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
