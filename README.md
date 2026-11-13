# Portal CobraGentil

Área autenticada do comprador do CobraGentil, pronta para o projeto Supabase Free **`lexiocloiuwcrubrutiy`** (`https://lexiocloiuwcrubrutiy.supabase.co`) e um **Render Static Site** (custo fixo mensal zero; cobram-se apenas as taxas da Stripe por venda).

Este diretório é independente. O repositório ao vivo `/workspace/cobrag/` e a vitrine `cobragentil.onrender.com` **não foram alterados**.

## Regras de acesso (atualizadas em 13/11/2026, horário de Brasília, UTC-3)

1. Pagamento único de **R$ 49,00** pelo link Stripe oficial `https://buy.stripe.com/bJe4gBbpxfrw75zbQG9R600` (ou Checkout Session + webhook).
2. O aplicativo **não** fica nos arquivos estáticos públicos. Ele só é entregue pela Edge Function `portal-app`, depois de login (Supabase Auth) e de conferência no servidor de que a licença está `active`.
3. **Portão de 10 dias** (`zip_unlock_at = purchased_at + interval '10 days'`):
   - Do dia 0 ao instante anterior a `purchased_at + 10 days`: uso **somente** com login no portal; o botão de ZIP fica bloqueado e a função `portal-download` responde **HTTP 403**.
   - Reembolso (`charge.refunded` → `status = refunded`) ou contestação (`charge.dispute.created` → `status = revoked`) **cortam o acesso na hora** (app e ZIP).
   - A partir do 10º dia, com `status = active`: o portal libera o botão e `portal-download` entrega o pacote ZIP (`CobraGentil-v1.zip`).
4. Privacidade: páginas e funções **não** expõem CPF, CNPJ, endereço físico nem o e-mail pessoal `wptadvgo@gmail.com`. Rodapé e suporte usam apenas:
   - `Fornecedor responsável: Equipe Pronaos`
   - `contato.pronaos@gmail.com`

## Conteúdo

```
lib/                                regra de licença + handlers do webhook (testáveis)
supabase/migrations/001_portal_schema.sql
supabase/config.toml
supabase/functions/stripe-webhook/  verify_jwt = false; valida assinatura Stripe
supabase/functions/portal-status/   JWT + status, datas, days_remaining, can_download_zip
supabase/functions/portal-app/      JWT + status=active → HTML do app (asset privado)
supabase/functions/portal-download/ JWT + active + agora >= zip_unlock_at → ZIP
web/                                frontend estático (login, painel, runner, obrigado)
tests/test_portal.mjs               portão de 10 dias, estorno e varredura de PII
```

O HTML do app e o ZIP entram **somente** em `supabase/functions/*/assets/`, nunca em `web/`.

## Como ligar a um projeto Supabase Free novo

1. O projeto Free `lexiocloiuwcrubrutiy` já existe. Anote a **anon key** e a **service role key** no dashboard (Settings → API).
2. Rode a migration: `supabase db push` (ou cole `supabase/migrations/001_portal_schema.sql` no SQL Editor).
3. Authentication → URL Configuration: adicione a URL do portal Render em **Site URL** e **Redirect URLs** (ex.: `https://SEU-PORTAL.onrender.com` e `https://SEU-PORTAL.onrender.com/**`).
4. Habilite o provedor Email (magic link). No plano Free, configure SMTP próprio se o e-mail nativo estiver limitado. O webhook **não** usa `inviteUserByEmail` nem `generateLink` para disparar a mensagem: depois de provisionar o usuário, chama `POST /auth/v1/otp?redirect_to=...` (`create_user: false`), que envia o magic link tanto para comprador novo quanto para comprador recorrente.
5. Secrets das funções:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (geralmente já injetados)
   - `STRIPE_WEBHOOK_SECRET`
   - `PORTAL_URL` (URL pública do Static Site)
   - opcional: `COBRAG_ZIP_BUCKET` e `COBRAG_ZIP_PATH` para servir o ZIP pelo Storage
6. Publique as funções **todas** com `--no-verify-jwt` (`config.toml` já está com `verify_jwt = false`). O gateway JWT de projetos novos (chaves assimétricas ES256) pode rejeitar o token antes do handler; a validação fica em `_shared/auth.ts` via `supabase.auth.getUser(token)`.
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy portal-status --no-verify-jwt
   supabase functions deploy portal-app --no-verify-jwt
   supabase functions deploy portal-download --no-verify-jwt
   ```
7. No Stripe, cadastre o endpoint `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook` com os eventos `checkout.session.completed`, `charge.refunded` e `charge.dispute.created`. Grave o `whsec_...` no secret acima.
8. Quando for o corte, aponte o redirecionamento pós-pagamento do Payment Link para `https://cobragentil-portal.onrender.com/obrigado.html` (hoje a vitrine ao vivo ainda pode usar `/obrigado.html` com token imediato — a troca do Payment Link na Stripe é um passo separado e só deve ser feita depois da validação no ar).
9. `web/js/config.js` já aponta para `https://lexiocloiuwcrubrutiy.supabase.co`. Preencha só `SUPABASE_ANON_KEY` (nunca a service role).
10. Publique `web/` como Render Static Site (`render.yaml`). Depois rode `npm test` de novo se quiser repetir as asserções locais.

## Testes locais

```bash
cd /workspace/cobrag-portal
npm test
```

Não é necessário projeto Supabase nem chave Stripe para essa suíte: a regra dos 10 dias, a revogação e a varredura de PII rodam em processo.

## Fora deste lote

Nada foi enviado ao GitHub, ao Render ou ao Supabase de produção. O endpoint ao vivo `cobrag-entrega` (projeto `uldyifkurpemgdbfcsme`) permanece como está.
