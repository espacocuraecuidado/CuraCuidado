/**
 * SISTEMA DE GESTÃO CURA&CUIDADO v3.0
 * Desenvolvido em: Março de 2026
 * * Descrição: Centraliza Segurança, Sincronização, Gestão de Vendas,
 * Gestão de Usuários (Abas: Usuarios/Users) e Upload para Google Drive.
 */

// --- CONFIGURAÇÕES GLOBAIS ---
const API_URL = "https://script.google.com/macros/s/AKfycbyrqHCXtP99cGGH8KvVBLmY_9ElgkTtbK2JgFqecgszbeXCurJobZcrbe6BOy2bpHXm/exec";
const REFRESH_TIME = 30000; // 30 segundos
const MAX_FOTOS = 7;

// 1. SEGURANÇA E CONTROLE DE ACESSO
(function verificarSeguranca() {
    const user = localStorage.getItem("usuarioLogado");
    const tipo = localStorage.getItem("tipoUsuario");

    if (!user || tipo !== "admin") {
        alert("Acesso restrito! Redirecionando para a loja... 🚫");
        window.location.href = "index.html"; // Ajuste o caminho se necessário
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    // Saudação Dinâmica
    const greeting = document.getElementById("userGreeting");
    if (greeting) greeting.textContent = `Bem-vindo(a), ${localStorage.getItem("usuarioLogado")}!`;

    // Inicialização do Sistema
    carregarDados();
    configurarPrevisualizacaoImagens();
    
    // Timer de Sincronização Automática
    setInterval(carregarDados, REFRESH_TIME);
});

// 2. GESTÃO DE DADOS (CRUD E OPERAÇÕES)

/// 1. Função para Marcar como Pago (Coluna F -> Índice 6)
async function marcarComoPago(idPedido) {
    if (!idPedido || idPedido === "—") return alert("ID do pedido inválido!");
    
    const idStr = String(idPedido);
    if (!confirm(`Confirmar pagamento para o pedido ${idStr}? ✅`)) return;

    const btn = event.target;
    btn.disabled = true;

    try {
        const payload = { 
            acao: "executarPlanilha", 
            subAcao: "salvar",
            aba: "Vendas",
            id: idStr,
            payload: {
                "6": "Realizado" // Coluna F (Status_Pagamento)
            }
        };

        // Usamos mode: 'no-cors' para evitar bloqueios de segurança do navegador com o Google
        await fetch(API_URL, { method: "POST", mode: 'no-cors', body: JSON.stringify(payload) });
        
        alert("Comando enviado! Verifique a planilha em instantes. ✅");
        setTimeout(carregarDados, 2000); // Aguarda 2s para o Google processar e recarrega
    } catch (err) {
        console.error("Falha ao atualizar pagamento:", err);
        alert("Erro na conexão.");
    } finally {
        btn.disabled = false;
    }
}

// 2. Função para Marcar como Enviado (Coluna G -> Índice 7)
async function marcarComoEnviado(idPedido) {
    if (!idPedido || idPedido === "—") return alert("ID do pedido inválido!");
    
    const idStr = String(idPedido);
    if (!confirm(`Marcar pedido ${idStr} como ENVIADO? 🚚`)) return;

    const btn = event.target;
    btn.disabled = true;

    try {
        const payload = { 
            acao: "executarPlanilha", 
            subAcao: "salvar",
            aba: "Vendas",
            id: idStr,
            payload: {
                "7": "Enviado 🚚" // Coluna G (Status_Envio)
            }
        };

        await fetch(API_URL, { method: "POST", mode: 'no-cors', body: JSON.stringify(payload) });
        
        alert("Status de envio atualizado! 🚀");
        setTimeout(carregarDados, 2000);
    } catch (err) {
        console.error("Erro:", err);
        alert("Falha na conexão.");
    } finally {
        btn.disabled = false;
    }
}

// 3. Função para Adicionar Rastreio (Coluna K -> Índice 11)
async function adicionarRastreio(idPedido) {
    if (!idPedido || idPedido === "—") return alert("ID inválido!");
    
    const codigo = prompt("Digite o código de rastreio (ex: LB123456789BR):");
    if (!codigo) return;

    const idStr = String(idPedido);

    try {
        const payload = { 
            acao: "executarPlanilha", 
            subAcao: "salvar",
            aba: "Vendas",
            id: idStr,
            payload: {
                "11": codigo.trim().toUpperCase() // Coluna K (Rastreio)
            }
        };
        
        await fetch(API_URL, { method: "POST", mode: 'no-cors', body: JSON.stringify(payload) });
        
        alert("Código de rastreio enviado! 📦");
        setTimeout(carregarDados, 2000);
    } catch (err) {
        console.error("Erro ao salvar rastreio:", err);
        alert("Erro na comunicação.");
    }
}
// Função para Cancelar com Estorno
async function cancelarPedido(idPedido) {
    if (!idPedido || idPedido === "—") return;
    if (!confirm("Deseja realmente CANCELAR este pedido? ❌")) return;

    const btn = event.target;
    btn.disabled = true;

    try {
        // Mudamos de 'excluirPedido' para 'salvar' com status Cancelado
        const payload = { 
            acao: "executarPlanilha", 
            subAcao: "salvar",
            aba: "Vendas",
            id: String(idPedido),
            payload: {
                "6": "Cancelado ❌", // Muda pagamento para Cancelado
                "7": "Cancelado ❌"  // Muda envio para Cancelado
            }
        };

        await fetch(API_URL, { 
            method: "POST", 
            mode: 'no-cors', 
            body: JSON.stringify(payload) 
        });

        alert("Pedido marcado como cancelado na planilha! ❌");
        setTimeout(carregarDados, 2000);
    } catch (err) {
        console.error("Erro ao cancelar:", err);
        alert("Falha na conexão.");
    } finally {
        btn.disabled = false;
    }
}
// 3. SINCRONIZAÇÃO E RESILIÊNCIA

// Normalização para aceitar múltiplos formatos de JSON
// 3. SINCRONIZAÇÃO E RESILIÊNCIA

// Normalização para aceitar múltiplos formatos de JSON
function normalizeResponse(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.values && Array.isArray(data.values)) return data.values;
    return [];
}

