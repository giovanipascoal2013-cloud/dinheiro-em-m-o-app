

## Plano: Tornar a divisão de receita e desconto de referência configuráveis pelo financeiro

### Problema
A divisão de receita (70/30) e o desconto de referência (30%) estão hardcoded em 4 ficheiros. O financeiro precisa poder ajustar estes valores dinamicamente.

### Solução

**1. Base de dados — Inserir novas chaves em `platform_settings`**

Inserir duas novas linhas:
- `platform_margin` → `0.30` (margem da plataforma, de 0 a 1)
- `referral_discount` → `0.30` (desconto de referência, de 0 a 1)

**2. Hook `src/hooks/usePlatformMargin.ts`** — Criar

Hook React Query que lê `platform_margin` e `referral_discount` de `platform_settings`, com fallback para 0.30. Exporta `{ platformMargin, agentShare, referralDiscount, isLoading }`.

**3. `src/pages/FinanceDashboard.tsx`** — Modificar

- Remover `const PLATFORM_MARGIN = 0.30`
- Usar o novo hook para obter `platformMargin` e `referralDiscount`
- Adicionar na secção de configurações (ao lado do preço base por ATM) dois campos editáveis:
  - **Margem da Plataforma** (%) — editar/guardar para `platform_margin`
  - **Desconto de Referência** (%) — editar/guardar para `referral_discount`
- Actualizar todos os cálculos de KPI, gráficos e tabela de zonas para usar os valores dinâmicos
- Actualizar o label "Margem (30%)" para exibir a percentagem real

**4. `src/pages/AgentDashboard.tsx`** — Modificar

- Remover `const AGENT_SHARE = 0.7`
- Usar o hook para obter `agentShare` (calculado como `1 - platformMargin`)
- Substituir nos cálculos de saldo

**5. `src/components/PaymentModal.tsx`** — Modificar

- Remover `const REFERRAL_DISCOUNT = 0.3`
- Usar o hook para obter `referralDiscount`
- Actualizar textos "30%" para exibir a percentagem real

**6. `src/components/ReferralShare.tsx`** — Modificar

- Receber `referralDiscount` como prop ou usar o hook
- Substituir textos hardcoded "30%" pela percentagem real

### Ficheiros

| Ficheiro | Alteração |
|---|---|
| Base de dados (insert) | Inserir `platform_margin` e `referral_discount` em `platform_settings` |
| `src/hooks/usePlatformMargin.ts` | **Criar** — hook para ler margem e desconto |
| `src/pages/FinanceDashboard.tsx` | Usar hook + adicionar campos de edição |
| `src/pages/AgentDashboard.tsx` | Usar hook em vez de constante |
| `src/components/PaymentModal.tsx` | Usar hook em vez de constante |
| `src/components/ReferralShare.tsx` | Exibir percentagem dinâmica |

