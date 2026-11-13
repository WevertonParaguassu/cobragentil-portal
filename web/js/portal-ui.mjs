import { evaluateLicense } from "./license.mjs";

export const SUPPORT_EMAIL = "contato.pronaos@gmail.com";
export const SUPPLIER_LINE = "Fornecedor responsável: Equipe Pronaos";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateTimePt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function statusLabel(status) {
  if (status === "active") return "Ativa";
  if (status === "refunded") return "Reembolsada";
  if (status === "revoked") return "Revogada";
  return "Sem licença";
}

/**
 * Pure view-model for the authenticated dashboard (also used by tests).
 */
export function dashboardModel(statusPayload, now = new Date()) {
  const ev = evaluateLicense(
    statusPayload?.has_license
      ? {
          status: statusPayload.status,
          purchased_at: statusPayload.purchased_at,
          zip_unlock_at: statusPayload.zip_unlock_at,
        }
      : statusPayload?.status
        ? statusPayload
        : null,
    now,
  );

  const canUse = Boolean(ev.can_use_app);
  const canZip = Boolean(ev.can_download_zip);
  const lockedZip = canUse && !canZip;
  const revoked = ev.status === "refunded" || ev.status === "revoked";

  let countdownText = "";
  if (lockedZip) {
    const days = ev.days_remaining;
    countdownText =
      days === 1
        ? "Falta 1 dia para o download do pacote ZIP ser liberado."
        : `Faltam ${days} dias para o download do pacote ZIP ser liberado.`;
  } else if (canZip) {
    countdownText = "O período de 10 dias foi concluído. O download do pacote ZIP está liberado.";
  } else if (revoked) {
    countdownText =
      ev.status === "refunded"
        ? "Esta licença foi encerrada por reembolso. O acesso ao aplicativo e o download foram bloqueados."
        : "Esta licença foi encerrada por contestação. O acesso ao aplicativo e o download foram bloqueados.";
  } else {
    countdownText = "Não encontramos uma licença ativa vinculada a este login.";
  }

  return {
    status: ev.status,
    status_label: statusLabel(ev.status),
    purchased_at: ev.purchased_at,
    zip_unlock_at: ev.zip_unlock_at,
    days_remaining: ev.days_remaining,
    can_use_app: canUse,
    can_download_zip: canZip,
    show_open_app: canUse,
    show_zip_button: canZip,
    zip_locked: lockedZip,
    revoked,
    countdown_text: countdownText,
    support_email: SUPPORT_EMAIL,
    supplier_line: SUPPLIER_LINE,
  };
}

export function renderDashboardHtml(model) {
  const badgeClass =
    model.status === "active" ? "ok" : model.revoked ? "alerta" : "neutro";
  const zipBlock = model.show_zip_button
    ? `<button type="button" id="btn-download-zip" class="cta escuro" data-zip="unlocked">Baixar pacote ZIP (CobraGentil-v1.zip)</button>
       <p class="cta-nota">O arquivo contém o aplicativo HTML offline, o manual, os modelos de WhatsApp e os termos.</p>`
    : model.zip_locked
      ? `<button type="button" id="btn-download-zip" class="cta escuro" data-zip="locked" disabled aria-disabled="true">Download do ZIP bloqueado até o 10º dia</button>
         <p class="cta-nota">${escapeHtml(model.countdown_text)} Liberação prevista em ${escapeHtml(formatDateTimePt(model.zip_unlock_at))} (horário de Brasília).</p>`
      : `<p class="cta-nota">O botão de download do ZIP permanece oculto enquanto a licença não estiver ativa e com 10 dias concluídos.</p>`;

  const appBlock = model.show_open_app
    ? `<button type="button" id="btn-abrir-app" class="cta">Abrir CobraGentil no portal</button>`
    : `<p class="aviso">O aplicativo não está disponível para esta conta no momento.</p>`;

  return `
    <section class="caixa" id="painel-licenca">
      <span class="badge ${badgeClass}">Licença: ${escapeHtml(model.status_label)}</span>
      <h2>Seu acesso ao CobraGentil</h2>
      <ul class="meta-lista">
        <li><strong>Compra confirmada em:</strong> ${escapeHtml(formatDateTimePt(model.purchased_at))} (horário de Brasília)</li>
        <li><strong>Download do ZIP a partir de:</strong> ${escapeHtml(formatDateTimePt(model.zip_unlock_at))} (horário de Brasília)</li>
        <li><strong>Dias restantes para o ZIP:</strong> ${model.days_remaining == null ? "—" : escapeHtml(model.days_remaining)}</li>
      </ul>
      <p>${escapeHtml(model.countdown_text)}</p>
      <p>Nos primeiros 10 dias após a compra, o uso é feito somente com login neste portal. O pacote ZIP para uso offline é liberado a partir do 10º dia, se a compra permanecer ativa (sem estorno ou contestação). Em caso de reembolso, o acesso é encerrado automaticamente.</p>
      <div class="acoes">${appBlock}${zipBlock}</div>
    </section>`;
}

export function renderFooterHtml() {
  return `<p><b>${escapeHtml(SUPPLIER_LINE)}</b></p>
    <p><b>Canal eletrônico oficial / suporte:</b> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`;
}
