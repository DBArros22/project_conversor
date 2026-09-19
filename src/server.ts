import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

const app = Fastify({ logger: true });

// Registrar plugins essenciais
app.register(cors, { origin: true });
app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite de 50MB por arquivo
  }
});

// Rota de Health Check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Rota de Processamento de Arquivos
app.post('/processar', async (request, reply) => {
  try {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'Nenhum arquivo enviado.' });
    }

    const filename = data.filename;
    const mimetype = data.mimetype;
    const fields = data.fields;
    
    // Captura a ação enviada pelo FormData (ex: comprimir-pdf, word-para-pdf, etc.)
    const acao = (fields.acao as any)?.value || 'otimizar';

    // Converte o stream do arquivo em um Buffer para manipulação
    const buffer = await data.toBuffer();

    app.log.info(`Arquivo recebido: ${filename} | Ação: ${acao} | Tamanho: ${buffer.length} bytes`);

    // --- Ponto de Extensão para Lógica de Negócio ---
    // Aqui você poderá despachar o `buffer` e o `acao` para módulos específicos 
    // de conversão (ex: usando exceljs, pdf-lib no servidor, etc.)

    // Resposta temporária de eco (devolve o arquivo processado para download no front-end)
    reply.header('Content-Type', mimetype);
    return reply.send(buffer);

  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ error: 'Erro interno ao processar o arquivo no servidor.' });
  }
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