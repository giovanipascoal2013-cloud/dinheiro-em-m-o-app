

## Plano: Correcções de Fluxo, Unicidade, Subscrições Pendentes, Perfil e Performance

---

### Problemas identificados e correcções

### 1. Cálculo do valor dos ATMs nos Dashboards

**Problema:** No `AgentDashboard.tsx` (linha 197), o preço exibido é `zone.price_kz` directamente, que pode ser 0. No `Dashboard.tsx` (linha 300 do `RecentZonesList`), idem. No `Zones.tsx` card (linha 337), mostra "A calcular" mas nunca o valor real.

**Correcção:**
- `AgentDashboard.tsx` linha 197: calcular `effectivePrice = zone.price_kz > 0 ? zone.price_kz : zoneAtms.length * 500` e exibir esse valor
- `Dashboard.tsx` `RecentZonesList`: buscar contagem de ATMs por zona para mostrar preço efectivo
- `Zones.tsx` `ZoneCard` (linha 337): mostrar preço efectivo usando contagem de ATMs da zona (necessita fetch adicional ou incluir atm_count)

### 2. Fluxo de subscrição → saldo do agente

**Problema:** No `AgentDashboard.tsx`, o cálculo de saldo (linhas 78-94) usa `createdAt < oneMonthAgo` para decidir se é "expired_amount" (disponível) vs "active_amount" (pendente). Isto é incorrecto — deveria usar `expiry_date` e `status` para determinar se a subscrição já expirou e o valor passou para disponível.

**Correcção em `AgentDashboard.tsx`:**
- Mudar lógica: `expired_amount` = subscrições com `status === 'expired'` OU `expiry_date < now()`
- `active_amount` = subscrições com `status === 'active'` E `expiry_date >= now()`
- Isto garante que o saldo só fica disponível após a subscrição expirar

### 3. Página de perfil demora a carregar

**Problema:** `Profile.tsx` espera que `profile` do `useAuth` esteja disponível, e depois faz uma query adicional (linha 32). Se o `profile` do auth demora (race condition com `INITIAL_SESSION`), a página fica em loading.

**Correcção em `Profile.tsx`:**
- Fazer fetch directo do perfil no `useEffect` usando `user.id` em vez de esperar pelo `profile` do contexto
- Remover dependência de `profile` do useEffect, usar apenas `user`

### 4. Demora a criar e abrir contas

**Problema:** O `useAuth` (linhas 47-62) faz `getSession` → `fetchUserData` sequencialmente, e o `onAuthStateChange` também chama `fetchUserData` com `await` dentro do callback (linha 62), o que pode causar deadlock conforme documentado no stack overflow hint.

**Correcção em `useAuth.tsx`:**
- Remover `await` do `onAuthStateChange` callback — usar fire-and-forget: `fetchUserData(session.user.id)` sem await
- Isto desbloqueia o fluxo de auth e acelera o carregamento

### 5. Unicidade: 1 zona → 1 agente, 1 ATM → 1 zona

**Problema:** Actualmente nada impede atribuir 2 agentes à mesma zona nem 1 ATM a 2 zonas (o ATM tem `zone_id` singular, mas a `agent_zones` permite duplicados de `zone_id`).

**Correcção:**
- **Migração SQL:** adicionar `UNIQUE(zone_id)` na tabela `agent_zones` — cada zona só pode ter 1 agente
- **Código `Assignments.tsx`:** antes de atribuir zona a agente, verificar se a zona já tem agente atribuído (e mostrar erro)
- O ATM já tem campo singular `zone_id`, então não é possível ter 1 ATM em 2 zonas — está correcto

### 6. Subscrições pendentes expiram após 30 dias

**Correcção em `Subscriptions.tsx`:**
- No fetch, marcar automaticamente como `rejected` subscrições com `status = 'pending'` e `created_at < 30 dias atrás`
- Adicionar filtros: `pending`, `active`, `rejected`, `expired`, `all` (actualmente só tem `pending` e `all`)
- Adicionar barra de pesquisa melhorada (já existe mas confirmar que filtra por referência, telefone, zona, nome)

### 7. Aceder ao perfil pelo card do utilizador na sidebar

**Correcção em `DashboardLayout.tsx`:**
- Envolver o card do utilizador (linhas 120-131) num `<Link to="/profile">` para que ao clicar no avatar/nome, abra a página de perfil

### 8. Performance das chamadas à base de dados

**Causas identificadas:**
- `onAuthStateChange` com `await` bloqueia o fluxo (corrigido no ponto 4)
- Múltiplas queries sequenciais em vez de paralelas em algumas páginas
- Falta de cache — `QueryClient` está configurado mas nenhuma página usa `useQuery` do React Query

**Correcção:**
- Fix do `await` no auth (ponto 4) — maior impacto
- Verificar que todas as queries paralelas usam `Promise.all` (já implementado na maioria)

---

### Ficheiros a modificar:

1. **Migração SQL** — `UNIQUE(zone_id)` em `agent_zones`
2. `src/hooks/useAuth.tsx` — remover `await` no `onAuthStateChange`, fire-and-forget
3. `src/pages/AgentDashboard.tsx` — fix cálculo saldo (usar `expiry_date`), fix preço efectivo
4. `src/pages/Dashboard.tsx` — preço efectivo no `RecentZonesList`
5. `src/pages/dashboard/Zones.tsx` — preço efectivo no `ZoneCard` (fetch atm count)
6. `src/pages/dashboard/Subscriptions.tsx` — auto-rejeitar pendentes >30d, filtros avançados
7. `src/pages/dashboard/Assignments.tsx` — validar unicidade zona→agente antes de atribuir
8. `src/pages/Profile.tsx` — fetch directo sem depender do profile do contexto
9. `src/components/DashboardLayout.tsx` — link ao perfil no card do utilizador

