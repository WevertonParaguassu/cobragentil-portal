/* PRONAOS · formas extras de pagamento (Efí Pix com QR na tela e Mercado Pago cartão/Pix), ao lado da Stripe. t2184u, 24/11/2026.
   Uso: <div class="pg-alt" data-produto="<slug>" data-preco="R$ 29"></div> e <div class="pg-status"></div> nas páginas de obrigado.
   Nenhum segredo aqui: só chama a função pública pagamentos-checkout, que tem o preço e as credenciais no servidor. */
(function () {
  "use strict";
  var API = "https://lexiocloiuwcrubrutiy.supabase.co/functions/v1/pagamentos-checkout";
  var CSS = ".pg-alt{margin:14px 0 4px;padding:14px 16px;border:1px dashed currentColor;border-radius:14px;max-width:560px;font-size:.95rem}" +
    ".pg-alt b.t{display:block;margin-bottom:6px}.pg-alt label{display:block;font-size:.85rem;margin:6px 0 4px;opacity:.9}" +
    ".pg-alt input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #9aa5b1;font-size:1rem;color:#1f2933;background:#fff}" +
    ".pg-alt .bt{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.pg-alt button{cursor:pointer;border:0;border-radius:999px;padding:11px 18px;font-weight:700;font-size:.95rem;font-family:inherit}" +
    ".pg-alt .efi{background:#0f766e;color:#fff}.pg-alt .mp{background:#009ee3;color:#fff}.pg-alt small{display:block;margin-top:8px;opacity:.85}" +
    ".pg-alt .msg{margin-top:8px;font-weight:600}.pg-modal{position:fixed;inset:0;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}" +
    ".pg-box{background:#fff;color:#1f2933;border-radius:16px;max-width:420px;width:100%;padding:20px;text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
    ".pg-box img{width:240px;height:240px;max-width:80vw;max-height:80vw}.pg-box textarea{width:100%;box-sizing:border-box;height:74px;font-size:.78rem;border-radius:8px;border:1px solid #cbd2d9;padding:6px}" +
    ".pg-box button{cursor:pointer;border:0;border-radius:999px;padding:10px 16px;font-weight:700;margin:6px 4px 0;background:#0f766e;color:#fff}.pg-box button.sec{background:#e4e7eb;color:#1f2933}" +
    ".pg-box .st{margin-top:10px;font-weight:600}";
  function css() { if (document.getElementById("pg-alt-css")) return; var s = document.createElement("style"); s.id = "pg-alt-css"; s.textContent = CSS; document.head.appendChild(s); }
  function el(t, a, txt) { var e = document.createElement(t); for (var k in (a || {})) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; return e; }
  function brl(c) { return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  var ERROS = { email: "Confira o e-mail.", desligado: "Esta forma de pagamento está temporariamente indisponível. Use o botão da Stripe.", muitos_pedidos: "Muitos pedidos seguidos com este e-mail. Tente de novo em 1 hora." };
  function post(body) {
    return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(ERROS[j.erro] || "Não foi possível iniciar o pagamento agora. Tente de novo ou use a Stripe."); return j; }); });
  }
  function status(pedido) { return fetch(API + "?pedido=" + encodeURIComponent(pedido)).then(function (r) { return r.json(); }); }
  function modalPix(j, email) {
    var m = el("div", { "class": "pg-modal", role: "dialog", "aria-modal": "true", "aria-label": "Pagar com Pix" }), b = el("div", { "class": "pg-box" });
    b.appendChild(el("h3", { style: "margin:0 0 6px" }, "Pague " + brl(j.valor_centavos) + " com Pix"));
    b.appendChild(el("p", { style: "margin:0 0 8px;font-size:.9rem" }, "Abra o app do seu banco, escolha Pix › Ler QR code. Recebedor: Efí (Pronaos). Vale por 1 hora."));
    b.appendChild(el("img", { src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(j.qr_svg), alt: "QR code Pix de " + brl(j.valor_centavos) }));
    var ta = el("textarea", { readonly: "", "aria-label": "Pix copia e cola" }); ta.value = j.copia_e_cola; b.appendChild(ta);
    var cp = el("button", { type: "button" }, "Copiar código Pix"); cp.onclick = function () { ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (e) { document.execCommand("copy"); } cp.textContent = "Copiado"; }; b.appendChild(cp);
    var fx = el("button", { type: "button", "class": "sec" }, "Fechar"); b.appendChild(fx);
    var st = el("p", { "class": "st", "aria-live": "polite" }, "Aguardando o Pix…"); b.appendChild(st);
    m.appendChild(b); document.body.appendChild(m);
    var n = 0, i = setInterval(function () {
      n++; status(j.pedido).then(function (s) {
        if (s.status === "pago") { clearInterval(i); st.textContent = "Pagamento confirmado! O link de acesso foi enviado para " + email + "."; cp.style.display = "none"; }
      }).catch(function () {}); if (n > 160) clearInterval(i);
    }, 5000);
    fx.onclick = function () { clearInterval(i); m.remove(); };
  }
  function montar(box) {
    if (box.dataset.ok) return; box.dataset.ok = "1";
    var prod = box.getAttribute("data-produto"), preco = box.getAttribute("data-preco") || "";
    box.appendChild(el("b", { "class": "t" }, "Prefere Pix com QR na tela ou Mercado Pago?"));
    var id = "pg-email-" + prod + "-" + Math.random().toString(36).slice(2, 7);
    box.appendChild(el("label", { "for": id }, "E-mail para receber o acesso"));
    var inp = el("input", { id: id, type: "email", autocomplete: "email", inputmode: "email", placeholder: "voce@exemplo.com", required: "" }); box.appendChild(inp);
    var bt = el("div", { "class": "bt" });
    var be = el("button", { type: "button", "class": "efi" }, "Pix com QR na tela" + (preco ? " · " + preco : ""));
    var bm = el("button", { type: "button", "class": "mp" }, "Mercado Pago (cartão ou Pix)");
    bt.appendChild(be); bt.appendChild(bm); box.appendChild(bt);
    var msg = el("p", { "class": "msg", "aria-live": "polite" }); box.appendChild(msg);
    box.appendChild(el("small", null, "Mesmo preço, pagamento único. A liberação é automática quando o pagamento é confirmado, com as mesmas regras dos termos (10 dias para o ZIP, 7 dias para desistir)."));
    function ir(prov) {
      var email = (inp.value || "").trim();
      if (!inp.checkValidity() || !email) { msg.textContent = "Informe um e-mail válido para receber o acesso."; inp.focus(); return; }
      msg.textContent = "Gerando o pagamento…"; be.disabled = bm.disabled = true;
      post({ produto: prod, provedor: prov, email: email, origem: location.hostname + location.pathname }).then(function (j) {
        if (prov === "mp") { msg.textContent = "Abrindo o Mercado Pago…"; location.href = j.url; return; }
        msg.textContent = ""; modalPix(j, email);
      }).catch(function (e) { msg.textContent = e.message; }).then(function () { be.disabled = bm.disabled = false; });
    }
    be.onclick = function () { ir("efi"); }; bm.onclick = function () { ir("mp"); };
  }
  function obrigado(box) {
    var p = new URLSearchParams(location.search).get("pedido"); if (!p || !/^pn[a-f0-9]{24}$/.test(p)) return;
    box.setAttribute("aria-live", "polite"); box.textContent = "Conferindo o pagamento…";
    var n = 0, t = function () {
      status(p).then(function (s) {
        if (s.status === "pago") { box.textContent = "Pagamento confirmado. O link de acesso foi enviado para o e-mail informado."; return; }
        box.textContent = s.status === "aberto" ? "Aguardando a confirmação do pagamento (Pix ou cartão). Esta página atualiza sozinha." : "Situação do pedido: " + s.status + ". Dúvidas: contato.pronaos@gmail.com.";
        if (++n < 60 && s.status === "aberto") setTimeout(t, 5000);
      }).catch(function () { if (++n < 60) setTimeout(t, 5000); });
    }; t();
  }
  function init() { css(); [].forEach.call(document.querySelectorAll(".pg-alt[data-produto]"), montar); [].forEach.call(document.querySelectorAll(".pg-status"), obrigado); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
