// js/cart.js


// 1. GERENCIAMENTO DO MENU
window.atualizarContadorMenu = function () {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const badge = document.getElementById("cart-count");
  if (badge) {
    badge.innerText = carrinho.length;
    badge.style.display = carrinho.length > 0 ? "inline-block" : "none";
  }
};

// 2. ADICIONAR AO CARRINHO
window.adicionarAoCarrinho = function (id, nome, valor, estoque) {
  if (estoque !== undefined && Number(estoque) <= 0) {
    alert("Poxa, o produto " + nome + " esgotou no momento! 🌸");
    return;
  }

  const usuario = localStorage.getItem("usuarioLogado") || sessionStorage.getItem("usuarioLogado");

  if (!usuario) {
    if (confirm("Você precisa estar logada para adicionar itens. Fazer login agora?")) {
      sessionStorage.setItem("pendingAdd", JSON.stringify({ id, nome, valor, estoque }));
      window.location.href = "login.html";
    }
    return;
  }

  let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  carrinho.push({ id, nome, valor: Number(valor) });
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarContadorMenu();
  alert(nome + " adicionado! ✨");
};

// 3. CONTROLE DO MODAL
window.abrirCarrinho = function () {
  const modal = document.getElementById("modalCarrinho");
  if (modal) {
    modal.style.display = "block";
    renderizarItensCarrinho();
  }
};

window.fecharCarrinho = function () {
  const modal = document.getElementById("modalCarrinho");
  if (modal) modal.style.display = "none";
};

// 4. EXIBIÇÃO DOS ITENS
window.renderizarItensCarrinho = function () {
  const lista = document.getElementById("cart-items-list");
  const totalSpan = document.getElementById("cart-total-val");
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  if (!lista) return;
  if (carrinho.length === 0) {
    lista.innerHTML = "<p style='color:#999; text-align:center;'>Carrinho vazio... 🌸</p>";
    totalSpan.innerText = "0.00";
    return;
  }

  let total = 0;
  lista.innerHTML = carrinho.map(item => {
    total += Number(item.valor);
    return `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.9rem; border-bottom:1px solid #f9f9f9; padding-bottom:5px;">
          <span>${item.nome}</span>
          <strong>R$ ${Number(item.valor).toFixed(2)}</strong>
      </div>`;
  }).join("");

  if (totalSpan) totalSpan.innerText = total.toFixed(2);
};

// 5. LIMPAR CARRINHO (Unificado)
window.limparCarrinho = window.cancelarTudo = function () {
    if (confirm("Deseja mesmo limpar o seu carrinho? 🌸")) {
        // 1. Limpa o banco de dados do navegador
        localStorage.removeItem("carrinho");

        // 2. Limpa a variável na memória
        if (typeof carrinho !== 'undefined') {
            carrinho = [];
        }

        // 3. Atualiza a interface (usando suas funções existentes)
        if (typeof atualizarContadorMenu === "function") atualizarContadorMenu();
        if (typeof renderizarItensCarrinho === "function") renderizarItensCarrinho();
        
        console.log("Carrinho esvaziado com sucesso!");
    }
};

// 6. FINALIZAR PEDIDO (AGRUPADO)
window.finalizarPedidoPeloCarrinho = async function () {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  const usuario = localStorage.getItem("usuarioLogado") || sessionStorage.getItem("usuarioLogado");

  if (!usuario) {
    alert("Por favor, faça login. 🌸");
    window.location.href = "login.html";
    return;
  }

  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio! 🛒");
    return;
  }

  if (!confirm("Confirmar pedido e enviar para a planilha?")) return;

  const btn = document.querySelector(".cart-primary");
  if (btn) {
    btn.innerText = "Salvando pedido... ⏳";
    btn.disabled = true;
  }

  try {
    // --- LÓGICA DE AGRUPAMENTO ---
    const nomesAgrupados = carrinho.map(item => item.nome).join(", ");
    const valorTotal = carrinho.reduce((acc, item) => acc + Number(item.valor), 0);

    // Envio ÚNICO para a planilha
    const response = await fetch(urlPlanilha, {
      method: "POST",
      body: JSON.stringify({
        acao: "criarVenda",
        nomeCliente: usuario,
        produto: nomesAgrupados,
        valor: valorTotal,
        whatsapp: ""
      }),
    });

    const result = await response.json();

    if (result.status === "sucesso") {
      alert("Pedido registrado com sucesso! ✨");
      localStorage.removeItem("carrinho"); renderizarItensCarrinho();
      atualizarContadorMenu();
      window.location.href = "carrinho.html";
    } else {
      alert("Erro ao salvar: " + result.mensagem);
    }
  } catch (err) {
    alert("Erro ao conectar com o servidor.");
    console.error(err);
  } finally {
    if (btn) {
      btn.innerText = "Finalizar Pedido ✅";
      btn.disabled = false;
    }
  }
};

// 7. INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", atualizarContadorMenu);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") fecharCarrinho(); });