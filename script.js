// 0. INICIALIZAÇÃO E VARIÁVEIS GLOBAIS
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbyN0Uzj2HrDrP_oHM7RGsdXK_iJ54HnHIbdFJq3V9BMEj4wo6acRabBP9iB0J2gIivG/exec";
window.carrinho = JSON.parse(localStorage.getItem('cura_carrinho')) || [];
let descontoAtivo = 0;

// 1. NAVEGAÇÃO
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${pageId}`);
    
    if (targetPage) {
        targetPage.classList.add('active');
        console.log("Navegando para: " + pageId);
    } else {
        console.error("Página não encontrada: page-" + pageId);
    }
    toggleSidebar('menu-sidebar', false);
    window.scrollTo(0, 0);
}

function toggleSidebar(id, force) {
    const el = document.getElementById(id);
    if (!el) return;
    if (force !== undefined) force ? el.classList.add('active') : el.classList.remove('active');
    else el.classList.toggle('active');
}

//darkmode
function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    
    // Salva a preferência para não resetar ao mudar de página
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Atualiza o ícone do botão (opcional)
    const btn = document.getElementById('btn-dark-mode');
    if(btn) btn.innerText = isDark ? "☀️ Modo Claro" : "🌙 Modo Noturno";
}

// Adicione isso dentro do seu window.addEventListener('load', ...)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
} else {
    document.body.classList.remove('dark-mode');
}
// 2. CARREGAR VITRINE E SCROLL
async function carregarProdutos() {
    try {
        const res = await fetch(URL_PLANILHA + '?acao=listarProdutos');
        const produtos = await res.json();
        const vitrine = document.getElementById('vitrine-produtos');
        if (!vitrine) return;
        
        vitrine.innerHTML = produtos.map(p => {
            const precoExibicao = p.Valor || p.Preco || 0;
            // Transformamos o objeto em string para passar para o modal
            const pStatus = JSON.stringify(p).replace(/"/g, '&quot;');
            
            return `
            <div class="card-produto">
                <img src="${p.Imagem || 'https://via.placeholder.com/150'}" alt="Produto">
                <h3>${p.Nome}</h3>
                <p><strong>R$ ${Number(precoExibicao).toFixed(2)}</strong></p>
                <p><small>Estoque: ${p.Estoque || 0}</small></p>
                <input type="number" id="qtd-${p.Nome}" value="1" min="1" style="width:60px; margin-bottom: 5px;">
                
                <button class="btn-block" onclick="addCarrinho('${p.Nome}', ${precoExibicao}, ${p.Estoque})">Adicionar</button>
                <button class="btn-secondary" style="width:100%; margin-top:5px; font-size: 0.8em; padding: 8px;" 
                        onclick="abrirModalDetalhes('${p.Nome}', '${precoExibicao}', '${p.Descricao || 'Sem descrição disponível.'}', '${p.Imagem}', ${p.Estoque})">
                    Ver Detalhes
                </button>
            </div>
        `}).join('');
        console.log("Vitrine carregada com sucesso! 🌸");
    } catch (e) { 
        console.error("Erro ao carregar produtos:", e); 
        document.getElementById('vitrine-produtos').innerHTML = "<p>Erro ao conectar com a base de dados. Por favor, nos desculpe.</p>";
    }
}

function configurarScrollExtremidades() {
    const vitrine = document.querySelector('.vitrine-deslizante'); 
    if (!vitrine) return;
    let scrollInterval;
    const velocidade = 10;
    const margemAtivacao = 100;

    window.addEventListener('mousemove', (e) => {
        const larguraTela = window.innerWidth;
        const xMouse = e.clientX;
        clearInterval(scrollInterval);

        if (xMouse > larguraTela - margemAtivacao) {
            scrollInterval = setInterval(() => {
                vitrine.scrollLeft += velocidade;
            }, 10);
        } else if (xMouse < margemAtivacao) {
            scrollInterval = setInterval(() => {
                vitrine.scrollLeft -= velocidade;
            }, 10);
        }
    });
    window.addEventListener('mouseleave', () => clearInterval(scrollInterval));
    window.addEventListener('mousedown', () => clearInterval(scrollInterval));
}

// 3. CARRINHO
function addCarrinho(nome, valor, estoque) {
    const usuario = localStorage.getItem("usuarioLogado");
    if (!usuario) {
        if (confirm("Você precisa estar logada para adicionar itens. Login agora?")) window.location.href = "login.html";
        return;
    }
    if (estoque !== undefined && Number(estoque) <= 0) {
        alert("Poxa, o produto " + nome + " esgotou! 🌸");
        return;
    }

    const qtdInput = document.getElementById(`qtd-${nome}`);
    const qtdAdicionar = qtdInput ? parseInt(qtdInput.value) : 1;
    let itemExistente = window.carrinho.find(item => item.nome === nome);

    if (itemExistente) itemExistente.qtd += qtdAdicionar;
    else window.carrinho.push({ nome, valor: Number(valor), qtd: qtdAdicionar, estoqueAtual: estoque });

    salvarCarrinho();
    alert(`${qtdAdicionar}x ${nome} no carrinho! ✨`);
}

function salvarCarrinho() {
    localStorage.setItem('cura_carrinho', JSON.stringify(window.carrinho));
    renderCarrinho();
}

function renderCarrinho() {
    const list = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const totalValEl = document.getElementById('cart-total-val');
    const countEl = document.getElementById('cart-count');
    const deliverySelect = document.getElementById('cart-delivery');
    const barra = document.getElementById('frete-barra');
    const msgProgresso = document.getElementById('frete-msg-progresso');
    
    let freteOriginal = parseFloat(deliverySelect?.value || 0);
    let freteAplicado = freteOriginal;

    if(!list) return;

    if (!window.carrinho || window.carrinho.length === 0) {
        list.innerHTML = "<p style='color:#999; text-align:center; padding: 20px;'>Carrinho vazio... 🌸</p>";
        if(subtotalEl) subtotalEl.innerText = "0.00";
        if(totalValEl) totalValEl.innerText = "0.00";
        if(countEl) countEl.innerText = "0";
        if(barra) barra.style.width = "0%";
        return;
    }

    const subtotal = window.carrinho.reduce((acc, item) => acc + (item.valor * item.qtd), 0);
    const metaFrete = 150;

    if (barra && msgProgresso) {
        let porcentagem = (subtotal / metaFrete) * 100;
        barra.style.width = Math.min(porcentagem, 100) + "%";
        if (subtotal < metaFrete) {
            msgProgresso.innerHTML = `Faltam <strong>R$ ${(metaFrete - subtotal).toFixed(2)}</strong> para <strong>Frete Grátis!</strong> 🚚`;
        } else {
            msgProgresso.innerHTML = "✨ <strong>Parabéns!</strong> Você ganhou <strong>Frete Grátis!</strong>";
            freteAplicado = 0;
        }
    }

    list.innerHTML = window.carrinho.map((item, idx) => `
        <div class="item-carrinho" style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div><b>${item.qtd}x</b> ${item.nome}</div>
            <div>R$ ${(item.valor * item.qtd).toFixed(2)} <button onclick="removerItem(${idx})" style="color:red; background:none; border:none; cursor:pointer;">×</button></div>
        </div>
    `).join('');
        
    const valorDesconto = subtotal * descontoAtivo;
    const totalGeral = (subtotal - valorDesconto) + freteAplicado;

    if(subtotalEl) subtotalEl.innerText = subtotal.toFixed(2);
    if(totalValEl) totalValEl.innerText = totalGeral.toFixed(2);
    if(countEl) countEl.innerText = window.carrinho.reduce((acc, i) => acc + i.qtd, 0);
}

function removerItem(idx) { 
    window.carrinho.splice(idx, 1); 
    salvarCarrinho(); 
}

function aplicarCupom() {
    const cupomInput = document.getElementById('cart-coupon');
    const msg = document.getElementById('coupon-msg');
    const cupom = cupomInput ? cupomInput.value.toUpperCase() : "";
    
    // Lógica corrigida para não sobrepor valores
    if (cupom === "BEMVINDA5") descontoAtivo = 0.05;
    else if (cupom === "BEMVINDA10") descontoAtivo = 0.10;
    else if (cupom === "BEMVINDA15") descontoAtivo = 0.15;
    else descontoAtivo = 0;
    
    if(msg) {
        msg.innerText = descontoAtivo > 0 ? "Cupom aplicado! 🎉" : "Cupom inválido.";
        msg.style.color = descontoAtivo > 0 ? "green" : "red";
    }
    renderCarrinho();
}

// 4. FINALIZAÇÃO E ENVIO
async function finalizarPedidoPeloCarrinho() {
    const usuario = localStorage.getItem("usuarioLogado") || "Visitante";
    if (window.carrinho.length === 0) return alert("Carrinho vazio! 🛒");
    
    const dadosSalvos = JSON.parse(localStorage.getItem(`dados_entrega_${usuario}`)) || {};
    const whatsappFinal = document.getElementById('cart-whatsapp')?.value || dadosSalvos.whatsapp || "";
    
    if (!whatsappFinal) {
        alert("Por favor, preencha seu WhatsApp para o envio do pedido. 🌸");
        document.querySelector('.cart-contato-section')?.scrollIntoView();
        return;
    }

    const enderecoFormatado = dadosSalvos.rua 
        ? `${dadosSalvos.rua}, ${dadosSalvos.numero} - ${dadosSalvos.bairro}, ${dadosSalvos.cidade}. CEP: ${dadosSalvos.cep}`
        : "Retirada no local ou endereço a combinar.";

    const minhaChavePix = "85991561497"; 
    const confirmacaoPix = confirm("Confirmar pedido e copiar chave PIX?");
    if (confirmacaoPix) {
        navigator.clipboard.writeText(minhaChavePix);
        alert("Chave PIX copiada! 👍");
    } else { return; }

    const subtotal = window.carrinho.reduce((acc, item) => acc + (item.valor * item.qtd), 0);
    const freteFinal = subtotal >= 150 ? 0 : parseFloat(document.getElementById('cart-delivery')?.value || 0);
    const totalFinal = (subtotal - (subtotal * descontoAtivo)) + freteFinal;

    let mensagemZap = `*Novo Pedido - Espaço Cura e Cuidado* 🌸\n\n`;
    mensagemZap += `*Cliente:* ${usuario}\n`;
    mensagemZap += `*Itens:* ${window.carrinho.map(item => `${item.qtd}x ${item.nome}`).join(", ")}\n`;
    mensagemZap += `*Entrega:* ${enderecoFormatado}\n`;
    mensagemZap += `*Total:* R$ ${totalFinal.toFixed(2)}\n\n`;
    mensagemZap += `✅ *PIX Realizado. Seguindo para enviar o comprovante.*`;

    const dadosVenda = {
        "ID Pedido": "PED-" + Math.floor(Math.random() * 1000000),
        "Data": new Date().toLocaleString('pt-BR'),
        "Cliente": usuario,
        "Produto": window.carrinho.map(item => `${item.qtd}x ${item.nome}`).join(", "),
        "ValorTotal": totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        "Entrega": document.getElementById('cart-delivery').options[document.getElementById('cart-delivery').selectedIndex].text,
        "WhatsApp": whatsappFinal,
        "Status_Pagamento": "Aguardando Pagamento"
    };

    const areaBotao = document.getElementById('cart-items-list');
    areaBotao.innerHTML = `<p style="text-align:center;">Registrando seu pedido... ⏳</p>`;

    await enviarDinamico("Vendas", dadosVenda, "Pedido registrado com sucesso!");

    areaBotao.innerHTML = `
        <div style="text-align:center; padding:20px; border: 2px dashed #d4a373; border-radius: 15px;">
            <p>✅ <b>Pedido Gerado!</b></p>
            <a href="https://wa.me/5585991561497?text=${encodeURIComponent(mensagemZap)}" 
               target="_blank" class="btn-block" style="background:#25d366; color:white; text-decoration:none; display:block; padding:15px; border-radius:8px;">
                Enviar Comprovante via WhatsApp 📱
            </a>
        </div>
    `;
    
    window.carrinho = [];
    salvarCarrinho();
}

async function enviarDinamico(aba, payload, msgSucesso) {
    try {
        const res = await fetch(URL_PLANILHA, {
            method: 'POST',
            body: JSON.stringify({ aba, payload })
        });
        const r = await res.json();
        if(r.status === "sucesso") alert(msgSucesso);
    } catch(e) { 
        alert("Erro ao salvar dados, mas você pode seguir pelo WhatsApp."); 
    }
}

// 5. DIAGNÓSTICO
async function diagnostico() {
    alert("Testando conexão... 🌸");
    try {
        const res = await fetch(`${URL_PLANILHA}?acao=listarProdutos`);
        const data = await res.json();
        alert(data.length > 0 ? `✅ OK! ${data.length} produtos encontrados.` : "⚠️ Banco conectado, mas vazio.");
    } catch (e) { alert("❌ Erro de conexão com a API."); }
}

// 6. PERFIL E DADOS (PLANILHA + LOCAL)
async function carregarDadosPerfil() {
    const usuarioLogado = localStorage.getItem("usuarioLogado");
    if (!usuarioLogado) return;
    try {
        const res = await fetch(`${URL_PLANILHA}?acao=listarUsuarios`);
        const usuarios = await res.json();
        const dados = usuarios.find(u => 
            String(u.Usuario).toLowerCase() === usuarioLogado.toLowerCase() || 
            String(u.Nome).toLowerCase() === usuarioLogado.toLowerCase()
        );
        if (dados) preencherCamposPerfil(dados);
    } catch (e) { console.error("Erro ao ler dados do perfil:", e); }
}

async function carregarDadosDaPlanilha() {
    const usuarioLogado = localStorage.getItem("usuarioLogado");
    if (!usuarioLogado || usuarioLogado === "Visitante") return; // Filtro de segurança

    try {
        // O GS mapeia 'listarUsuarios' para a aba 'Users'
        const res = await fetch(`${URL_PLANILHA}?acao=listarUsuarios`);
        const usuarios = await res.json();

        // Procura você na lista vinda da aba 'Users'
        const dados = usuarios.find(u => 
            (u.Usuario && String(u.Usuario).toLowerCase() === usuarioLogado.toLowerCase()) ||
            (u.Nome && String(u.Nome).toLowerCase() === usuarioLogado.toLowerCase())
        );

        if (dados) {
            // Preenche os campos do seu HTML (IDs devem ser iguais aos do seu index.html)
            if(document.getElementById('perfil-nome')) document.getElementById('perfil-nome').value = dados.Nome || "";
            if(document.getElementById('perfil-email')) document.getElementById('perfil-email').value = dados.Email || "";
            if(document.getElementById('perfil-whatsapp')) document.getElementById('perfil-whatsapp').value = dados.WhatsApp || "";
            if(document.getElementById('perfil-rua')) document.getElementById('perfil-rua').value = dados.Rua || "";
            if(document.getElementById('perfil-numero')) document.getElementById('perfil-numero').value = dados["N°"] || "";
            if(document.getElementById('perfil-bairro')) document.getElementById('perfil-bairro').value = dados.Bairro || "";
            if(document.getElementById('perfil-cidade')) document.getElementById('perfil-cidade').value = dados.Cidade || "";
            if(document.getElementById('perfil-cep')) document.getElementById('perfil-cep').value = dados.CEP || "";
            
            console.log("Perfil carregado da aba 'Users'! ✨");
        }
    } catch (e) {
        console.error("Erro ao ler aba Users:", e);
    }
}

function preencherCamposPerfil(dados) {
    const mapeamento = {
        'perfil-nome': dados.Nome,
        'perfil-usuario': dados.Usuario,
        'perfil-email': dados.Email,
        'perfil-whatsapp': dados.WhatsApp || dados.Telefone || dados.Celular, // Aceita variações
        'perfil-rua': dados.Rua,
        'perfil-numero': dados["N°"] || dados.Numero,
        'perfil-bairro': dados.Bairro,
        'perfil-cidade': dados.Cidade,
        'perfil-estado': dados.Estado,
        'perfil-cep': dados.CEP
    };
    for (let id in mapeamento) {
        const el = document.getElementById(id);
        if (el) el.value = mapeamento[id] || "";
    }
}

async function atualizarDadosNaPlanilha() {
    const usuarioLogado = localStorage.getItem("usuarioLogado");
    if (!usuarioLogado) return alert("Erro: Usuário não identificado. 🌸");

    const btn = document.getElementById('btn-salvar-perfil');
    if(btn) { btn.innerText = "Salvando... ⏳"; btn.disabled = true; }

    // 1. Coletamos os dados dos campos do HTML
    const dadosPerfil = {
        "Nome": document.getElementById('perfil-nome').value,
        "Usuario": document.getElementById('perfil-usuario').value || usuarioLogado,
        "Email": document.getElementById('perfil-email').value,
        "WhatsApp": document.getElementById('perfil-whatsapp').value,
        "Rua": document.getElementById('perfil-rua').value,
        "N°": document.getElementById('perfil-numero').value,
        "Bairro": document.getElementById('perfil-bairro').value,
        "Cidade": document.getElementById('perfil-cidade').value,
        "Estado": document.getElementById('perfil-estado').value,
        "CEP": document.getElementById('perfil-cep').value
    };

    // 2. Salvamos no LocalStorage (para uso imediato no carrinho/frete)
    localStorage.setItem(`dados_entrega_${usuarioLogado}`, JSON.stringify({
        rua: dadosPerfil.Rua,
        numero: dadosPerfil["N°"],
        bairro: dadosPerfil.Bairro,
        cidade: dadosPerfil.Cidade,
        cep: dadosPerfil.CEP,
        whatsapp: dadosPerfil.WhatsApp
    }));

    try {
        // 3. Enviamos para a aba "Usuarios" via POST
        // O seu GS usa 'aba' para definir o destino e 'payload' para os dados
        const payloadFinal = {
            aba: "Usuarios", 
            payload: dadosPerfil
        };

        const res = await fetch(URL_PLANILHA, {
            method: 'POST',
            body: JSON.stringify(payloadFinal)
        });

        const r = await res.json();
        
        if (r.status === "sucesso") {
            if(btn) { btn.style.background = "#28a745"; btn.innerText = "Salvo na Planilha! ✅"; }
        } else {
            throw new Error(r.mensagem);
        }
    } catch (e) {
        console.error("Erro ao salvar:", e);
        if(btn) { btn.style.background = "#dc3545"; btn.innerText = "Erro ao salvar ❌"; }
    } finally {
        setTimeout(() => {
            if(btn) { btn.innerText = "Salvar Perfil"; btn.style.background = ""; btn.disabled = false; }
        }, 3000);
    }
}

// 7. LOGIN E LOGOUT
function deslogar() { 
    if (!confirm("Deseja realmente sair da sua conta? 🌸")) return;
    const keys = ["usuarioLogado", "cura_usuario", "tipoUsuario", "usuarioID", "cura_carrinho"];
    keys.forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dados_entrega_')) localStorage.removeItem(key);
    });
    window.location.href = "login.html"; 
}
function abrirModalDetalhes(nome, preco, descricao, imagem, estoque) {
    const modal = document.getElementById('modal-produto');
    if (!modal) return;

    document.getElementById('modal-nome').innerText = nome;
    document.getElementById('modal-preco').innerText = `R$ ${Number(preco).toFixed(2)}`;
    document.getElementById('modal-descricao').innerText = descricao;
    document.getElementById('modal-img-principal').src = imagem || 'https://via.placeholder.com/300';
    
    // Configura o botão de adicionar dentro do modal
    const btnAdd = document.getElementById('modal-btn-add');
    btnAdd.onclick = () => {
        const qtd = document.getElementById('modal-qtd').value;
        // Reutiliza sua função original de adicionar
        addCarrinho(nome, preco, estoque); 
        fecharModal();
    };

    modal.style.display = 'flex';
}

function fecharModal() {
    const modal = document.getElementById('modal-produto');
    if (modal) modal.style.display = 'none';
}

// 8. INICIALIZAÇÃO
window.addEventListener('load', () => {
    const usuario = localStorage.getItem("usuarioLogado");
    const areaUsuario = document.getElementById('area-usuario');
    const areaLogin = document.getElementById('area-login');
    const welcome = document.getElementById('welcome-user');

    if (usuario && usuario !== "null" && usuario !== "undefined") {
        if(welcome) welcome.innerText = "Olá, " + usuario.split(' ')[0];
        if(areaUsuario) areaUsuario.style.display = 'block';
        if(areaLogin) areaLogin.style.display = 'none';
        
        if(usuario.toLowerCase().includes('admin')) {
            const secaoAdmin = document.getElementById('secao-admin');
            if(secaoAdmin) secaoAdmin.style.display = 'block';
        }
        carregarDadosDaPlanilha(); 
    } else {
        if(areaUsuario) areaUsuario.style.display = 'none';
        if(areaLogin) areaLogin.style.display = 'block';
    }

    document.querySelectorAll('.sidebar').forEach(sidebar => {
        sidebar.addEventListener('mouseleave', () => sidebar.classList.remove('active'));
    });

    carregarProdutos().then(() => { configurarScrollExtremidades(); });
    renderCarrinho();   
});