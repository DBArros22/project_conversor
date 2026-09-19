import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

// Registrar plugins essenciais
app.register(cors, { origin: true });

// Rota de Health Check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' });
    console.log('🚀 Servidor rodando robustamente na porta 3333');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();