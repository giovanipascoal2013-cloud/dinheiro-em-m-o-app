

## Plano: Restringir navegação do agente apenas ao seu painel de gestão

### Problema
Os agentes conseguem aceder às páginas `/dashboard/zones` e `/dashboard/atms` através da barra lateral, que mostram **todas** as zonas e ATMs da plataforma. O painel do agente (`/agent`) já filtra correctamente apenas as zonas atribuídas, mas a navegação lateral expõe links "Zonas" e "ATMs" sem restrição de cargo.

### Solução

**1. `src/components/DashboardLayout.tsx`** — Restringir itens de navegação

- Adicionar `roles: ['admin', 'supervisor']` aos itens "Zonas" e "ATMs" na lista `navItems` (linhas 39-40), para que agentes não vejam esses links na barra lateral

**2. `src/App.tsx`** — Restringir rotas

- Alterar `requiredRoles` das rotas `/dashboard/zones` e `/dashboard/atms` de `['admin', 'supervisor', 'agent']` para `['admin', 'supervisor']`, impedindo o acesso directo por URL

Com estas duas alterações, o agente verá apenas "Meu Painel" na barra lateral, que é o seu painel de gestão operacional com as zonas e ATMs que lhe pertencem.

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/DashboardLayout.tsx` | Adicionar restrição de roles aos links Zonas e ATMs |
| `src/App.tsx` | Remover `'agent'` das rotas `/dashboard/zones` e `/dashboard/atms` |

