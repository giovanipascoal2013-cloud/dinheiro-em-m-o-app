

## Plano: Role "Financeiro" com Dashboard Corporativo (Actualizado)

### Resumo
Adicionar o role `financeiro` ao sistema com dashboard financeiro profissional, incluindo controlo total sobre preços de zonas e o preço base por ATM.

---

### 1. Migração de Base de Dados

```sql
-- Novo valor no enum
ALTER TYPE public.app_role ADD VALUE 'financeiro';

-- Tabela de configuração de preços da plataforma
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
INSERT INTO platform_settings (key, value) VALUES ('price_per_atm', '500');

-- RLS: financeiro e admin podem ler e actualizar settings
-- RLS: financeiro pode SELECT em subscriptions, withdrawals, zones
-- RLS: financeiro pode UPDATE em withdrawals (processar levantamentos)
-- RLS: financeiro pode UPDATE price_kz em zones
```

### 2. Hook `useAuth` — Adicionar `isFinanceiro`

Novo campo booleano exposto no contexto, redireccionamento pós-login para `/finance`.

### 3. Dashboard Financeiro (`/finance`)

Página nova: `src/pages/FinanceDashboard.tsx`

**KPIs (4-5 cards):** Receita Total, Receita Mensal, Pago a Agentes, Pendente, Margem (30%)

**Gráfico:** Barras mensais (Receita vs Pagamentos) com linha de margem — Recharts

**Tabela por Zona:** Zona, Subscrições Activas, Receita, Pagamentos, Margem — ordenável

**Levantamentos Recentes:** Últimos 10 com status, link para `/dashboard/withdrawals`

### 4. Gestão de Preços (NOVO)

Secção dedicada no dashboard financeiro com duas funcionalidades:

**A — Preço Base por ATM (global):**
- Card editável mostrando o valor actual da `platform_settings.price_per_atm`
- Input com botão "Guardar" para alterar o preço base (ex: 500 KZ → 750 KZ)
- Afecta todas as zonas com `price_kz = 0` (modo auto-cálculo)

**B — Preços por Zona (individual):**
- Tabela de todas as zonas com coluna editável de `price_kz`
- Inline editing: clicar no preço, alterar, confirmar
- Opção de repor para "Auto" (definir `price_kz = 0`)
- Badge visual distinguindo zonas com preço manual vs automático

**Lógica de preço efectivo actualizada:**
- Se `zone.price_kz > 0` → usar preço manual
- Se `zone.price_kz = 0` → `platform_settings.price_per_atm × nº ATMs`
- Código existente em `ZoneDetail`, `ZoneCard`, `Index.tsx` adaptado para ler `platform_settings`

### 5. Sidebar e Routing

**DashboardLayout** — novos itens para financeiro:
- Painel Financeiro → `/finance`
- Levantamentos → `/dashboard/withdrawals`
- Subscrições → `/dashboard/subscriptions`

**App.tsx** — nova rota protegida:
```
/finance → ProtectedRoute requiredRoles=['financeiro','admin']
```

### 6. Página de Roles

Actualizar `/dashboard/roles` para incluir card de estatística e atribuição do role `financeiro`.

---

### Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar — enum + `platform_settings` + RLS |
| `src/hooks/useAuth.tsx` | Modificar — `isFinanceiro` |
| `src/components/DashboardLayout.tsx` | Modificar — nav financeiro |
| `src/pages/FinanceDashboard.tsx` | **Criar** — dashboard + gestão de preços |
| `src/pages/dashboard/Roles.tsx` | Modificar — incluir financeiro |
| `src/App.tsx` | Modificar — rota `/finance` |
| `src/pages/ZoneDetail.tsx` | Modificar — ler `price_per_atm` de settings |
| `src/pages/Index.tsx` | Modificar — preço efectivo com settings |

