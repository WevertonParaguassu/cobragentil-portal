/* Project URL is the Free project lexiocloiuwcrubrutiy.
   Fill SUPABASE_ANON_KEY before going live. Never put the service role key here. */
window.COBRAG_PORTAL = Object.assign(
  {
    SUPABASE_URL: "https://lexiocloiuwcrubrutiy.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxleGlvY2xvaXV3Y3J1YnJ1dGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1ODIzMzAsImV4cCI6MjExMDE1ODMzMH0.ISs36cxPbdfp8PJGhxAOC7vuuQH_uHBhLUJLFb_OhFQ",
    STRIPE_PAYMENT_LINK: "https://buy.stripe.com/bJe4gBbpxfrw75zbQG9R600",
    SUPPORT_EMAIL: "contato.pronaos@gmail.com",
    SUPPLIER_LINE: "Fornecedor responsável: Equipe Pronaos",
  },
  window.COBRAG_PORTAL || {},
);
window.COBRAG_PORTAL.FUNCTIONS_URL =
  window.COBRAG_PORTAL.FUNCTIONS_URL ||
  String(window.COBRAG_PORTAL.SUPABASE_URL || "").replace(/\/$/, "") + "/functions/v1";
