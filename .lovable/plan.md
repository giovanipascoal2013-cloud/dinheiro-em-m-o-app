

## Plano: Migrar backend para Supabase próprio + preparar frontend para Vercel

### Visão geral

Hoje o projecto corre sobre **Lovable Cloud** (que internamente provisiona um projecto Supabase gerido pela Lovable: ref `cycbvqmngcrhzuvqyvkb`). Quer agora:

1. Mover todo o backend (DB + Auth + Storage + Edge Functions) para uma **conta Supabase própria**.
2. Hospedar o frontend no **Vercel**.

Importante: o que chamamos de "Lovable Cloud" **já é** Supabase por baixo. A migração consiste em recriar o mesmo schema, dados, funções e buckets num projecto Supabase que o utilizador controla, e depois apontar o frontend para esse novo projecto.

---

### Fase 1 — Criar e preparar o novo projecto Supabase (utilizador)

Passos manuais que só o utilizador pode executar (não tenho acesso à conta dele):

1. Criar conta em [supabase.com](https://supabase.com) (se ainda não tiver).
2. Criar **novo projecto** — escolher região próxima (ex: `eu-west-2` Londres, mais perto de Angola que a default).
3. Guardar:
   - `Project URL` (ex: `https://xxxx.supabase.co`)
   - `anon public key`
   - `service_role key` (secreto)
   - Password do Postgres
4. Em **Authentication → Providers**: activar Email (e Google se quiser manter login social no futuro).
5. Em **Authentication → URL Configuration**: adicionar os URLs do Vercel (ex: `https://dinheiroemmao.vercel.app`, `https://dinheiroemmao.com`) ao **Site URL** e **Redirect URLs**.

### Fase 2 — Exportar schema, dados e código do projecto actual

Eu trato disto a partir do projecto Lovable actual:

1. **Schema SQL completo** — gerar um único ficheiro `migrations/0001_initial_schema.sql` consolidando:
   - Enum `app_role`
   - Tabelas: `profiles`, `user_roles`, `zones`, `atms`, `agent_zones`, `agent_ratings`, `agent_activity_log`, `agent_onboarding_progress`, `subscriptions`, `transactions`, `withdrawals`, `referrals`, `notifications`, `platform_settings`
   - Todas as RLS policies já mapeadas no contexto
   - Funções: `has_role`, `handle_new_user`, `notify_user`, `notify_users_by_role`, `generate_referral_code`, `update_updated_at_column`, `approve_pending_atm`, `reject_pending_atm`
   - Trigger `on_auth_user_created` em `auth.users` → `handle_new_user`
   - Bucket de storage `atm-photos` + policies

2. **Dados existentes** — exportar via `pg_dump --data-only` (preview/staging primeiro, depois produção).

3. **Edge Functions** — copiar `supabase/functions/admin-reset-password`, `create-test-users`, `process-payment` para o novo projecto.

4. **Secrets das edge functions** — listar quais terão de ser recriados no novo projecto (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.).

### Fase 3 — Importar para o novo Supabase

Instruções passo-a-passo que vou gerar para o utilizador correr localmente (precisa do **Supabase CLI**):

```bash
# 1. Login
npx supabase login

# 2. Apontar a um novo projecto
npx supabase link --project-ref <NOVO_REF>

# 3. Aplicar schema
npx supabase db push   # usa as migrations do repo

# 4. Importar dados
psql "postgresql://postgres:<PASS>@db.<NOVO_REF>.supabase.co:5432/postgres" -f data_dump.sql

# 5. Deploy edge functions
npx supabase functions deploy process-payment
npx supabase functions deploy admin-reset-password
npx supabase functions deploy create-test-users

# 6. Definir secrets das edge functions
npx supabase secrets set LOVABLE_API_KEY=... (se ainda for usado)
```

Vou também documentar como recriar o bucket `atm-photos` (privado) caso o `db push` não cubra storage.

### Fase 4 — Adaptar o código do frontend

O cliente Supabase actual lê de `import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Não preciso reescrever `client.ts` — o ficheiro continua válido.

Mudanças no repo:

1. Criar **`.env.example`** documentando as 3 variáveis que o Vercel precisa.
2. Criar **`.env.local`** (gitignored) para o utilizador testar localmente apontado ao novo Supabase.
3. Adicionar **`vercel.json`** com SPA fallback para o React Router:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
4. Confirmar que `package.json` tem `"build": "vite build"` (já tem) e que Vercel detecta automaticamente Vite.
5. Remover referências hard-coded ao ref `cycbvqmngcrhzuvqyvkb` (busco e listo todas as ocorrências antes de mexer).

### Fase 5 — Deploy no Vercel (utilizador, com guia meu)

1. `vercel login` ou via dashboard → "Import Git Repository".
2. Framework preset: **Vite**.
3. Definir **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://<novo>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = anon key novo
   - `VITE_SUPABASE_PROJECT_ID` = `<novo-ref>`
4. Build command: `npm run build` (auto), Output: `dist`.
5. Após primeiro deploy: copiar URL do Vercel e voltar a Supabase → Auth → URL Configuration para adicionar à allowlist.
6. Configurar domínio personalizado `dinheiroemmao.com` no Vercel (alterar DNS).

### Fase 6 — Validação

Checklist que vou entregar:
- [ ] Login com email funciona
- [ ] Signup cria entrada em `profiles` e `user_roles` automaticamente (trigger)
- [ ] Onboarding de agente carrega e progride
- [ ] Upload de foto para `atm-photos` funciona
- [ ] Aprovação de ATM cria zona e linka agente
- [ ] Notificações em tempo real chegam
- [ ] Edge functions respondem (`process-payment`, `admin-reset-password`)

---

### Considerações importantes

- **Lovable Cloud vs Supabase próprio**: ao migrar, perde a integração nativa do editor Lovable com o backend (ex: o painel "Cloud" deixa de mostrar dados do projecto novo). O editor continua a funcionar para mexer no código frontend, mas qualquer alteração de schema terá de ser feita por si via Supabase Studio ou CLI — eu deixo de poder aplicar migrações automaticamente.
- **Dados em produção**: se já tem utilizadores/zonas/transacções reais em produção, o dump tem de ser feito no momento exacto do switch para minimizar perda. Posso preparar um runbook de cutover.
- **Auth users**: o `auth.users` do Supabase actual também tem de ser exportado — precisa de `pg_dump` específico do schema `auth`. O Supabase Dashboard tem ferramenta de migração assistida em **Project Settings → General → Migrate project** que facilita isto entre dois projectos Supabase.
- **`.gitignore`**: vou tirar `.env` do gitignore para que o `.env.example` (e opcionalmente um `.env.production` sem segredos) possa ser versionado. As chaves secretas continuam fora.
- **Lovable Cloud**: assim que confirmar que o novo Supabase está estável, pode desactivar Lovable Cloud em **Connectors → Lovable Cloud → Disable**. Não é reversível por versão antiga.

### O que vou entregar quando aprovar

1. `migrations/0001_initial_schema.sql` consolidado pronto para `supabase db push`.
2. Script `scripts/export-data.sh` para dump dos dados actuais.
3. `vercel.json` no repo.
4. `.env.example` documentado.
5. `docs/MIGRATION_GUIDE.md` com todos os comandos passo-a-passo (Supabase CLI + Vercel) em pt-AO.
6. Lista de hard-codes a alterar (se houver).

