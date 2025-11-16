/*
 * script.js
 *
 * Lógica do Gerador de Orçamento CNC Avançado
 * Inclui manipulação da tabela, cálculos automáticos,
 * geração de orçamento em nova janela, exportação para Excel e cálculo de desconto em % ou R$.
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Seleção de Elementos HTML
    const numeroOrcamentoInput = document.getElementById('numeroOrcamento'); // Campo de número do orçamento
    const nomeClienteInput = document.getElementById('nomeCliente');
    const dataOrcamentoInput = document.getElementById('dataOrcamento');
    const tempoProgramacaoInput = document.getElementById('tempoProgramacao');
    const custoHoraInput = document.getElementById('custoHora');
    // NOVO: Campos de Desconto
    const percentualDescontoInput = document.getElementById('percentualDesconto');
    const valorDescontoFixoInput = document.getElementById('valorDescontoFixo');
    
    const itensTableBody = document.querySelector('#itensTable tbody');
    const addRowBtn = document.getElementById('addRowBtn');
    addRowBtn.addEventListener('click', adicionarLinhaTabela); // Listener para o botão "Adicionar Linha"
    
    // Displays de Totais
    const valorTotalCalculadoDisplay = document.getElementById('valorTotalCalculado'); // Valor sem desconto
    // NOVO: Display do Desconto Aplicado
    const valorDescontoAplicadoDisplay = document.getElementById('valorDescontoAplicado');
    // NOVO: Display do Valor Final com Desconto
    const valorTotalComDescontoDisplay = document.getElementById('valorTotalComDesconto');
    
    const gerarOrcamentoBtn = document.getElementById('gerarOrcamentoBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const subtotalPecasDisplay = document.getElementById('subtotalPecas');
    const custoProgramacaoDisplay = document.getElementById('custoProgramacao');
    // Novo botão da calculadora
    const abrirCalculadoraBtn = document.getElementById('abrirCalculadoraBtn');

    // Variáveis globais/constantes
    const VALOR_CUSTO_FIXO = 3.34;
    let ultimoPrecoTotalCalculado = 0; // Armazena o último total ANTES do desconto
    let ultimoPrecoFinalComDesconto = 0; // Armazena o último total DEPOIS do desconto
    let ultimoValorDesconto = 0; // Armazena o valor do desconto aplicado (em R$)

    // Informações da Empresa (Substitua com seus seus dados reais)
    const COMPANY_ADDRESS = "Avenida Santa Tereza, 273 - Bairro Jd. Santa Tereza, Rio Grande da Serra, SP - CEP: 09450-000";
    const COMPANY_CNPJ = "60.305.305/0001-33 / 60.305.305 ADRIANO ALEXANDRE DA SILVA";
    const COMPANY_PIX = "isbran@gmail.com / WhatsApp: (11) 96487-1099 (Geasi) ou (11) 98614-9177 (Adriano)";


    // -------- 2. Funções de Inicialização (ao carregar o app) --------

    function inicializarApp() {
        // Preencher data atual automaticamente no campo de data
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado (Janeiro = 0)
        const ano = hoje.getFullYear();
        dataOrcamentoInput.value = `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD para input type="date"

        // Preencher informações da empresa nos spans correspondentes
        document.getElementById('companyAddress').textContent = COMPANY_ADDRESS;
        document.getElementById('companyCnpj').textContent = COMPANY_CNPJ;
        document.getElementById('companyPix').textContent = COMPANY_PIX;


        // Fixar valor do custo da máquina por hora e tornar o campo não editável
        custoHoraInput.value = VALOR_CUSTO_FIXO.toFixed(2); // Preenche com 2 casas decimais
        custoHoraInput.readOnly = true; // Torna o campo somente leitura
        custoHoraInput.style.backgroundColor = '#e9ecef'; // Fundo cinza para indicar que é fixo
        custoHoraInput.style.cursor = 'not-allowed'; // Cursor de "proibido"

        // Adicionar 10 linhas iniciais à tabela de itens
        for (let i = 0; i < 10; i++) {
            adicionarLinhaTabela();
        }

        // Adicionar ouvintes de evento para inputs numéricos da tabela, tempo de programação E DESCONTOS
        itensTableBody.addEventListener('input', function(event) {
            if (event.target.closest('.quantidade-input') || event.target.closest('.tempo-unitario-input')) {
                atualizarLinhaTabela(event.target.closest('tr')); // Atualiza cálculos da linha
                atualizarSubtotais(); // Recalcula e exibe o total geral
            }
        });
        tempoProgramacaoInput.addEventListener('input', atualizarSubtotais); // Recalcula ao mudar tempo de programação
        
        // NOVO LISTENER: Recalcula e gerencia os campos de desconto
        percentualDescontoInput.addEventListener('input', function() {
            if (parseFloat(this.value) > 0) {
                valorDescontoFixoInput.value = '0.00'; // Zera o outro campo ao digitar aqui
            }
            atualizarSubtotais();
        });

        valorDescontoFixoInput.addEventListener('input', function() {
            if (parseFloat(this.value) > 0) {
                percentualDescontoInput.value = '0'; // Zera o outro campo ao digitar aqui
            }
            atualizarSubtotais();
        });


        // Listener para o novo botão da calculadora
        abrirCalculadoraBtn.addEventListener('click', function() {
            window.open('calculadora.html', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        });


        // Chama a atualização inicial para garantir que os subtotais e total estejam corretos ao carregar a página
        atualizarSubtotais();
    }

    // Função para exibir mensagens ao usuário (substitui alert())
    function displayMessage(message, type = 'info') {
        const messageBox = document.createElement('div');
        messageBox.textContent = message;
        messageBox.style.padding = '10px';
        messageBox.style.margin = '10px 0';
        messageBox.style.borderRadius = '5px';
        messageBox.style.textAlign = 'center';
        messageBox.style.fontWeight = 'bold';
        messageBox.style.color = 'white';

        if (type === 'error') {
            messageBox.style.backgroundColor = '#dc3545'; // Vermelho para erro
        } else {
            messageBox.style.backgroundColor = '#007bff'; // Azul para informação
        }

        // Insere a caixa de mensagem antes do primeiro input-group
        const container = document.querySelector('.container');
        const firstInputGroup = document.querySelector('.container').firstChild; // Pega o primeiro elemento
        container.insertBefore(messageBox, firstInputGroup.nextSibling);

        // Remove a mensagem após alguns segundos
        setTimeout(() => {
            messageBox.remove();
        }, 5000); // 5 segundos
    }


    // Adiciona uma nova linha à tabela com valores iniciais opcionais
    function adicionarLinhaTabela(quantidade = '', peca = '', largura = '', altura = '', tempoUnitario = '') {
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
                // Substituído alert() por uma mensagem na interface
                displayMessage('É necessário ter pelo menos uma linha na tabela.', 'error');
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
            const quantidade = row.querySelector('.quantidade-input').value.trim(); // Get as string
            const peca = row.querySelector('.peca-input').value.trim();
            const largura = row.querySelector('.largura-input').value.trim(); // Get as string
            const altura = row.querySelector('.altura-input').value.trim(); // Get as string
            const tempoUnitario = row.querySelector('.tempo-unitario-input').value.trim(); // Get as string

            const numericQuantidade = parseFloat(quantidade) || 0;
            const numericTempoUnitario = parseFloat(tempoUnitario) || 0;

            const valorUnitario = numericTempoUnitario * VALOR_CUSTO_FIXO;
            const tempoTotal = numericQuantidade * numericTempoUnitario;
            const valorTotal = tempoTotal * VALOR_CUSTO_FIXO;

            // Inclui a linha nos dados apenas se tiver alguma informação relevante
            if (numericQuantidade > 0 || peca !== '' || parseFloat(largura) > 0 || parseFloat(altura) > 0 || numericTempoUnitario > 0) {
                dados.push({
                    quantidade: quantidade, // Keep as string
                    peca: peca,
                    largura: largura, // Keep as string
                    altura: altura, // Keep as string
                    tempoUnitario: tempoUnitario, // Keep as string
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
            // Use numeric values for calculations
            subtotalPecasTempo += (parseFloat(item.quantidade) || 0) * (parseFloat(item.tempoUnitario) || 0);
            subtotalPecasValor += (parseFloat(item.quantidade) || 0) * (parseFloat(item.tempoUnitario) || 0) * VALOR_CUSTO_FIXO;
        });

        const tempoProgramacao = parseFloat(tempoProgramacaoInput.value) || 0;
        const custoProgramacaoValor = tempoProgramacao * VALOR_CUSTO_FIXO;

        // Atualiza os displays de subtotal na interface
        subtotalPecasDisplay.textContent = `R$ ${subtotalPecasValor.toFixed(2).replace('.', ',')}`;
        custoProgramacaoDisplay.textContent = `R$ ${custoProgramacaoValor.toFixed(2).replace('.', ',')}`;

        // Calcula o valor total geral (SEM DESCONTO)
        const valorGeralTotal = subtotalPecasValor + custoProgramacaoValor;
        ultimoPrecoTotalCalculado = valorGeralTotal; // Armazena para uso no pop-up/exportação
        valorTotalCalculadoDisplay.textContent = `R$ ${valorGeralTotal.toFixed(2).replace('.', ',')}`; // Atualiza o display do valor total (subtotal)

        // Lógica de Desconto Híbrido:
        let valorDesconto = 0;
        let percentualDesconto = parseFloat(percentualDescontoInput.value) || 0;
        let valorDescontoFixo = parseFloat(valorDescontoFixoInput.value) || 0;

        // 1. Validação/Escolha do Desconto
        if (valorDescontoFixo > 0 && percentualDesconto > 0) {
            // Se ambos forem preenchidos, prioriza um e zera o outro no display para evitar confusão.
            // Aqui, priorizamos o valor fixo.
            percentualDescontoInput.value = '0';
            percentualDesconto = 0;
            displayMessage('Apenas um tipo de desconto (percentual ou fixo) pode ser aplicado. O desconto em R$ foi mantido.', 'info');
        } 
        
        if (valorDescontoFixo > 0) {
            // Desconto em R$
            valorDesconto = Math.min(valorDescontoFixo, valorGeralTotal); // Garante que o desconto não exceda o total
            percentualDesconto = (valorDesconto / valorGeralTotal) * 100; // Calcula o % para exibição no pop-up
        } else if (percentualDesconto > 0) {
            // Desconto em %
            percentualDesconto = Math.min(percentualDesconto, 100); // Garante que o % não exceda 100
            percentualDescontoInput.value = percentualDesconto; 
            valorDesconto = valorGeralTotal * (percentualDesconto / 100); // Calcula o valor do desconto
            valorDescontoFixoInput.value = valorDesconto.toFixed(2); // Atualiza o campo R$ com o valor calculado (apenas visual)
        } else {
            valorDescontoFixoInput.value = '0.00';
        }

        const valorFinalComDesconto = valorGeralTotal - valorDesconto;
        
        ultimoValorDesconto = valorDesconto; // Armazena o valor do desconto em R$
        ultimoPrecoFinalComDesconto = valorFinalComDesconto; // Armazena o valor final

        // Atualiza o display do desconto aplicado e do valor final com desconto
        valorDescontoAplicadoDisplay.textContent = `R$ ${valorDesconto.toFixed(2).replace('.', ',')}`;
        valorTotalComDescontoDisplay.textContent = `R$ ${valorFinalComDesconto.toFixed(2).replace('.', ',')}`;
    }

    // -------- 4. Lógica do Botão "Gerar Orçamento (Nova Janela)" --------

    gerarOrcamentoBtn.addEventListener('click', function() {
        // CORREÇÃO ESSENCIAL: Abrir a janela imediatamente para burlar o bloqueador
        const novaJanela = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
        if (!novaJanela) {
            displayMessage('A nova janela foi bloqueada pelo navegador. Por favor, permita pop-ups para este site.', 'error');
            return;
        }

        const numeroOrcamento = numeroOrcamentoInput.value.trim(); // Pega o número do orçamento
        const nomeCliente = nomeClienteInput.value.trim();
        const dataOrcamento = dataOrcamentoInput.value;
        const tempoProgramacao = parseFloat(tempoProgramacaoInput.value) || 0;
        const custoHora = VALOR_CUSTO_FIXO;
        const dadosPecas = obterDadosTabela();
        atualizarSubtotais(); // Garante que o último cálculo esteja atualizado

        // Validações antes de gerar o orçamento completo
        if (numeroOrcamento === '') {
            novaJanela.close(); // Fecha a janela aberta se a validação falhar
            displayMessage('Por favor, preencha o Número do Orçamento.', 'error');
            numeroOrcamentoInput.focus();
            return;
        }
        if (nomeCliente === '') {
            novaJanela.close();
            displayMessage('Por favor, preencha o Nome do Cliente antes de gerar o orçamento.', 'error');
            nomeClienteInput.focus();
            return;
        }
        if (isNaN(tempoProgramacao) || tempoProgramacao < 0) {
            novaJanela.close();
            displayMessage('Por favor, insira um valor válido e positivo para o Tempo de Programação.', 'error');
            tempoProgramacaoInput.focus();
            return;
        }
        // Validações para a tabela: ao menos uma linha preenchida ou tempo de programação
        const hasValidPecas = dadosPecas.some(item =>
            (parseFloat(item.quantidade) > 0 && parseFloat(item.tempoUnitario) > 0) || item.peca !== ''
        );
        if (!hasValidPecas && tempoProgramacao === 0) {
            novaJanela.close();
            displayMessage('Por favor, adicione e preencha pelo menos uma linha válida na tabela de peças OU insira um tempo de programação.', 'error');
            return;
        }

        // Variáveis de Totais Globais
        const precoTotalSemDesconto = ultimoPrecoTotalCalculado;
        const precoTotalFinal = ultimoPrecoFinalComDesconto; 
        const valorDesconto = ultimoValorDesconto;
        const custoProgramacaoValor = tempoProgramacao * VALOR_CUSTO_FIXO;
        // Pega o percentual real aplicado (calculado no atualizarSubtotais)
        const percentualDescontoAplicado = (valorDesconto / precoTotalSemDesconto) * 100;


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
                        <th>Tempo Unit. (min)</th>
                        <th>Valor Unit. (R$)</th>
                        <th>Tempo Total (min)</th>
                        <th>Valor Total (R$)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        dadosPecas.forEach(item => {
            // Include only rows with relevant data in the budget HTML
            const numericQuantidade = parseFloat(item.quantidade) || 0;
            const numericLargura = parseFloat(item.largura) || 0;
            const numericAltura = parseFloat(item.altura) || 0;
            const numericTempoUnitario = parseFloat(item.tempoUnitario) || 0;
            const numericTempoTotal = numericQuantidade * numericTempoUnitario;
            const numericValorTotal = numericTempoTotal * VALOR_CUSTO_FIXO;


            if (numericQuantidade > 0 || item.peca !== '' || numericLargura > 0 || numericAltura > 0 || numericTempoUnitario > 0) {
                tabelaHTML += `
                    <tr>
                        <td>${item.quantidade}</td>
                        <td>${item.peca || '-'}</td>
                        <td>${item.largura}</td>
                        <td>${item.altura}</td>
                        <td>${item.tempoUnitario}</td>
                        <td>R$ ${item.valorUnitario.toFixed(2).replace('.', ',')}</td>
                        <td>${numericTempoTotal.toFixed(2).replace('.', ',')}</td>
                        <td>R$ ${numericValorTotal.toFixed(2).replace('.', ',')}</td>
                    </tr>
                `;
            }
        });
        tabelaHTML += `
                </tbody>
            </table>
        `;

        // Conteúdo HTML da nova janela (com estilos responsivos embutidos)
        const orcamentoHTML = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Orçamento CNC - ${nomeCliente}</title>
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
                    /* Estilo para as informações da empresa no pop-up */
                    .company-info-popup {
                        text-align: center;
                        margin-bottom: 20px;
                        font-size: 0.9em;
                        color: #555;
                    }
                    .company-info-popup p {
                        margin: 3px 0;
                    }
                    .company-info-popup strong {
                        color: #333;
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
                        font-size: 1.1em;
                    }
                    .summary-section .total-no-discount {
                         color: #555;
                         font-size: 1em;
                    }
                    .summary-section .discount-amount {
                        color: #dc3545; /* Vermelho para desconto */
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
                        max-width: 80px; /* AJUSTADO: Logo da Gmobile menor no pop-up */
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
                        /* Ajuste do tamanho da fonte para mobile no pop-up */
                        .company-info-popup {
                            font-size: 0.8em;
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
                            max-width: 80px; /* AJUSTADO: Logo da Gmobile ainda menor em mobile no pop-up */
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

                <div class="company-info-popup">
                    <p><strong>Endereço:</strong> ${COMPANY_ADDRESS}</p>
                    <p><strong>CNPJ:</strong> ${COMPANY_CNPJ}</p>
                    <p><strong>PIX:</strong> ${COMPANY_PIX}</p>
                </div>

                <div class="details">
                    <p><strong>Número do Orçamento:</strong> ${numeroOrcamento}</p>
                    <p><strong>Cliente:</strong> ${nomeCliente}</p>
                    <p><strong>Data do Orçamento:</strong> ${dataOrcamentoFormatada}</p>
                    <div class="section-divider"></div>
                    <p><strong>Tempo de Programação:</strong> ${tempoProgramacao.toFixed(2).replace('.', ',')} Minutos (Custo: R$ ${custoProgramacaoValor.toFixed(2).replace('.', ',')})</p>
                    <div class="section-divider"></div>
                    <h2>Detalhes das Peças</h2>
                    ${tabelaHTML}
                </div>

                <div class="summary-section">
                    <p><strong>Subtotal Peças:</strong> R$ ${dadosPecas.reduce((acc, item) => acc + item.valorTotal, 0).toFixed(2).replace('.', ',')}</p>
                    <p><strong>Custo de Programação:</strong> R$ ${custoProgramacaoValor.toFixed(2).replace('.', ',')}</p>
                    <p class="total-no-discount"><strong>Total Sem Desconto:</strong> R$ ${precoTotalSemDesconto.toFixed(2).replace('.', ',')}</p>
                    <p class="discount-amount"><strong>Desconto (${percentualDescontoAplicado.toFixed(2).replace('.', ',')}%) em R$:</strong> R$ ${valorDesconto.toFixed(2).replace('.', ',')}</p>
                    <div class="total-price">
                        Valor Total Final: R$ ${precoTotalFinal.toFixed(2).replace('.', ',')}
                    </div>
                </div>

                <div class="pdf-button-container">
                    <button class="print-pdf-button" onclick="window.print()">Gerar PDF</button>
                </div>

                <div class="footer">
                    <p>Este orçamento é válido por 30 dias. <br> Agradecemos a sua consulta!<br> Soli Deo Gloria!</p>
                </div>

                <div class="popup-footer-partnership">
                    <p>Parceria com:</p>
                    <img src="gmobile_logo.png" alt="Logo Gmobile" class="popup-gmobile-logo">
                </div>
            </body>
            </html>
        `;

        // Escreve o conteúdo na janela aberta (isso só funciona se o window.open não foi bloqueado)
        novaJanela.document.write(orcamentoHTML);
        novaJanela.document.close();
			
		// Define o título da nova janela ANTES de imprimir
        // Este título será usado como o nome de arquivo padrão ao salvar como PDF
        novaJanela.document.title = `USINFOCO_${numeroOrcamento.replace(/[^a-zA-Z0-9]/g, '')}_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '')}`;	
			
        novaJanela.focus();
    });

    // -------- 5. Lógica do Botão "Exportar para Excel" --------

    exportExcelBtn.addEventListener('click', function() {
        const numeroOrcamento = numeroOrcamentoInput.value.trim(); // Pega o número do orçamento
        const nomeCliente = nomeClienteInput.value.trim();
        const dataOrcamento = dataOrcamentoInput.value;
        const tempoProgramacao = parseFloat(tempoProgramacaoInput.value) || 0;
        const custoHora = VALOR_CUSTO_FIXO;
        const dadosPecas = obterDadosTabela();

        // Validações antes de exportar
        if (numeroOrcamento === '') {
            displayMessage('Por favor, preencha o Número do Orçamento antes de exportar.', 'error');
            numeroOrcamentoInput.focus();
            return;
        }
        if (nomeCliente === '') {
            displayMessage('Por favor, preencha o Nome do Cliente antes de exportar.', 'error');
            nomeClienteInput.focus();
            return;
        }
        const hasValidPecas = dadosPecas.some(item =>
            (parseFloat(item.quantidade) > 0 && parseFloat(item.tempoUnitario) > 0) || item.peca !== ''
        );
        if (!hasValidPecas && tempoProgramacao === 0) {
            displayMessage('Não há dados de peças para exportar. Por favor, preencha a tabela ou o tempo de programação.', 'error');
            return;
        }

        atualizarSubtotais();
        // Variáveis de Totais Globais
        const precoTotalSemDesconto = ultimoPrecoTotalCalculado;
        const precoTotalFinal = ultimoPrecoFinalComDesconto; 
        const valorDesconto = ultimoValorDesconto;
        const custoProgramacaoValor = tempoProgramacao * VALOR_CUSTO_FIXO;
        // Pega o percentual real aplicado
        const percentualDescontoAplicado = (valorDesconto / precoTotalSemDesconto) * 100;


        // Preparar dados para a planilha
        const dadosPlanilha = [];

        // Cabeçalho Principal com informações da empresa e número do orçamento
        dadosPlanilha.push(['ORÇAMENTO DE USINAGEM CNC']);
        dadosPlanilha.push([]);
        dadosPlanilha.push(['Endereço:', COMPANY_ADDRESS]);
        dadosPlanilha.push(['CNPJ:', COMPANY_CNPJ]);
        dadosPlanilha.push(['PIX:', COMPANY_PIX]);
        dadosPlanilha.push([]); // Espaçamento
        dadosPlanilha.push(['Número do Orçamento:', numeroOrcamento]);
        dadosPlanilha.push(['Cliente:', nomeCliente]);
        dadosPlanilha.push(['Data do Orçamento:', new Date(dataOrcamento).toLocaleDateString('pt-BR')]);
        dadosPlanilha.push(['Tempo de Programação (Minuto):', tempoProgramacao.toFixed(2).replace('.', ','), 'Custo Programação (R$):', custoProgramacaoValor.toFixed(2).replace('.', ',')]);
        dadosPlanilha.push([]);

        // Cabeçalho da Tabela de Peças
        dadosPlanilha.push([
            'Qtd.', 'Peça', 'Largura (mm)', 'Altura (mm)',
            'Tempo Unit. (min)', 'Valor Unit. (R$)', 'Tempo Total (min)', 'Valor Total (R$)'
        ]);

        // Dados da Tabela de Peças
        dadosPecas.forEach(item => {
            const numericQuantidade = parseFloat(item.quantidade) || 0;
            const numericTempoUnitario = parseFloat(item.tempoUnitario) || 0;
            const numericTempoTotal = numericQuantidade * numericTempoUnitario;
            const numericValorTotal = numericTempoTotal * VALOR_CUSTO_FIXO;

            if (numericQuantidade > 0 || item.peca !== '' || parseFloat(item.largura) > 0 || parseFloat(item.altura) > 0 || numericTempoUnitario > 0) {
                dadosPlanilha.push([
                    item.quantidade, // Keep as string
                    item.peca,
                    item.largura, // Keep as string
                    item.altura, // Keep as string
                    item.tempoUnitario, // Keep as string
                    item.valorUnitario,
                    numericTempoTotal, // This calculation uses numeric values
                    numericValorTotal // This calculation uses numeric values
                ]);
            }
        });
        dadosPlanilha.push([]);

        // Totais
        dadosPlanilha.push(['', '', '', '', '', '', 'SUBTOTAL PEÇAS (R$):', dadosPecas.reduce((acc, item) => acc + ((parseFloat(item.quantidade) || 0) * (parseFloat(item.tempoUnitario) || 0) * VALOR_CUSTO_FIXO), 0)]);
        dadosPlanilha.push(['', '', '', '', '', '', 'CUSTO PROGRAMAÇÃO (R$):', custoProgramacaoValor]);
        dadosPlanilha.push(['', '', '', '', '', '', 'TOTAL SEM DESCONTO (R$):', precoTotalSemDesconto]);
        dadosPlanilha.push(['', '', '', '', '', '', `DESCONTO (${percentualDescontoAplicado.toFixed(2).replace('.', ',')}%) (R$):`, valorDesconto]);
        dadosPlanilha.push(['', '', '', '', '', '', 'VALOR TOTAL FINAL (R$):', precoTotalFinal]);


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
