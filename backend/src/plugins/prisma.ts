import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server, options) => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });
  await prisma.$connect();
  server.decorate('prisma', prisma);
  server.addHook('onClose', async (server) => {
    await server.prisma.$disconnect();
  });
});

export default prismaPlugin;
