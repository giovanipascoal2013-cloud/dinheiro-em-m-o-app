

## Plano de Alterações (4 itens)

### 1. Criar zona sem preço / auto-calcular baseado nos ATMs

**Ficheiro:** `src/pages/dashboard/Zones.tsx`

- No `ZoneForm`, tornar o campo `price_kz` opcional (placeholder "Auto-calcular" quando vazio)
- Na submissão, se vazio, enviar `price_kz: 0` (o default da DB é 1500, mas enviaremos 0 para indicar "a calcular")
- No `ZoneCard` do dashboard, quando `price_kz === 0`, mostrar "A calcular" em vez do valor
- Na página principal (`Index.tsx`), mostrar o preço calculado: contar ATMs da zona e multiplicar por valor base (ex: 500 KZ/ATM), ou mostrar "Grátis" se 0 ATMs

**Migração DB:** Alterar default de `price_kz` para 0 (em vez de 1500)

### 2. Card de zona clicável com detalhe completo no Dashboard

**Ficheiro:** `src/pages/dashboard/Zones.tsx`

- Tornar o `ZoneCard` clicável (onClick abre Dialog de detalhe)
- Criar componente `ZoneDetailDialog` que mostra:
  - Nome, descrição, coordenadas, estado, preço
  - Contagem de ATMs na zona (query `atms` where `zone_id = id`)
  - Lista de ATMs com nome do banco e estado
  - Contagem de subscrições activas (query `subscriptions` where `zone_id = id AND status = 'active'`)
  - Facturação total (soma `amount_kz` das subscrições)
  - Agente(s) atribuído(s) (query `agent_zones` where `zone_id = id`, join com `profiles`)

### 3. Corrigir duplicação "Meu Painel" / "Dashboard" na sidebar

**Ficheiro:** `src/components/DashboardLayout.tsx`

- Problema actual: o filtro `filteredNavItems` (linhas 56-62) inclui ambos quando o user tem role `agent` + `admin` ou `supervisor`, ou simplesmente quando tem `agent`
- Solução: se o user é admin ou supervisor, excluir "Meu Painel" (agent-only); se é apenas agent, excluir "Dashboard" (admin/supervisor-only)
- Lógica: adicionar condição extra -- se `isAdmin || isSupervisor`, filtrar fora items com `roles: ['agent']` exclusivamente

### 4. Atribuir zonas a agentes (admin/supervisor only)

**Ficheiro:** `src/pages/dashboard/Agents.tsx`

- Esta funcionalidade já foi implementada na última edição deste ficheiro
- Verificar que está funcional: botão "Atribuir Zona", Dialog com select, badges com zonas, botão X para remover
- Confirmar que as RLS policies permitem admin e supervisor fazer INSERT/DELETE em `agent_zones` (já existe policy "Supervisors and admins can manage agent zones")
- Sem alterações adicionais necessárias neste ponto

### Ficheiros a modificar:
1. `src/pages/dashboard/Zones.tsx` -- preço opcional + dialog de detalhe da zona
2. `src/components/DashboardLayout.tsx` -- fix sidebar duplicada
3. `src/pages/Index.tsx` -- mostrar preço calculado para zonas com price_kz = 0
4. **Migração SQL** -- alterar default de `price_kz` para 0

