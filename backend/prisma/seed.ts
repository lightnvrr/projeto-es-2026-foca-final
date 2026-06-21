import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, Turno } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const disciplinas = [
  'Matemática',
  'Português',
  'Ciências Biológicas',
  'História',
  'Geografia',
  'Inglês',
  'Artes',
  'Educação Física',
  'Filosofia',
  'Sociologia',
  'Física',
  'Química',
];

const SEED_PASSWORD = 'senha123';

const seedUsers = [
  { nome: 'Coordenador Seed', email: 'coordenador@foca.dev', role: Role.COORDENADOR },
  { nome: 'Professor Seed', email: 'professor@foca.dev', role: Role.PROFESSOR },
  { nome: 'Aluno Seed', email: 'aluno@foca.dev', role: Role.ALUNO },
];

async function seedDisciplinas() {
  for (const nome of disciplinas) {
    await prisma.disciplina.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
}

async function seedUsers_() {
  const senhaHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const anoLetivo = new Date().getFullYear();
  const turmasData = [
    { id: 1, nome: '1º Ano A', ano_letivo: anoLetivo },
    { id: 2, nome: '2º Ano B', ano_letivo: anoLetivo },
    { id: 3, nome: '3º Ano - Foco ENEM', ano_letivo: anoLetivo },
  ];
  for (const t of turmasData) {
    await prisma.turma.upsert({
      where: { id: t.id },
      update: { nome: t.nome, ano_letivo: t.ano_letivo },
      create: t,
    });
  }
  const turma = { id: 1 };

  for (const { nome, email, role } of seedUsers) {
    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: { nome, email, senha_hash: senhaHash, role },
    });

    if (role === Role.COORDENADOR) {
      await prisma.coordenador.upsert({
        where: { usuario_id: usuario.id },
        update: {},
        create: { usuario_id: usuario.id },
      });
    }

    if (role === Role.PROFESSOR) {
      await prisma.professor.upsert({
        where: { usuario_id: usuario.id },
        update: {},
        create: { usuario_id: usuario.id },
      });
    }

    if (role === Role.ALUNO) {
      await prisma.aluno.upsert({
        where: { usuario_id: usuario.id },
        update: {},
        create: { usuario_id: usuario.id, turma_id: turma.id, turno: Turno.MANHA },
      });
    }
  }

  console.log('\nUsuários de seed criados (senha: senha123):');
  for (const { email, role } of seedUsers) {
    console.log(`  [${role}] ${email}`);
  }
}

async function main() {
  await seedDisciplinas();
  await seedUsers_();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