async function carregarDados() {
    console.log("🔄 Sincronizando dados em segundo plano...");
    atualizarTabelaAgendamentos();
    atualizarIndicadorConexao("buscando");

    // REMOVEMOS: A limpeza visual ("Sincronizando...") foi retirada daqui 
    // para evitar que os dados sumam e voltem na tela.

    try {
        // 1. Faz a busca dos dados (O usuário continua vendo a tabela antiga)
        const [resVendas, resUsuarios, resProdutos] = await Promise.all([
            fetch(`${API_URL}?acao=listarVendas`),
            fetch(`${API_URL}?acao=listarUsuarios`), 
            fetch(`${API_URL}?acao=listarProdutos`)
        ]);

        const vendas = normalizeResponse(await resVendas.json());
        const users = normalizeResponse(await resUsuarios.json()); 
        const produtos = normalizeResponse(await resProdutos.json());
        
        // No seu GS, listarUsuarios puxa a aba "Users". 
        // Vamos usar esses dados para preencher a tabela de usuários.
        const usuarios = users; 

        // 2. Só atualiza a interface quando os novos dados já chegaram
        processarPainel(vendas, users, usuarios, produtos);
        atualizarIndicadorConexao("online");
        
    } catch (err) {
        console.error("Erro crítico na sincronização:", err);
        atualizarIndicadorConexao("erro");
    }
}
// --- FIM DA SEÇÃO 3 CORRIGIDA ---
        
// 4. INTERFACE DE MONITORAMENTO (UI/UX)

function processarPainel(vendas, users, usuarios, produtos) {
    // Estatísticas (Dashboard)
    const receitaTotal = vendas.reduce((acc, v) => acc + (Number(v.ValorTotal) || 0), 0);
    
    document.getElementById("totalVendas").textContent = vendas.length;
    document.getElementById("receitaTotal").textContent = `R$ ${receitaTotal.toFixed(2)}`;
    document.getElementById("totalUsuarios").textContent = usuarios.length;
    document.getElementById("totalProdutos").textContent = produtos.length;

    // Renderizar Vendas (Últimas 10)
    const tbodyVendas = document.getElementById("tabelaVendas");
    tbodyVendas.innerHTML = vendas.slice(-10).reverse().map(v => `
        <tr>
            <td><strong>${v["ID Pedido"] || v.ID || "—"}</strong></td>
            <td>${v.Data || "—"}</td>
            <td>${v.Cliente || "—"}</td>
            <td>${v.Produto || "—"}</td>
            <td>R$ ${Number(v.ValorTotal|| 0).toFixed(2)}</td>
            <td>${v.Produto || "—"}</td>
            <td>${v.Status_Pagamento || "—"}</td>
            <td>${v.Status_Envio || "—"}</td>
            <td>${v.Rastreio || "—"}</td> <td>
                <button onclick="marcarComoPago('${v["ID Pedido"] || v.ID}')" title="Marcar se Pagamento foi realizado">✅</button>
                <button onclick="marcarComoEnviado('${v["ID Pedido"] || v.ID}')" title="Marcar como Enviado">🚚</button>
               <button onclick="adicionarRastreio('${v["ID Pedido"] || v.ID}')" title="Adicionar Rastreio">📦</button>
                <button onclick="cancelarPedido('${v["ID Pedido"] || v.ID}')"title="Cancelar o Pedido">❌</button>
            </td>
        </tr>
    `).join("");

    // Renderizar Usuários (Comparando Abas Usuarios e Users se necessário)
    const tbodyUsers = document.getElementById("tabelaUsuarios");
    tbodyUsers.innerHTML = usuarios.slice(-10).reverse().map(u => {
        // Mapeamento flexível de colunas
        const login = u.Usuario || u.Login || "—";
        const email = u.Email || u.email || "—";
        const endereco = u.endereco || u.endereco || "—";
        return `
            <tr>
                <td>${login}</td>
                <td>${u.Nome || "—"}</td>
                <td>${email}</td>
                <td>${endereco}</td>
                <td>${u.Data_Cadastro || u.Data || "—"}</td>
            </tr>`;
    }).join("");

    // Debug Info
    registrarDebug(vendas, users, usuarios);
    document.getElementById("lastUpdate").textContent = `Sincronizado: ${new Date().toLocaleTimeString()}`;
}

