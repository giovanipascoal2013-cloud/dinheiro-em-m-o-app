

## Plano: Dashboard do Agente

### Contexto Actual
- Existe um `AgentDashboard.tsx` que usa **dados mock** -- precisa ser reescrito para usar dados reais do backend.
- Tabelas relevantes: `agent_zones` (liga agente a zonas), `atms` (com `has_cash`, `bank_name`, `address`), `subscriptions` (com `zone_id`, `amount_kz`, `status`, `expiry_date`), `zones`.
- ATMs actualmente so podem ser editados por supervisors/admins (RLS). Precisamos de uma nova policy para agentes.

### O que vai ser construido

**1. Migracão de base de dados -- RLS para agentes editarem ATMs**
- Adicionar policy na tabela `atms` que permita `UPDATE` apenas nos campos `has_cash` e `last_updated` por agentes cujo `agent_zones` contenha o `zone_id` do ATM.
- Como RLS nao pode restringir colunas, a restricão de campos (nao alterar endereco/banco) sera feita no frontend.
- A policy: agente autenticado pode fazer UPDATE em `atms` WHERE `zone_id IN (SELECT zone_id FROM agent_zones WHERE agent_id = auth.uid())`.

- Adicionar policy na tabela `subscriptions` que permita SELECT para agentes nas zonas deles (para contar adesoes, sem expor dados do utilizador).

**2. Reescrever `src/pages/AgentDashboard.tsx`** -- dados reais via Supabase

O dashboard tera estas secções:

- **Cards de resumo**: Zonas atribuidas, Total de ATMs, Total de adesoes (count de subscriptions nas suas zonas), Saldo disponivel
- **Lista de ATMs por zona**: Cada ATM mostra nome do banco, status de dinheiro (toggle), ultima actualizacao. O agente pode alterar apenas: `has_cash` (com/sem dinheiro). Endereco e banco sao read-only.
- **Adesoes**: Contagem total de subscricoes por zona (sem mostrar quem). Agrupado por zona.
- **Saldo pendente**: Calculo: soma de `amount_kz * 0.7` de subscricoes **expiradas** (ja terminadas) nas zonas do agente. Subscricoes ainda activas nao contam para saldo disponivel.

Queries necessarias:
```text
1. agent_zones WHERE agent_id = user.id → lista de zone_ids
2. zones WHERE id IN zone_ids → detalhes das zonas
3. atms WHERE zone_id IN zone_ids → ATMs do agente
4. subscriptions WHERE zone_id IN zone_ids → contagem + calculo de saldo
```

Logica de saldo:
- Saldo disponivel = SUM(amount_kz * 0.7) WHERE status = 'expired' OR expiry_date < now()
- Saldo pendente (em espera) = SUM(amount_kz * 0.7) WHERE status = 'active' AND expiry_date >= now()

**3. Actualizar rota em `App.tsx`**
- Adicionar rota `/agent` com `ProtectedRoute` exigindo role `agent`.

**4. Adicionar link no `DashboardLayout.tsx`**
- Entrada "Meu Painel" visivel apenas para agentes, apontando para `/agent`.

### Permissoes do agente (resumo)
| Accao | Permitido |
|---|---|
| Ver ATMs das suas zonas | Sim |
| Alterar has_cash (dinheiro) | Sim |
| Alterar endereco/banco | Nao (bloqueado no UI) |
| Ver contagem de adesoes | Sim |
| Ver quem aderiu | Nao |
| Ver saldo disponivel | Sim (so apos subscricao expirar) |

