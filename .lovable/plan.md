

## Plano: Melhorias de UX, Responsividade e Lógica de Negócio

### 1. Agentes veem apenas ATMs das suas zonas

**Ficheiro:** `src/pages/AgentDashboard.tsx`
- Já está correcto — a query filtra ATMs por `zone_id IN agent_zones`. O dashboard do agente só mostra ATMs atribuídos.
- Adicionar campos `has_paper`, `fila`, `status` e `obs` (novo campo) ao ATM card do agente
- Agente pode alterar: `has_cash`, `has_paper`, `fila`, `status` (mas NÃO `address`, `bank_name`, `latitude`, `longitude`)
- Mostrar data/hora da última actualização (já existe `last_updated`, auto-actualiza ao alterar)

**Ficheiro:** `src/pages/dashboard/ATMs.tsx`
- Quando o utilizador é agente, filtrar ATMs para mostrar apenas os das suas zonas atribuídas (query `agent_zones` → filter `zone_id`)

### 2. Informações do ATM melhoradas (cards para utilizador subscrito)

**Ficheiro:** `src/pages/ZoneDetail.tsx`
- Mostrar nos cards de ATM: dinheiro (sim/não), papel (sim/não), fila, data/hora última actualização
- Adicionar campo `obs` (observação) — visível apenas se preenchido
- Ocultar `obs` se vazio

**Migração SQL:** Adicionar coluna `obs text` à tabela `atms` (campo opcional para observações do agente)

### 3. Melhorar responsividade mobile-first

**Ficheiros:** `src/pages/Index.tsx`, `src/pages/ZoneDetail.tsx`, `src/pages/AgentDashboard.tsx`, `src/pages/Dashboard.tsx`, `src/pages/dashboard/ATMs.tsx`, `src/pages/dashboard/Zones.tsx`, `src/components/DashboardLayout.tsx`

Alterações transversais:
- ATMs table no dashboard → converter para cards em mobile (< 768px), manter tabela em desktop
- Filtros em ATMs.tsx: stack vertical em mobile, horizontal em desktop (já parcialmente feito)
- Zone detail dialog: full-screen em mobile
- Stats cards: `grid-cols-2` em mobile (já existe), ajustar padding
- Sidebar: já funciona com toggle — garantir que fecha ao navegar

### 4. Zone detail dialog com abas profissionais (Dashboard admin/supervisor)

**Ficheiro:** `src/pages/dashboard/Zones.tsx`

Redesenhar o `ZoneDetailDialog` com abas usando `Tabs`:
- **Resumo**: Stats (ATMs, subscrições activas, agentes), facturação total, estado, preço, coordenadas
- **ATMs**: Lista completa de ATMs na zona com estado (dinheiro, papel, fila, última actualização)
- **Subscrições**: Número total, receita acumulada, subscrições activas vs expiradas
- **Agentes**: Lista de agentes atribuídos com código de referral, possibilidade de remover/adicionar

### 5. Zona inactiva por defeito + activação automática ao atribuir agente

**Ficheiro:** `src/pages/dashboard/Zones.tsx`
- No `ZoneForm`, default do campo `status` passa de `'active'` para `'suspended'` (novas zonas criadas são inactivas)
- Botão de activar/desactivar directamente no card da zona

**Ficheiro:** `src/pages/dashboard/Agents.tsx`
- Ao atribuir zona a agente (INSERT em `agent_zones`), verificar se a zona está `suspended` → automaticamente UPDATE para `active`

**Ficheiro:** `src/components/ZonesMap.tsx` e `src/pages/Index.tsx`
- Já filtra por `status = 'active'` no Index.tsx — zonas inactivas não aparecem no mapa nem na listagem

### 6. Mini-mapa no formulário de criação de zona

**Ficheiro:** `src/pages/dashboard/Zones.tsx` (dentro do `ZoneForm`)
- Adicionar um mini-mapa Mapbox (200px altura) abaixo dos campos de coordenadas
- Marcador arrastável que actualiza `latitude` e `longitude` em tempo real
- Se coordenadas em branco, usar centro padrão de Luanda
- Coordenadas opcionais: se deixar em branco, zona recebe coordenadas do primeiro ATM inserido (verificar na submissão)

### 7. Mini-mapa no formulário de criação de ATM

**Ficheiro:** `src/pages/dashboard/ATMs.tsx` (dentro do `ATMForm`)
- Mesmo conceito: mini-mapa com marcador arrastável
- Ao mover o marcador, actualiza latitude, longitude
- Reverse geocoding opcional: ao mover o marcador, preencher automaticamente endereço, cidade e província via API Mapbox Geocoding

### 8. Optimizar performance de consultas

**Ficheiros:** `src/pages/Index.tsx`, `src/pages/Dashboard.tsx`, `src/pages/dashboard/Zones.tsx`

Problemas identificados:
- `Index.tsx` faz 2 queries sequenciais (zones + atms) — juntar numa só ou paralelizar com `Promise.all`
- `Dashboard.tsx` faz 4 queries sequenciais — já usa `Promise.all` parcialmente, mas a construção de stats é sequencial
- O cálculo de `atm_count` no Index busca TODOS os ATMs apenas para contar — alterar para query agrupada ou usar `.select('zone_id')` com count no frontend (já faz isso, mas pode ser optimizado com um RPC)
- Adicionar índices DB nas colunas mais consultadas

**Migração SQL:**
```sql
CREATE INDEX IF NOT EXISTS idx_atms_zone_id ON public.atms(zone_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_zone ON public.subscriptions(user_id, zone_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_zones_agent ON public.agent_zones(agent_id);
```

---

### Ficheiros a modificar:
1. **Migração SQL** — adicionar coluna `obs`, índices de performance
2. `src/pages/AgentDashboard.tsx` — campos extra no ATM card, campos editáveis
3. `src/pages/dashboard/ATMs.tsx` — filtrar ATMs por zona do agente, mini-mapa no form, cards mobile
4. `src/pages/dashboard/Zones.tsx` — abas no detail dialog, mini-mapa no form, default status suspended
5. `src/pages/dashboard/Agents.tsx` — activar zona ao atribuir agente
6. `src/pages/ZoneDetail.tsx` — mostrar info completa ATM ao utilizador subscrito
7. `src/pages/Index.tsx` — optimizar queries
8. `src/pages/Dashboard.tsx` — optimizar queries
9. `src/components/DashboardLayout.tsx` — ajustes mobile