function atualizarIndicadorConexao(status) {
    const ind = document.querySelector(".status-indicator");
    if (!ind) return;
    
    if (status === "online") ind.style.background = "#25d366";
    else if (status === "buscando") ind.style.background = "#ff9800";
    else ind.style.background = "#ff4444";
}

// 5. SISTEMA INTEGRADO DE DEBUG

function toggleDebugPanel() {
    const panel = document.getElementById("debugPanel");
    if (panel) panel.classList.toggle("active");
}

function registrarDebug(v, uLogin, uData) {
    const log = {
        endpoint: API_URL,
        vendas_count: v.length,
        users_auth_count: uLogin.length,
        usuarios_cad_count: uData.length,
        time: new Date().toISOString(),
        raw_preview: JSON.stringify(v[0] || {}).substring(0, 150)
    };
    
    const debugVendas = document.getElementById("debugVendas");
    const debugTime = document.getElementById("debugTime");
    
    if (debugVendas) debugVendas.textContent = JSON.stringify(log, null, 2);
    if (debugTime) debugTime.textContent = new Date().toLocaleString();
}

// 6. GESTÃO DE CATÁLOGO E UPLOAD PARA DRIVE

function configurarPrevisualizacaoImagens() {
    const input = document.getElementById("fotosProduto");
    const preview = document.getElementById("previewFotos");

    if (!input) return;

    input.addEventListener("change", function() {
        preview.innerHTML = "";
        const files = Array.from(this.files).slice(0, MAX_FOTOS);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.className = "img-preview-thumb"; // Use CSS externo para estilizar
                img.style.width = "70px"; 
                img.style.margin = "5px";
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}

async function adicionarProduto() {
    const btn = document.getElementById("btnCadastrar");
    const form = document.getElementById("formNovoProduto");
    const progress = document.getElementById("uploadProgress");

    const nome = document.getElementById("prodNome").value;
    const preco = document.getElementById("prodPreco").value;
    const descricao = document.getElementById("prodDesc").value;
    const categoria = document.getElementById("prodCat").value;
    const inputFotos = document.getElementById("fotosProduto");

    if (!nome || !preco) return alert("Nome e Preço são obrigatórios!");

    btn.disabled = true;
    btn.textContent = "Processando imagens...";
    if (progress) progress.style.width = "20%";

    try {
        const fotosBase64 = [];
        const files = Array.from(inputFotos.files).slice(0, 7);

        // Convertendo cada foto para texto (Base64)
        for (const file of files) {
            const base64 = await convertFileToBase64(file);
            fotosBase64.push(base64);
        }

        if (progress) progress.style.width = "50%";
        btn.textContent = "Salvando na Planilha...";

        // Payload ajustado para os cabeçalhos: ID, Nome, Preco, Imagem, Descricao, Estoque, Quantidade, Data, Categoria
const dadosParaEnviar = {
    aba: "Produtos",
    payload: {
        "ID": "PROD-" + Date.now(),
        "Nome": nome,
        "Preco": Number(preco), // Sem o 'ç' para bater com seu cabeçalho
        "Imagem": fotosBase64.join("|"), // No singular como na sua planilha
        "Descricao": descricao, // Sem o 'ã' para bater com seu cabeçalho
        "Estoque": 10,
        "Quantidade": 0,
        "Data": new Date().toLocaleDateString("pt-BR"),
        "Categoria": categoria
    }
};

        const res = await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", // Crucial para evitar erros de CORS ao enviar JSON volumoso
            body: JSON.stringify(dadosParaEnviar)
        });

        // Como usamos 'no-cors', não conseguimos ler o JSON de resposta, 
        // mas o dado chega lá. Vamos assumir sucesso e limpar após 2 seg.
        if (progress) progress.style.width = "100%";
        alert("Comando enviado! Verifique sua planilha em alguns segundos. 🌸");
        form.reset();
        document.getElementById("previewFotos").innerHTML = "";
        setTimeout(carregarDados, 3000);

    } catch (err) {
        console.error("Erro:", err);
        alert("Erro ao enviar: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Cadastrar Produto e Enviar Imagens";
    }
}

// Helper: Converte arquivo para string Base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// pop up admin sobre o rastreio
async function abrirPopUpRastreio(idPedido) {
    const codigo = prompt("Digite o código de rastreio:");
    if (!codigo) return; // Se cancelar ou vazio, não faz nada

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                acao: "adicionarRastreio",
                idPedido: idPedido,
                codigo: codigo.trim().toUpperCase()
            })
        });
        const data = await res.json();
        if (data.status === "sucesso") {
            alert("Rastreio salvo!");
            carregarVendas(); // Função que atualiza a tabela na tela
        }
    } catch (err) {
        alert("Erro ao salvar rastreio.");
    }
}
// 1. Função para enviar o novo horário para a planilha
async function liberarHorarioNoSite() {
    // 1. Definir os elementos do HTML
    const inputData = document.getElementById("adminDataAgenda");
    const inputHora = document.getElementById("adminHoraAgenda");
    const btn = document.getElementById("btnLiberar"); // Certifique-se que o ID no HTML é este

    // Validação inicial
    if (!inputData || !inputHora) {
        console.error("Inputs de agenda não encontrados no HTML!");
        alert("Erro técnico: Campos de entrada não encontrados.");
        return;
    }

    const valorDoInputData = inputData.value;
    const valorDoInputHora = inputHora.value;

    if (!valorDoInputData || !valorDoInputHora) {
        alert("Preencha Data e Hora! ⚠️");
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Liberando... ⏳";
        }

        const payload = {
            acao: "agendar", // Note: Se o seu GS usa "dinamica" para gravar novas linhas, mude aqui
            aba: "Agendamentos",
            payload: {
                "ID": "ID-" + Date.now(),
                "Data Registro": new Date().toLocaleDateString('pt-BR'),
                "Nome": "ADMIN", 
                "Servico": "Serviço Geral",
                "Profissional": "Equipe Cura & Cuidado",
                "Valor": "0.00",
                "DataAgenda": valorDoInputData,
                "Hour": valorDoInputHora,
                "Status": "Disponível",
                "Cliente": "",
                "Telefone": ""
            }
        };

        const resposta = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Como o Google Script costuma dar erro de CORS em POST, 
        // verificamos se ao menos a requisição foi enviada
        alert("Horário liberado com sucesso! 🌸");
        
        // Limpar campos
        inputData.value = "";
        inputHora.value = "";

    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro ao conectar com o sistema. ❌");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "🚀 Liberar Horário no Site";
        }
    }
}

