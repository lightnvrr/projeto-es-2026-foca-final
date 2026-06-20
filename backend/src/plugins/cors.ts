import cors from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
});
