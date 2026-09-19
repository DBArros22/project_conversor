const API_URL = 'http://localhost:3333';

// Alternar abas da SPA
function alternarFerramenta(nomeFerramenta) {
    document.querySelectorAll('.painel-ferramenta').forEach(painel => painel.classList.add('hidden'));
    document.querySelectorAll('.botao-ferramenta').forEach(botao => {
        botao.className = "botao-ferramenta w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-slate-300 hover:bg-slate-800/60 hover:text-white cursor-pointer";
    });

    document.getElementById(`painel-${nomeFerramenta}`).classList.remove('hidden');
    const botaoAtivo = document.getElementById(`btn-${nomeFerramenta}`);
    botaoAtivo.className = "botao-ferramenta w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all bg-accentGreen text-darkBg font-medium shadow-lg shadow-accentGreen/10 cursor-pointer";
    
    document.getElementById('feedback-acao').innerText = '';
}

// Variáveis de estado global para os arquivos selecionados
let arquivoImagemSelecionada = null;
let arquivosPdfSelecionados = [];
let arquivosZipSelecionados = [];
let arquivoServidorSelecionado = null;

// 1. Lógica do Conversor de Imagem
function tratarSelecaoImagem(evento) {
    arquivoImagemSelecionada = evento.target.files[0];
    if (arquivoImagemSelecionada) {
        document.getElementById('nome-arquivo-imagem').innerText = `Arquivo carregado: ${arquivoImagemSelecionada.name}`;
    }
}

function converterImagem() {
    if (!arquivoImagemSelecionada) {
        alert('Por favor, selecione uma imagem primeiro.');
        return;
    }
    document.getElementById('feedback-acao').innerText = 'Processando imagem...';

    const leitor = new FileReader();
    leitor.onload = function(e) {
        const imagem = new Image();
        imagem.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = imagem.width;
            canvas.height = imagem.height;
            const contexto = canvas.getContext('2d');
            contexto.drawImage(imagem, 0, 0);

            const formato = document.getElementById('formato-saida-imagem').value;
            const qualidade = parseFloat(document.getElementById('qualidade-imagem').value);

            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const linkDownload = document.createElement('a');
                linkDownload.href = url;
                const extensao = formato.split('/')[1];
                linkDownload.download = `convertido-${Date.now()}.${extensao}`;
                linkDownload.click();
                document.getElementById('feedback-acao').innerText = 'Imagem convertida com sucesso!';
            }, formato, qualidade);
        }
        imagem.src = e.target.result;
    }
    leitor.readAsDataURL(arquivoImagemSelecionada);
}

// 2. Lógica de Mesclagem de PDFs
function tratarSelecaoPdf(evento) {
    arquivosPdfSelecionados = evento.target.files;
    if (arquivosPdfSelecionados.length > 0) {
        document.getElementById('contador-arquivos-pdf').innerText = `${arquivosPdfSelecionados.length} arquivo(s) PDF selecionado(s)`;
    }
}

async function mesclarPdfs() {
    if (arquivosPdfSelecionados.length < 2) {
        alert('Selecione pelo menos 2 arquivos PDF para mesclar.');
        return;
    }
    document.getElementById('feedback-acao').innerText = 'Mesclando PDFs...';

    try {
        const pdfUnificado = await PDFLib.PDFDocument.create();

        for (let arquivo of arquivosPdfSelecionados) {
            const bufferArray = await arquivo.arrayBuffer();
            const pdfCarregado = await PDFLib.PDFDocument.load(bufferArray);
            const paginasCopiadas = await pdfUnificado.copyPages(pdfCarregado, pdfCarregado.getPageIndices());
            paginasCopiadas.forEach((pagina) => pdfUnificado.addPage(pagina));
        }

        const bytesPdfFinal = await pdfUnificado.save();
        const blob = new Blob([bytesPdfFinal], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const linkDownload = document.createElement('a');
        linkDownload.href = url;
        linkDownload.download = `documento-unificado-${Date.now()}.pdf`;
        linkDownload.click();
        document.getElementById('feedback-acao').innerText = 'PDFs unidos com sucesso!';
    } catch (erro) {
        console.error(erro);
        alert('Erro ao processar os PDFs. Verifique os arquivos.');
        document.getElementById('feedback-acao').innerText = 'Erro na operação.';
    }
}

// 3. Lógica do Criador de ZIP
function tratarSelecaoZip(evento) {
    arquivosZipSelecionados = evento.target.files;
    if (arquivosZipSelecionados.length > 0) {
        document.getElementById('contador-arquivos-zip').innerText = `${arquivosZipSelecionados.length} arquivo(s) selecionado(s) para ZIP`;
    }
}

async function criarZip() {
    if (arquivosZipSelecionados.length === 0) {
        alert('Selecione arquivos para compactar.');
        return;
    }
    document.getElementById('feedback-acao').innerText = 'Compactando arquivos...';

    const compactador = new JSZip();
    for (let arquivo of arquivosZipSelecionados) {
        compactador.file(arquivo.name, arquivo);
    }

    const conteudoZip = await compactador.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(conteudoZip);
    const linkDownload = document.createElement('a');
    linkDownload.href = url;
    linkDownload.download = `arquivo-compactado-${Date.now()}.zip`;
    linkDownload.click();
    document.getElementById('feedback-acao').innerText = 'Arquivo ZIP gerado com sucesso!';
}

// 4. Lógica de Comunicação com o Servidor Node.js (Fastify)
function tratarSelecaoArquivoServidor(evento) {
    arquivoServidorSelecionado = evento.target.files[0];
    if (arquivoServidorSelecionado) {
        const elemNome = document.getElementById('nome-arquivo-servidor');
        if (elemNome) elemNome.innerText = `Selecionado: ${arquivoServidorSelecionado.name}`;
    }
}

async function verificarSaudeApi() {
    const blocoStatus = document.getElementById('conteudo-status');
    if (!blocoStatus) return;
    
    blocoStatus.innerText = 'Conectando ao servidor...';
    
    try {
        const resposta = await fetch(`${API_URL}/health`);
        const dados = await resposta.json();
        blocoStatus.innerText = JSON.stringify(dados, null, 2);
        document.getElementById('feedback-acao').innerText = 'Servidor online!';
    } catch (erro) {
        blocoStatus.innerText = 'Erro: Não foi possível conectar ao servidor Node.js na porta 3333.\nVerifique se o comando "npm run dev" está rodando no terminal.';
        document.getElementById('feedback-acao').innerText = 'Falha na conexão.';
    }
}

async function enviarParaServidor() {
    if (!arquivoServidorSelecionado) {
        alert('Selecione um arquivo primeiro.');
        return;
    }

    const acao = document.getElementById('tipo-conversao')?.value || 'otimizar';
    document.getElementById('feedback-acao').innerText = 'Enviando arquivo para o servidor...';

    const formData = new FormData();
    formData.append('arquivo', arquivoServidorSelecionado);
    formData.append('acao', acao);

    try {
        const resposta = await fetch(`${API_URL}/processar`, {
            method: 'POST',
            body: formData
        });

        if (!resposta.ok) throw new Error('Erro ao processar no servidor.');

        const blob = await resposta.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `processado-${arquivoServidorSelecionado.name}`;
        link.click();

        document.getElementById('feedback-acao').innerText = 'Arquivo processado e baixado com sucesso!';
    } catch (erro) {
        console.error(erro);
        alert('O endpoint do backend ainda precisa ser implementado para receber este arquivo.');
        document.getElementById('feedback-acao').innerText = 'Aguardando implementação da rota no Node.js.';
    }
}
