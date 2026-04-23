# Guia de Migração — Lovable Cloud → Supabase Próprio + Vercel

Este guia cobre a migração completa do backend (DB, Auth, Storage e Edge Functions) deste projecto da **Lovable Cloud** para uma conta **Supabase** sua, e o deploy do frontend no **Vercel**.

> Importante: Lovable Cloud é Supabase por baixo. O processo consiste em recriar o mesmo schema e dados num projecto Supabase que você controla, e depois apontar o frontend para esse projecto.

---

## Pré-requisitos

- Conta em [supabase.com](https://supabase.com) e em [vercel.com](https://vercel.com)
- Repositório Git ligado ao projecto Lovable (GitHub)
- Localmente instalado:
  - [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` ou `brew install supabase/tap/supabase`)
  - `psql` (PostgreSQL client) — vem com `postgresql-client`
  - Node 18+

---

## Fase 1 — Criar o novo projecto Supabase

1. Login em [supabase.com](https://supabase.com) → **New project**.
2. Região recomendada: **eu-west-2 (London)** (mais próxima de Angola que a default `us-east-1`).
3. Define uma password forte para o Postgres — **guarda-a** (vais precisar dela para o `pg_dump`/`psql`).
4. Aguarda 2–3 min até o projecto ficar pronto.
5. Vai a **Settings → API** e copia:
   - `Project URL` → ex: `https://abcd1234.supabase.co`
   - `anon public` → será o `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` → guarda em local seguro (nunca exposto no frontend)
6. **Authentication → Providers** → activa **Email** (e Google, opcionalmente).
7. **Authentication → URL Configuration** → adiciona aos *Redirect URLs*:
   - `http://localhost:8080/**`
   - `https://<o-teu-projecto>.vercel.app/**`
   - `https://dinheiroemmao.com/**` (e outros domínios próprios)

---

## Fase 2 — Aplicar o schema

O ficheiro `migrations/0001_initial_schema.sql` (na raiz do repo) contém **tudo**: tabelas, funções, triggers, RLS, bucket de storage e índices.

### Opção A — Via psql (mais directa)

```bash
export NEW_DB_URL="postgresql://postgres:<PASSWORD_DO_NOVO_DB>@db.<NOVO_REF>.supabase.co:5432/postgres"
psql "$NEW_DB_URL" -f migrations/0001_initial_schema.sql
```

### Opção B — Via Supabase CLI

```bash
supabase login
supabase link --project-ref <NOVO_REF>
# Copia migrations/0001_initial_schema.sql para supabase/migrations/<timestamp>_init.sql
cp migrations/0001_initial_schema.sql supabase/migrations/20250101000000_init.sql
supabase db push
```

---

## Fase 3 — Exportar dados do projecto actual (Lovable Cloud)

Para obter a string de ligação do Supabase actual (gerido pela Lovable), peça-a através do suporte Lovable ou copie do ambiente onde a sandbox corre. Ela tem este formato:

```
postgresql://postgres:<PASSWORD>@db.cycbvqmngcrhzuvqyvkb.supabase.co:5432/postgres
```

Em seguida:

```bash
export OLD_DB_URL="postgresql://postgres:<PASSWORD>@db.cycbvqmngcrhzuvqyvkb.supabase.co:5432/postgres"
bash scripts/export-data.sh
```

Isto cria:
- `dump/public_data.sql` — dados de todas as tabelas
- `dump/auth_users.sql` — utilizadores
- `dump/storage.sql` — metadados dos ficheiros

### Alternativa oficial (recomendada para auth)

O Supabase tem uma ferramenta de migração assistida em **Project Settings → General → Migrate project** (no projecto **destino**). Aceita um projecto Supabase como origem e copia tudo, incluindo `auth.users`, sem perda de hashes de password. **É a forma mais segura para os utilizadores.** Se a tiver disponível, use-a no lugar de `auth_users.sql`.

---

## Fase 4 — Importar dados no novo projecto

```bash
# Utilizadores primeiro (para o trigger handle_new_user disparar correctamente
# desactivamos o trigger temporariamente — handle_new_user não deve correr para utilizadores existentes)
psql "$NEW_DB_URL" -c "ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;"
psql "$NEW_DB_URL" -f dump/auth_users.sql
psql "$NEW_DB_URL" -c "ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;"

# Dados aplicacionais
psql "$NEW_DB_URL" -f dump/public_data.sql

# (Opcional) metadados de storage
psql "$NEW_DB_URL" -f dump/storage.sql
```

### Ficheiros do bucket `atm-photos`

Os bytes dos ficheiros em si vivem em S3 e **não** vão no `pg_dump`. Para os mover:

1. No projecto antigo: **Storage → atm-photos → Download all** (UI), ou usa o S3 API.
2. No projecto novo: faz upload novamente preservando os mesmos nomes (`<auth_uid>/<file>`).

Se for poucos ficheiros, faz manualmente via UI. Se forem muitos, usa o `supabase-storage-migrator` ou um script com `@supabase/storage-js`.

---

## Fase 5 — Edge Functions

Os ficheiros das edge functions já estão no repo (`supabase/functions/`). Deploy:

```bash
supabase functions deploy admin-reset-password
supabase functions deploy create-test-users
supabase functions deploy process-payment
```

### Secrets das functions

No novo projecto: **Project Settings → Edge Functions → Secrets** (ou via CLI):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role_key_NOVO>"
# Adiciona outros secrets se as functions os usarem (ex: provedor de pagamentos)
```

`SUPABASE_URL` e `SUPABASE_ANON_KEY` são injectados automaticamente pelo Supabase.

---

## Fase 6 — Frontend no Vercel

1. Push do repo para GitHub (se ainda não estiver).
2. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
3. **Framework preset:** Vite (auto-detectado).
4. **Build command:** `npm run build`  •  **Output:** `dist`
5. **Environment Variables** — adiciona em *Production*, *Preview* e *Development*:
   ```
   VITE_SUPABASE_URL=https://<NOVO_REF>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<NOVA_anon_key>
   VITE_SUPABASE_PROJECT_ID=<NOVO_REF>
   ```
6. **Deploy.** Após o primeiro deploy, copia o URL `https://<projecto>.vercel.app` e adiciona-o aos *Redirect URLs* do Supabase (Auth → URL Configuration).
7. **Domínio próprio** (`dinheiroemmao.com`): Vercel → Project → Settings → Domains → Add. Aponta o DNS conforme as instruções (geralmente um `CNAME` para `cname.vercel-dns.com`).

O ficheiro `vercel.json` na raiz do repo já garante o fallback SPA (todas as rotas servem `index.html`) — necessário para o React Router.

---

## Fase 7 — Validação (checklist)

- [ ] Abrir `https://<projecto>.vercel.app` carrega a landing sem ecrã branco
- [ ] **Network** mostra pedidos a `https://<NOVO_REF>.supabase.co`
- [ ] Signup com email novo → cria entradas em `profiles` e `user_roles`
- [ ] Login com utilizador migrado funciona (password preservada)
- [ ] Onboarding de agente progride (selector tipo de conta → perfil → ATM)
- [ ] Upload de foto para `atm-photos` funciona
- [ ] Aprovação de ATM por admin cria zona e dispara notificação
- [ ] Edge functions respondem (testar via UI: criar utilizador teste, reset password, pagamento)
- [ ] Notificações em tempo real chegam ao sino do header

---

## Fase 8 — Desligar Lovable Cloud

Quando o novo Supabase estiver estável **e validado em produção**:

1. **Connectors → Lovable Cloud → Disable** (no editor Lovable).
2. Remove `supabase/config.toml` se quiser deixar de versionar configs específicas da Lovable.

> Atenção: desligar Lovable Cloud é **irreversível** por restauro de versão. O editor Lovable continua a funcionar para mudanças de UI, mas:
> - O painel "Cloud" não vê o teu novo projecto.
> - Migrações de schema têm de ser feitas por ti via Supabase Studio ou CLI.
> - Eu (assistente) deixo de poder aplicar `migrations` automaticamente.

---

## Anexo — Variáveis e ficheiros relevantes

| Item | Localização |
|------|-------------|
| Schema completo | `migrations/0001_initial_schema.sql` |
| Script de export | `scripts/export-data.sh` |
| SPA fallback Vercel | `vercel.json` |
| Template de env vars | `.env.example` |
| Cliente Supabase (não editar) | `src/integrations/supabase/client.ts` |
| Edge Functions | `supabase/functions/` |

## Anexo — Cutover sem perder dados

Se já tens utilizadores em produção:

1. Faz tudo até à Fase 6 com o **modo manutenção** desligado.
2. Anuncia uma janela de manutenção curta (ex: 30 min).
3. Re-corre `scripts/export-data.sh` **no momento do switch** (dados frescos).
4. Importa novamente os dumps no Supabase novo.
5. Aponta o DNS de `dinheiroemmao.com` para o Vercel.
6. Verifica a checklist de validação.
7. Anuncia o fim da manutenção.