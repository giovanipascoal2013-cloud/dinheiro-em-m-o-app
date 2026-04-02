## Análise do Fluxo Operacional Completo

### Fluxo testado: Supervisor cria zona → insere ATM → atribui zona a agente → Agente altera ATM → Utilizador adere → após o término do tempo dessa subscrição → Valor do agente dessa subscrição passa do saldo pendente para disponível →Agente levanta saldo → administrador aprova levantamento

---

### Problemas Identificados

#### 1. Listagem de agentes falha (CRÍTICO)

A página `Agents.tsx` faz um join entre `user_roles` e `profiles` via `profiles:user_id(nome, telefone)`, mas **não existe foreign key** entre `user_roles.user_id` e `profiles.user_id`. O PostgREST retorna erro 400:

```
"Could not find a relationship between 'user_roles' and 'user_id' in the schema cache"
```

Isto impede completamente a atribuição de zonas a agentes.

**Correcção:** Separar em duas queries - primeiro buscar `user_roles` com `role=agent`, depois buscar `profiles` separadamente com `.in('user_id', agentIds)` e fazer o merge no frontend.

#### 2. Agente não consegue alterar ATMs (CRÍTICO)

A RLS da tabela `atms` tem apenas duas políticas:

- SELECT: `Anyone can view ATMs` (anon + authenticated)
- ALL: `Supervisors and admins can manage ATMs`

**Agentes não têm permissão de UPDATE.** Quando o agente tenta fazer toggle de `has_cash` no `AgentDashboard.tsx`, o Supabase rejeita silenciosamente.

**Correcção:** Adicionar política RLS que permite agentes fazer UPDATE nos campos `has_cash` e `last_updated` em ATMs das suas zonas:

```sql
CREATE POLICY "Agents can update ATMs in their zones"
ON public.atms FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND zone_id IN (SELECT zone_id FROM agent_zones WHERE agent_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND zone_id IN (SELECT zone_id FROM agent_zones WHERE agent_id = auth.uid())
);
```

#### 3. Subscrição pendente mostra "Subscrito" imediatamente (MENOR)

No `ZoneDetail.tsx`, após o pagamento, `handlePaymentSuccess` faz `setIsSubscribed(true)` localmente, mas a subscrição está com status `pending`. O utilizador vê os ATMs antes de a subscrição ser aprovada.

**Correcção:** Em `handlePaymentSuccess`, não alterar `isSubscribed`. Mostrar uma mensagem de "Pendente de aprovação" em vez de desbloquear os ATMs.

#### 4. Subscrição verifica apenas `status=active` mas não verifica `expiry_date` (MENOR)

Em `ZoneDetail.tsx` e `Index.tsx`, a query de subscrições filtra por `status=active` mas não verifica se `expiry_date > now()`. Subscrições expiradas mas não actualizadas continuam a dar acesso.

**Correcção:** Adicionar filtro `.gte('expiry_date', new Date().toISOString())` nas queries de verificação de subscrição.

#### 5. Supervisor não pode aprovar levantamentos (MODERADO)

A rota `/dashboard/withdrawals` está protegida com `requiredRoles={['admin']}` apenas. A RLS também só permite update para admins. Supervisores não conseguem aprovar levantamentos.

**Correcção:** 

- Em `App.tsx`: adicionar `'supervisor'` ao `requiredRoles` da rota de withdrawals
- Migração SQL: adicionar política para supervisores fazerem update em withdrawals

#### 6. Transações rejeitadas na tabela `transactions` (MENOR)

No `PaymentModal.tsx`, o `method` é inserido como `'transferencia'`, mas o default da coluna é `'multicaixa_express'`. Não é um erro funcional, mas é inconsistente.

---

### Plano de Correcção (4 alterações)

**1. Fix: Listagem de agentes (query separada)**

- Ficheiro: `src/pages/dashboard/Agents.tsx`
- Alterar `fetchData` para buscar `user_roles` e `profiles` em queries separadas, fazer merge no código

**2. Migração: RLS para agentes actualizarem ATMs**

- Nova policy UPDATE em `atms` para agentes nas suas zonas
- Nova policy UPDATE em `withdrawals` para supervisores

**3. Fix: Subscrição pendente não desbloqueia ATMs**

- Ficheiro: `src/pages/ZoneDetail.tsx` — não setar `isSubscribed(true)` no `handlePaymentSuccess`
- Ficheiro: `src/pages/Index.tsx` e `ZoneDetail.tsx` — adicionar filtro de `expiry_date`

4. Supervisores têm de puder atribuir zonas ao agentes

### Ficheiros a modificar:

1. `src/pages/dashboard/Agents.tsx` — fix query join
2. `src/pages/ZoneDetail.tsx` — fix subscrição pendente + expiry check
3. `src/pages/Index.tsx` — expiry check nas subscrições
4. **Migração SQL** — RLS: agents update ATMs 