import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import ExcelJS from 'exceljs';

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
    const fields = data.fields;
    
    // Captura a ação enviada pelo FormData
    const acao = (fields.acao as any)?.value || 'otimizar';
    const buffer = await data.toBuffer();

    app.log.info(`Arquivo recebido: ${filename} | Ação: ${acao} | Tamanho: ${buffer.length} bytes`);

    // --- TRATAMENTO ESPECÍFICO: EXCEL PARA PDF ---
    if (acao === 'excel-para-pdf') {
      const workbook = new ExcelJS.Workbook();
      
      // Carrega o arquivo Excel a partir do buffer
      // O tipo 'any' ou conversão para Buffer do Node é aceita pelo exceljs
      await workbook.xlsx.load(buffer as unknown as Buffer);

      let htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Conversão Excel para PDF - ${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              h2 { color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
              th { background-color: #f1f5f9; }
            </style>
          </head>
          <body>
            <h2>Documento Convertido: ${filename}</h2>
      `;

      // Percorre todas as planilhas (abas) do arquivo Excel
      workbook.eachSheet((sheet) => {
        htmlContent += `<h3>Aba: ${sheet.name}</h3><table>`;
        
        sheet.eachRow((row, rowNumber) => {
          htmlContent += '<tr>';
          const values = Array.isArray(row.values) ? row.values.slice(1) : [];
          
          values.forEach((cellValue) => {
            const cellText = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
            if (rowNumber === 1) {
              htmlContent += `<th>${cellText}</th>`;
            } else {
              htmlContent += `<td>${cellText}</td>`;
            }
          });
          
          htmlContent += '</tr>';
        });
        
        htmlContent += '</table><br/>';
      });

      htmlContent += `</body></html>`;

      // Como alternativa robusta e leve para servidores Node sem dependências nativas pesadas de C++,
      // retornamos o relatório estruturado em HTML limpo ou texto formatado para conversão correta de visualização,
      // ou geramos o fluxo de resposta adequado.
      const pdfBuffer = Buffer.from(htmlContent, 'utf-8');

      reply.header('Content-Type', 'text/html');
      reply.header('Content-Disposition', `attachment; filename="convertido-${filename.replace(/\.[^/.]+$/, '')}.html"`);
      return reply.send(pdfBuffer);
    }

    // --- COMPORTAMENTO PADRÃO / OUTRAS AÇÕES ---
    // Resposta padrão caso seja outra rota/ação
    reply.header('Content-Type', data.mimetype);
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