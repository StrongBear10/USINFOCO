/*
 * script.js
 *
 * Lógica do Gerador de Orçamento CNC Avançado
 * Inclui manipulação da tabela, cálculos automáticos,
 * geração de orçamento em nova janela e exportação para Excel.
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Seleção de Elementos HTML
    const nomeClienteInput = document.getElementById('nomeCliente');
    const dataOrcamentoInput = document.getElementById('dataOrcamento');
    const tempoProgramacaoInput = document.getElementById('tempoProgramacao');
    const custoHoraInput = document.getElementById('custoHora');
    const itensTableBody = document.querySelector('#itensTable tbody');
    const addRowBtn = document.getElementById('addRowBtn');
    addRowBtn.addEventListener('click', adicionarLinhaTabela); // Listener para o botão "Adicionar Linha"
    const valorTotalCalculadoDisplay = document.getElementById('valorTotalCalculado');
    const gerarOrcamentoBtn = document.getElementById('gerarOrcamentoBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const subtotalPecasDisplay = document.getElementById('subtotalPecas');
    const custoProgramacaoDisplay = document.getElementById('custoProgramacao');

    // Variáveis globais/constantes
    const VALOR_CUSTO_FIXO = 3.34;
    let ultimoPrecoTotalCalculado = 0; // Armazena o último total calculado para uso posterior

    // -------- 2. Funções de Inicialização (ao carregar o app) --------

    function inicializarApp() {
        // Preencher data atual automaticamente no campo de data
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado (Janeiro = 0)
        const ano = hoje.getFullYear();
        dataOrcamentoInput.value = `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD para input type="date"

        // Fixar valor do custo da máquina por hora e tornar o campo não editável
        custoHoraInput.value = VALOR_CUSTO_FIXO.toFixed(2); // Preenche com 2 casas decimais
        custoHoraInput.readOnly = true; // Torna o campo somente leitura
        custoHoraInput.style.backgroundColor = '#e9ecef'; // Fundo cinza para indicar que é fixo
        custoHoraInput.style.cursor = 'not-allowed'; // Cursor de "proibido"

        // Adicionar 10 linhas iniciais à tabela de itens
        for (let i = 0; i < 10; i++) {
            adicionarLinhaTabela();
        }

        // Adicionar ouvintes de evento para inputs numéricos da tabela e tempo de programação
        // Isso permite o cálculo automático do valor total em tempo real
        itensTableBody.addEventListener('input', function(event) {
            if (event.target.closest('.quantidade-input') || event.target.closest('.tempo-unitario-input')) {
                atualizarLinhaTabela(event.target.closest('tr')); // Atualiza cálculos da linha
                atualizarSubtotais(); // Recalcula e exibe o total geral
            }
        });
        tempoProgramacaoInput.addEventListener('input', atualizarSubtotais); // Recalcula ao mudar tempo de programação

        // Chama a atualização inicial para garantir que os subtotais e total estejam corretos ao carregar a página
        atualizarSubtotais();
    }

    // -------- 3. Funções de Manipulação da Tabela --------

    // Adiciona uma nova linha à tabela com valores iniciais opcionais
    function adicionarLinhaTabela(quantidade = 0, peca = '', largura = 0, altura = 0, tempoUnitario = 0) {
        const newRow = itensTableBody.insertRow(); // Insere uma nova linha na tabela
        newRow.innerHTML = `
            <td><input type="number" min="0" value="${quantidade}" class="quantidade-input"></td>
            <td><input type="text" value="${peca}" class="peca-input" placeholder="Nome da Peça"></td>
            <td><input type="number" min="0" step="0.01" value="${largura}" class="largura-input"></td>
            <td><input type="number" min="0" step="0.01" value="${altura}" class="altura-input"></td>
            <td><input type="number" min="0" step="0.01" value="${tempoUnitario}" class="tempo-unitario-input"></td>
            <td class="valor-unitario">R$ 0.00</td>
            <td class="tempo-total">0.00</td>
            <td class="valor-total">R$ 0.00</td>
            <td><button class="remove-row-button">Remover</button></td>
        `;

        // Adiciona um ouvinte de evento para o botão "Remover" de cada nova linha
        const removeButton = newRow.querySelector('.remove-row-button');
        removeButton.addEventListener('click', function() {
            if (itensTableBody.rows.length > 1) { // Permite remover a linha se houver mais de uma
                newRow.remove(); // Remove a linha da tabela
                atualizarSubtotais(); // Recalcula os totais após a remoção
            } else {
                alert('É necessário ter pelo menos uma linha na tabela.'); // Mensagem se tentar remover a última linha
            }
        });

        // Atualiza os valores calculados da linha recém-adicionada
        atualizarLinhaTabela(newRow);
        atualizarSubtotais(); // Recalcula os totais após a adição
    }

    // Atualiza os campos calculados de uma linha específica da tabela
    function atualizarLinhaTabela(row) {
        const quantidadeInput = row.querySelector('.quantidade-input');
        const tempoUnitarioInput = row.querySelector('.tempo-unitario-input');
        const valorUnitarioCell = row.querySelector('.valor-unitario');
        const tempoTotalCell = row.querySelector('.tempo-total');
        const valorTotalCell = row.querySelector('.valor-total');

        const quantidade = parseFloat(quantidadeInput.value) || 0; // Converte para float, ou 0 se inválido
        const tempoUnitario = parseFloat(tempoUnitarioInput.value) || 0;

        const valorUnitario = tempoUnitario * VALOR_CUSTO_FIXO; // Custo unitário da peça
        const tempoTotal = quantidade * tempoUnitario; // Tempo total para a quantidade de peças
        const valorTotal = tempoTotal * VALOR_CUSTO_FIXO; // Valor total para a quantidade de peças

        // Atualiza o texto nas células de resultado da linha
        valorUnitarioCell.textContent = `R$ ${valorUnitario.toFixed(2).replace('.', ',')}`;
        tempoTotalCell.textContent = tempoTotal.toFixed(2).replace('.', ',');
        valorTotalCell.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    }

    // Obtém todos os dados das linhas da tabela
    function obterDadosTabela() {
        const dados = [];
        const rows = itensTableBody.querySelectorAll('tr'); // Seleciona todas as linhas do corpo da tabela
        rows.forEach(row => {
            const quantidade = parseFloat(row.querySelector('.quantidade-input').value) || 0;
            const peca = row.querySelector('.peca-input').value.trim();
            const largura = parseFloat(row.querySelector('.largura-input').value) || 0;
            const altura = parseFloat(row.querySelector('.altura-input').value) || 0;
            const tempoUnitario = parseFloat(row.querySelector('.tempo-unitario-input').value) || 0;

            const valorUnitario = tempoUnitario * VALOR_CUSTO_FIXO;
            const tempoTotal = quantidade * tempoUnitario;
            const valorTotal = tempoTotal * VALOR_CUSTO_FIXO;

            // Inclui a linha nos dados apenas se tiver alguma informação relevante
            if (quantidade > 0 || peca !== '' || largura > 0 || altura > 0 || tempoUnitario > 0) {
                dados.push({
                    quantidade: quantidade,
                    peca: peca,
                    largura: largura,
                    altura: altura,
                    tempoUnitario: tempoUnitario,
                    valorUnitario: valorUnitario,
                    tempoTotal: tempoTotal,
                    valorTotal: valorTotal
                });
            }
        });
        return dados;
    }

    // Atualiza os subtotais da seção de resumo e o valor total geral
    function atualizarSubtotais() {
        let subtotalPecasTempo = 0;
        let subtotalPecasValor = 0;
        const dadosPecas = obterDadosTabela(); // Pega os dados atuais da tabela
        dadosPecas.forEach(item => {
            subtotalPecasTempo += item.tempoTotal;
            subtotalPecasValor += item.valorTotal;
        });

        const tempoProgramacao = parseFloat(tempoProgramacaoInput.value) || 0;
        const custoProgramacaoValor = tempoProgramacao * VALOR_CUSTO_FIXO;

        // Atualiza os displays de subtotal na interface
        subtotalPecasDisplay.textContent = `R$ ${subtotalPecasValor.toFixed(2).replace('.', ',')}`;
        custoProgramacaoDisplay.textContent = `R$ ${custoProgramacaoValor.toFixed(2).replace('.', ',')}`;

        // Calcula e atualiza o valor total geral
        const valorGeralTotal = subtotalPecasValor + custoProgramacaoValor;
        ultimoPrecoTotalCalculado = valorGeralTotal; // Armazena para uso no pop-up/exportação
        valorTotalCalculadoDisplay.textContent = `R$ ${valorGeralTotal.toFixed(2).replace('.', ',')}`; // Atualiza o display do valor total
        valorTotalCalculadoDisplay.style.color = '#007bff'; // Define a cor para azul
    }

    // -------- 4. Lógica do Botão "Gerar Orçamento (Nova Janela)" --------

    gerarOrcamentoBtn.addEventListener('click', function() {
        const nomeCliente = nomeClienteInput.value.trim();
        const dataOrcamento = dataOrcamentoInput.value;
        const tempoProgramacao = parseFloat(tempoProgramacaoInput.value) || 0;
        const custoHora = VALOR_CUSTO_FIXO;
        const dadosPecas = obterDadosTabela();

        // Validações antes de gerar o orçamento completo
        if (nomeCliente === '') {
            alert('Por favor, preencha o Nome do Cliente antes de gerar o orçamento.');
            nomeClienteInput.focus();
            return;
        }
        if (isNaN(tempoProgramacao) || tempoProgramacao < 0) {
            alert('Por favor, insira um valor válido e positivo para o Tempo de Programação.');
            tempoProgramacaoInput.focus();
            return;
        }
        // Validações para a tabela: ao menos uma linha preenchida ou tempo de programação
        const hasValidPecas = dadosPecas.some(item =>
            (item.quantidade > 0 && item.tempoUnitario > 0) || item.peca !== ''
        );
        if (!hasValidPecas && tempoProgramacao === 0) {
            alert('Por favor, adicione e preencha pelo menos uma linha válida na tabela de peças OU insira um tempo de programação.');
            return;
        }

        atualizarSubtotais(); // Garante que o último cálculo esteja atualizado para o pop-up
        const precoTotalFinal = ultimoPrecoTotalCalculado;


        // Formatação da data para exibição no pop-up (correção de fuso horário)
        const [anoData, mesData, diaData] = dataOrcamento.split('-').map(Number);
        const dataParaExibir = new Date(anoData, mesData - 1, diaData);
        const dataOrcamentoFormatada = dataParaExibir.toLocaleDateString('pt-BR');

        // Geração do HTML da tabela para o pop-up
        let tabelaHTML = `
            <table class="orcamento-table">
                <thead>
                    <tr>
                        <th>Qtd.</th>
                        <th>Peça</th>
                        <th>Largura (mm)</th>
                        <th>Altura (mm)</th>
                        <th>Tempo Unit. (h)</th>
                        <th>Valor Unit. (R$)</th>
                        <th>Tempo Total (h)</th>
                        <th>Valor Total (R$)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        dadosPecas.forEach(item => {
            // Inclui apenas linhas com dados relevantes no HTML do orçamento
            if (item.quantidade > 0 || item.peca !== '' || item.largura > 0 || item.altura > 0 || item.tempoUnitario > 0) {
                tabelaHTML += `
                    <tr>
                        <td>${item.quantidade.toFixed(2).replace('.', ',')}</td>
                        <td>${item.peca || '-'}</td>
                        <td>${item.largura.toFixed(2).replace('.', ',')}</td>
                        <td>${item.altura.toFixed(2).replace('.', ',')}</td>
                        <td>${item.tempoUnitario.toFixed(2).replace('.', ',')}</td>
                        <td>R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}</td>
                        <td>${item.tempoTotal.toFixed(2).replace('.', ',')}</td>
                        <td>R$ ${item.valorTotal.toFixed(2).replace('.', ',')}</td>
                    </tr>
                `;
            }
        });
        tabelaHTML += `
                </tbody>
            </table>
        `;

        const custoProgramacaoValor = tempoProgramacao * VALOR_CUSTO_FIXO;

        // Conteúdo HTML da nova janela (com estilos responsivos embutidos)
        const orcamentoHTML = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Orçamento CNC - ${nomeCliente}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 20px;
                        color: #333;
                        line-height: 1.6;
                        font-size: 16px; /* Tamanho da fonte base para responsividade */
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 15px;
                    }
                    .header img {
                        max-width: 90px; /* AJUSTADO: Logo principal menor no pop-up */
                        margin-bottom: 10px;
                    }
                    .header h1 {
                        color: #2c3e50;
                        font-size: 1.8em;
                        margin: 0;
                    }
                    .details p {
                        margin: 5px 0;
                        font-size: 1.05em;
                    }
                    .details strong {
                        color: #007bff;
                    }
                    .section-divider {
                        border-top: 1px dashed #ccc;
                        margin: 25px 0;
                    }
                    .orcamento-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        font-size: 0.9em;
                        display: block; /* Para permitir overflow-x */
                        overflow-x: auto; /* Adiciona rolagem horizontal à tabela no pop-up */
                        -webkit-overflow-scrolling: touch; /* Melhoria de rolagem para iOS */
                    }
                    .orcamento-table th, .orcamento-table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: center;
                        white-space: nowrap; /* Evita quebra de linha em células */
                    }
                    .orcamento-table th {
                        background-color: #f2f2f2;
                        color: #333;
                        font-weight: bold;
                    }
                    .orcamento-table td:nth-child(6), .orcamento-table td:nth-child(8) {
                        font-weight: bold;
                        color: #0056b3;
                    }
                    .summary-section {
                        text-align: right;
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                    }
                    .summary-section p {
                        margin: 5px 0;
                        font-weight: bold;
                    }
                    .summary-section .total-price {
                        font-size: 1.8em;
                        font-weight: bold;
                        color: #28a745;
                        text-align: center;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        font-size: 0.9em;
                        color: #777;
                    }

                    /* Estilos para o botão de PDF e o rodapé de parceria no pop-up */
                    .pdf-button-container {
                        text-align: center;
                        margin-top: 30px;
                        margin-bottom: 20px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                    }

                    .print-pdf-button {
                        background-color: #dc3545;
                        color: white;
                        padding: 12px 25px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1.1em;
                        transition: background-color 0.3s ease;
                    }

                    .print-pdf-button:hover {
                        background-color: #c82333;
                    }

                    .popup-footer-partnership {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 1px dashed #ccc;
                        font-size: 0.85em;
                        color: #6c757d;
                    }

                    .popup-gmobile-logo {
                        max-width: 40px; /* AJUSTADO: Logo da Gmobile menor no pop-up */
                        height: auto;
                        display: block;
                        margin: 10px auto 0;
                    }

                    /* Media Query para o Pop-up em telas menores (celular) */
                    @media (max-width: 600px) {
                        body {
                            margin: 10px;
                            font-size: 14px;
                        }
                        .header h1 {
                            font-size: 1.5em;
                        }
                        .header img {
                            max-width: 70px; /* AJUSTADO: Logo principal ainda menor em mobile no pop-up */
                        }
                        .details p {
                            font-size: 1em;
                        }
                        .orcamento-table {
                            font-size: 0.8em;
                            min-width: 450px;
                        }
                        .orcamento-table th, .orcamento-table td {
                            padding: 6px;
                        }
                        .print-pdf-button {
                            padding: 10px 20px;
                            font-size: 1em;
                        }
                        .popup-gmobile-logo {
                            max-width: 30px; /* AJUSTADO: Logo da Gmobile ainda menor em mobile no pop-up */
                        }
                        .summary-section .total-price {
                            font-size: 1.5em;
                        }
                        .footer {
                            font-size: 0.8em;
                        }
                    }

                    /* Estilos para Impressão (ocultam o botão de PDF na versão impressa) */
                    @media print {
                        .pdf-button-container {
                            display: none;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .header, .details, .orcamento-table, .summary-section, .footer, .popup-footer-partnership {
                            box-shadow: none !important;
                            border: none !important;
                            background-color: transparent !important;
                        }
                        .orcamento-table th, .orcamento-table td {
                            border: 0.5px solid #ccc !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="logo.png" alt="Logo da Empresa">
                    <h1>Orçamento de Usinagem CNC</h1>
                </div>

                <div class="details">
                    <p><strong>Cliente:</strong> ${nomeCliente}</p>
                    <p><strong>Data do Orçamento:</strong> ${dataOrcamentoFormatada}</p>
                    <div class="section-divider"></div>
                    <p><strong>Custo Fixo da Máquina por Hora:</strong> R$ ${custoHora.toFixed(2).replace('.', ',')}</p>
                    <p><strong>Tempo de Programação:</strong> ${tempoProgramacao.toFixed(2).replace('.', ',')} horas (Custo: R$ ${custoProgramacaoValor.toFixed(2).replace('.', ',')})</p>
                    <div class="section-divider"></div>
                    <h2>Detalhes das Peças</h2>
                    ${tabelaHTML}
                </div>

                <div class="summary-section">
                    <p><strong>Subtotal Peças:</strong> R$ ${dadosPecas.reduce((acc, item) => acc + item.valorTotal, 0).toFixed(2).replace('.', ',')}</p>
                    <p><strong>Custo de Programação:</strong> R$ ${custoProgramacaoValor.toFixed(2).replace('.', ',')}</p>
                    <div class="total-price">
                        Valor Total: R$ ${precoTotalFinal.toFixed(2).replace('.', ',')}
                    </div>
                </div>

                <div class="pdf-button-container">
                    <button class="print-pdf-button" onclick="window.print()">Gerar PDF / Imprimir</button>
                </div>

                <div class="footer">
                    <p>Este orçamento é válido por 30 dias. <br> Agradecemos a sua consulta!</p>
                </div>

                <div class="popup-footer-partnership">
                    <p>Parceria com:</p>
                    <img src="gmobile_logo.png" alt="Logo Gmobile" class="popup-gmobile-logo">
                </div>
            </body>
            </html>
        `;

        const novaJanela = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
        if (novaJanela) {
            novaJanela.document.write(orcamentoHTML);
            novaJanela.document.close();
            novaJanela.focus();
        } else {
            alert('A nova janela foi bloqueada pelo navegador. Por favor, permita pop-ups para este site.');
        }
    });

    // -------- 5. Lógica do Botão "Exportar para Excel" --------

    exportExcelBtn.addEventListener('click', function() {
        const nomeCliente = nomeClienteInput.value.trim();
        const dataOrcamento = dataOrcamentoInput.value;
        const tempoProgramacao = parseFloat(tempoProgramacaoInput.value) || 0;
        const custoHora = VALOR_CUSTO_FIXO;
        const dadosPecas = obterDadosTabela();

        // Validações antes de exportar
        if (nomeCliente === '') {
            alert('Por favor, preencha o Nome do Cliente antes de exportar.');
            nomeClienteInput.focus();
            return;
        }
        const hasValidPecas = dadosPecas.some(item =>
            (item.quantidade > 0 && item.tempoUnitario > 0) || item.peca !== ''
        );
        if (!hasValidPecas && tempoProgramacao === 0) {
            alert('Não há dados de peças para exportar. Por favor, preencha a tabela ou o tempo de programação.');
            return;
        }

        atualizarSubtotais();
        const precoTotalFinal = ultimoPrecoTotalCalculado;
        const custoProgramacaoValor = tempoProgramacao * VALOR_CUSTO_FIXO;


        // Preparar dados para a planilha
        const dadosPlanilha = [];

        // Cabeçalho Principal
        dadosPlanilha.push(['ORÇAMENTO DE USINAGEM CNC']);
        dadosPlanilha.push([]);
        dadosPlanilha.push(['Cliente:', nomeCliente]);
        dadosPlanilha.push(['Data do Orçamento:', new Date(dataOrcamento).toLocaleDateString('pt-BR')]);
        dadosPlanilha.push(['Tempo de Programação (Minuto):', tempoProgramacao.toFixed(2).replace('.', ','), 'Custo Programação (R$):', custoProgramacaoValor.toFixed(2).replace('.', ',')]);
        dadosPlanilha.push([]);

        // Cabeçalho da Tabela de Peças
        dadosPlanilha.push([
            'Qtd.', 'Peça', 'Largura (mm)', 'Altura (mm)',
            'Tempo Unit. (h)', 'Valor Unit. (R$)', 'Tempo Total (h)', 'Valor Total (R$)'
        ]);

        // Dados da Tabela de Peças
        dadosPecas.forEach(item => {
            if (item.quantidade > 0 || item.peca !== '' || item.largura > 0 || item.altura > 0 || item.tempoUnitario > 0) {
                dadosPlanilha.push([
                    item.quantidade,
                    item.peca,
                    item.largura,
                    item.altura,
                    item.tempoUnitario,
                    item.valorUnitario,
                    item.tempoTotal,
                    item.valorTotal
                ]);
            }
        });
        dadosPlanilha.push([]);

        // Totais
        dadosPlanilha.push(['', '', '', '', '', '', 'SUBTOTAL PEÇAS (R$):', dadosPecas.reduce((acc, item) => acc + item.valorTotal, 0)]);
        dadosPlanilha.push(['', '', '', '', '', '', 'CUSTO PROGRAMAÇÃO (R$):', custoProgramacaoValor]);
        dadosPlanilha.push(['', '', '', '', '', '', 'VALOR TOTAL GERAL (R$):', precoTotalFinal]);


        // Criação da planilha e pasta de trabalho
        const ws = XLSX.utils.aoa_to_sheet(dadosPlanilha);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Orçamento CNC');

        // Definindo larguras das colunas (opcional, mas melhora a visualização)
        ws['!cols'] = [
            { wch: 8 }, // Qtd.
            { wch: 20 }, // Peça
            { wch: 12 }, // Largura
            { wch: 12 }, // Altura
            { wch: 15 }, // Tempo Unit.
            { wch: 15 }, // Valor Unit.
            { wch: 15 }, // Tempo Total
            { wch: 15 }  // Valor Total
        ];

        // Exporta o arquivo
        const nomeArquivo = `Orcamento_CNC_${nomeCliente.replace(/\s/g, '_')}_${dataOrcamento}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
    });

    // -------- Inicializar o App --------
    inicializarApp();
});
