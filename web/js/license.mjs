/**
 * CobraGentil Portal — license gate (10-day ZIP unlock).
 *
 * Rule (updated 13/11/2026, America/Sao_Paulo; licença v1.2):
 *   purchased_at = payment confirmation time (Stripe event.created; boleto: async_payment_succeeded)
 *   now <  purchased_at + 10 days  → authenticated portal use only; ZIP refused
 *   now >= purchased_at + 10 days  → ZIP download allowed if status === "active"
 *   status in {refunded, revoked}  → no app access and no ZIP, regardless of elapsed time
 */

export const ZIP_UNLOCK_DAYS = 10;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const ACTIVE = "active";
export const REFUNDED = "refunded";
export const REVOKED = "revoked";
export const ALLOWED_STATUSES = Object.freeze([ACTIVE, REFUNDED, REVOKED]);

export function toDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("data inválida");
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("data inválida");
  return d;
}

export function addDays(value, days) {
  return new Date(toDate(value).getTime() + days * MS_PER_DAY);
}

export function computeZipUnlockAt(purchasedAt) {
  return addDays(purchasedAt, ZIP_UNLOCK_DAYS);
}

/**
 * @param {{ status: string, purchased_at: string|Date, zip_unlock_at?: string|Date|null }} license
 * @param {Date|string} [now]
 */
export function evaluateLicense(license, now = new Date()) {
  if (!license || typeof license !== "object") {
    return {
      status: null,
      purchased_at: null,
      zip_unlock_at: null,
      days_remaining: null,
      can_use_app: false,
      can_download_zip: false,
      reason: "license_missing",
    };
  }

  const status = license.status || null;
  const isActive = status === ACTIVE;
  const purchasedAt = license.purchased_at ? toDate(license.purchased_at) : null;
  const unlockAt = license.zip_unlock_at
    ? toDate(license.zip_unlock_at)
    : purchasedAt
      ? computeZipUnlockAt(purchasedAt)
      : null;
  const current = toDate(now);

  if (!purchasedAt || !unlockAt) {
    return {
      status,
      purchased_at: purchasedAt ? purchasedAt.toISOString() : null,
      zip_unlock_at: unlockAt ? unlockAt.toISOString() : null,
      days_remaining: null,
      can_use_app: false,
      can_download_zip: false,
      reason: "license_incomplete",
    };
  }

  const msLeft = unlockAt.getTime() - current.getTime();
  const unlocked = msLeft <= 0;
  const daysRemaining = unlocked ? 0 : Math.ceil(msLeft / MS_PER_DAY);

  let reason = "ok";
  if (!isActive) {
    reason = status === REFUNDED ? "refunded" : status === REVOKED ? "revoked" : "inactive";
  } else if (!unlocked) {
    reason = "zip_locked_until_day_10";
  }

  return {
    status,
    purchased_at: purchasedAt.toISOString(),
    zip_unlock_at: unlockAt.toISOString(),
    days_remaining: daysRemaining,
    can_use_app: isActive,
    can_download_zip: isActive && unlocked,
    reason,
  };
}

/**
 * Pick the most useful license for a buyer who may have more than one row.
 * Prefer an active license that already unlocks the ZIP; otherwise the newest active;
 * otherwise the newest row (to surface refunded/revoked state).
 */
export function selectPrimaryLicense(licenses) {
  const rows = Array.isArray(licenses) ? licenses.filter(Boolean) : [];
  if (rows.length === 0) return null;

  const byPurchaseDesc = (a, b) => toDate(b.purchased_at) - toDate(a.purchased_at);
  const active = rows.filter((r) => r.status === ACTIVE).sort(byPurchaseDesc);
  const unlockedActive = active.filter((r) => {
    const ev = evaluateLicense(r);
    return ev.can_download_zip;
  });
  if (unlockedActive.length) return unlockedActive[0];
  if (active.length) return active[0];
  return [...rows].sort(byPurchaseDesc)[0];
}

export function assertCanUseApp(evaluation) {
  if (!evaluation?.can_use_app) {
    const err = new Error("Acesso ao aplicativo indisponível para esta licença.");
    err.status = 403;
    err.code = "app_forbidden";
    err.reason = evaluation?.reason || "forbidden";
    throw err;
  }
}

export function assertCanDownloadZip(evaluation) {
  if (!evaluation?.can_download_zip) {
    const locked = evaluation?.reason === "zip_locked_until_day_10";
    const err = new Error(
      locked
        ? "A cópia offline em ZIP é liberada apenas a partir do 10º dia após a confirmação do pagamento, se a compra continuar ativa."
        : "Download do pacote ZIP indisponível para esta licença.",
    );
    err.status = 403;
    err.code = locked ? "zip_locked" : "zip_forbidden";
    err.reason = evaluation?.reason || "forbidden";
    err.zip_unlock_at = evaluation?.zip_unlock_at || null;
    err.days_remaining = evaluation?.days_remaining ?? null;
    throw err;
  }
}
