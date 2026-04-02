

## Plano: Corrigir Bugs Críticos (3 itens)

### Bug 1: Preço mostra 0 KZ na subscrição

**Causa raiz:** Muitas zonas têm `price_kz = 0` na DB (preço auto-calculado). O `ZoneDetail.tsx` usa `zone.price_kz` directamente (que é 0) tanto na exibição como no `PaymentModal`. O preço calculado (`atm_count * 500`) só é usado no `ZoneCard` da landing page, mas nunca chega ao ZoneDetail nem ao PaymentModal.

**Correcção em `src/pages/ZoneDetail.tsx`:**
- Calcular `effectivePrice`: se `zone.price_kz === 0`, usar `atms.length * 500`, senão usar `zone.price_kz`
- Passar `effectivePrice` ao `PaymentModal` em vez de `zone.price_kz`
- Usar `effectivePrice` em toda a UI (header stats, botão de subscrição, texto de bloqueio)
- Se `effectivePrice === 0` (zona sem ATMs e sem preço manual), desabilitar botão de subscrição com texto "Preço ainda não definido"

**Correcção em `src/components/PaymentModal.tsx`:**
- Já recebe `zone.price_kz` — com a correcção acima, passará a receber o preço correcto
- Construir o objecto `{ ...zone, price_kz: effectivePrice }` ao passar ao modal

### Bug 2: Botão "Sair" não funciona correctamente nos dashboards

**Causa raiz:** O `handleSignOut` em `DashboardLayout.tsx` chama `signOut()` e depois `navigate('/')`. O `signOut` no `useAuth` chama `supabase.auth.signOut()`, mas o listener `onAuthStateChange` no `Auth.tsx` pode re-redirecionar antes da navegação completar. Pode haver uma race condition.

**Correcção em `src/components/DashboardLayout.tsx`:**
- Aguardar `signOut()` com await (já faz isso)
- Adicionar `window.location.href = '/'` em vez de `navigate('/')` para forçar um reload completo e limpar todo o estado

**Correcção em `src/hooks/useAuth.tsx`:**
- No `signOut`, limpar `profile` e `roles` imediatamente antes de chamar `supabase.auth.signOut()` para evitar que componentes protegidos ainda vejam o utilizador como autenticado

### Bug 3: Ordenação por proximidade na landing page

**Correcção em `src/pages/Index.tsx`:**
- Pedir geolocalização no `useEffect` inicial (reutilizar `navigator.geolocation.getCurrentPosition`)
- Guardar `userLocation` em state: `{ lat: number; lng: number } | null`
- Na função `filteredZones` (useMemo), se `userLocation` existe e `sortBy === 'name'` (o default), ordenar por distância (Haversine simplificado) em vez de alfabético
- Adicionar nova opção de sort: `{ value: 'proximity', label: 'Mais perto' }` (só aparece se tiver localização)
- Se não tiver localização, default para ordem de `updated_at` (mais recente primeiro) — adicionar este campo ao fetch de zonas

**Migração:** Nenhuma necessária.

### Ficheiros a modificar:
1. `src/pages/ZoneDetail.tsx` — calcular preço efectivo
2. `src/components/DashboardLayout.tsx` — fix logout com reload
3. `src/hooks/useAuth.tsx` — limpar estado no signOut
4. `src/pages/Index.tsx` — geolocalização + ordenação por proximidade