// 2. Função para mostrar quem agendou
async function atualizarTabelaAgendamentos() {
    try {
        const response = await fetch(API_URL + "?acao=listarAgendamentos");
        const agendamentos = await response.json();
        const tbody = document.getElementById('tabelaAgendamentosConfirmados');
        
        // Filtra apenas horários que já foram ocupados por clientes
        const confirmados = agendamentos.filter(a => a.Status === "Ocupado");

        if (confirmados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center'>Nenhum agendamento confirmado.</td></tr>";
            return;
        }

        tbody.innerHTML = confirmados.map(a => `
            <tr>
                <td>${a.DataAgenda}</td>
                <td>${a.Hour}</td>
                <td>${a.Cliente || '---'}</td>
                <td>${a.Telefone || '---'}</td>
                <td><b style="color: #25d366;">Confirmado</b></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Erro agenda:", e);
    }
}
async function cancelarAgendamento(idAgendamento) {
    if (!confirm("Tem certeza que deseja cancelar este agendamento e liberar a vaga?")) return;

    const payload = {
        acao: "executarPlanilha",
        subAcao: "salvar",
        aba: "Agendamentos",
        id: String(idAgendamento), // Localiza a linha pelo ID
        payload: {
            "7": "",              // Limpa Coluna G (Data)
            "8": "",              // Limpa Coluna H (Hora)
            "9": "Disponível",    // Coluna I volta a ser Disponível
            "10": "",             // Limpa Coluna J (Cliente)
            "11": "",             // Limpa Coluna K (Telefone)
            "12": "Disponível"    // Coluna L volta a ser Disponível (Kill Switch resetado)
        }
    };

    try {
        await fetch(URL_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        alert("Agendamento cancelado e vaga liberada! 🔓");
        location.reload(); // Recarrega para atualizar a lista
    } catch (error) {
        alert("Erro ao tentar cancelar.");
    }
}