import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm";
import { dashboardModel, renderDashboardHtml, renderFooterHtml, SUPPORT_EMAIL } from "./portal-ui.mjs";

const cfg = window.COBRAG_PORTAL || {};
const footer = document.getElementById("rodape-oficial");
if (footer) footer.innerHTML = renderFooterHtml();

function configured() {
  return cfg.SUPABASE_URL && !String(cfg.SUPABASE_URL).includes("YOUR_PROJECT_REF") && cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_ANON_KEY).includes("YOUR_SUPABASE_ANON_KEY");
}

const supabase = configured()
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const els = {
  login: document.getElementById("view-login"),
  painel: document.getElementById("view-painel"),
  app: document.getElementById("view-app"),
  loginForm: document.getElementById("form-login"),
  email: document.getElementById("email-login"),
  loginMsg: document.getElementById("login-msg"),
  painelMount: document.getElementById("painel-mount"),
  painelMsg: document.getElementById("painel-msg"),
  who: document.getElementById("quem-logado"),
  buyLink: document.getElementById("link-comprar"),
  frame: document.getElementById("app-frame"),
};

if (els.buyLink && cfg.STRIPE_PAYMENT_LINK) {
  els.buyLink.href = cfg.STRIPE_PAYMENT_LINK;
}

function show(view) {
  for (const key of ["login", "painel", "app"]) {
    if (els[key]) els[key].classList.toggle("oculto", key !== view);
  }
}

function setMsg(node, text, kind) {
  if (!node) return;
  node.className = kind || "";
  node.hidden = !text;
  node.textContent = text || "";
}

async function functionsFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const res = await fetch(`${cfg.FUNCTIONS_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: cfg.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function loadStatus() {
  const res = await functionsFetch("portal-status");
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || "Não foi possível ler o status da licença.");
  return payload;
}

async function renderPainel() {
  show("painel");
  const { data } = await supabase.auth.getSession();
  const email = data?.session?.user?.email || "";
  if (els.who) els.who.textContent = email ? `Conectado como ${email}` : "";
  setMsg(els.painelMsg, "Carregando sua licença…", "cta-nota");
  try {
    const status = await loadStatus();
    const model = dashboardModel(status);
    els.painelMount.innerHTML = renderDashboardHtml(model);
    setMsg(els.painelMsg, "", "");
    const openBtn = document.getElementById("btn-abrir-app");
    if (openBtn) openBtn.addEventListener("click", openApp);
    const zipBtn = document.getElementById("btn-download-zip");
    if (zipBtn && zipBtn.dataset.zip === "unlocked") {
      zipBtn.addEventListener("click", downloadZip);
    }
  } catch (err) {
    els.painelMount.innerHTML = "";
    setMsg(els.painelMsg, err.message || "Erro ao carregar o painel.", "erro");
  }
}

async function openApp() {
  setMsg(els.painelMsg, "Carregando o CobraGentil…", "cta-nota");
  const res = await functionsFetch("portal-app");
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    setMsg(els.painelMsg, payload.error || "Não foi possível abrir o aplicativo.", "erro");
    return;
  }
  const html = payload.html;
  if (!html) {
    setMsg(els.painelMsg, "Resposta do aplicativo inválida.", "erro");
    return;
  }
  show("app");
  if (els.frame) {
    els.frame.srcdoc = html;
  }
  setMsg(els.painelMsg, "", "");
}

async function downloadZip() {
  setMsg(els.painelMsg, "Preparando o download…", "cta-nota");
  const res = await functionsFetch("portal-download");
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    setMsg(els.painelMsg, payload.error || "Download recusado.", "erro");
    await renderPainel();
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CobraGentil-v1.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setMsg(els.painelMsg, "Download iniciado.", "okmsg");
}

async function handleLogin(event) {
  event.preventDefault();
  if (!supabase) {
    setMsg(els.loginMsg, "Portal ainda não conectado ao projeto Supabase. Preencha web/js/config.js.", "erro");
    return;
  }
  const email = (els.email?.value || "").trim();
  if (!email) {
    setMsg(els.loginMsg, "Informe o e-mail usado na compra.", "erro");
    return;
  }
  setMsg(els.loginMsg, "Enviando o link de acesso…", "cta-nota");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: false },
  });
  if (error) {
    setMsg(els.loginMsg, "Não foi possível enviar o link. Confira o e-mail da compra ou escreva para " + SUPPORT_EMAIL + ".", "erro");
    return;
  }
  setMsg(els.loginMsg, "Se este e-mail tiver uma compra, você receberá um link de acesso. Verifique também a caixa de spam.", "okmsg");
}

async function logout() {
  if (supabase) await supabase.auth.signOut();
  if (els.frame) els.frame.srcdoc = "";
  show("login");
}

function bind() {
  if (els.loginForm) els.loginForm.addEventListener("submit", handleLogin);
  document.getElementById("btn-sair")?.addEventListener("click", logout);
  document.getElementById("btn-sair-app")?.addEventListener("click", () => {
    if (els.frame) els.frame.srcdoc = "";
    renderPainel();
  });
  document.getElementById("btn-voltar-painel")?.addEventListener("click", () => {
    if (els.frame) els.frame.srcdoc = "";
    renderPainel();
  });
}

async function boot() {
  bind();
  if (!supabase) {
    show("login");
    setMsg(els.loginMsg, "Configure SUPABASE_URL e SUPABASE_ANON_KEY em web/js/config.js para ativar o login.", "aviso");
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data?.session) await renderPainel();
  else show("login");
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
      if (els.painel.classList.contains("oculto") && els.app.classList.contains("oculto")) {
        renderPainel();
      } else if (event === "SIGNED_IN") {
        renderPainel();
      }
    }
    if (event === "SIGNED_OUT") show("login");
  });
}

boot();
