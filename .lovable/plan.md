

## Plano: Sistema de Avaliação de Agentes + Painel de Análise

### Contexto
Utilizadores subscritos precisam avaliar a fiabilidade do agente que gere uma zona. Supervisores/admins precisam de um painel para analisar o desempenho dos agentes (qualidade de informação e frequência de actualização).

### Parte 1 — Base de dados

**Nova tabela `agent_ratings`:**
```sql
CREATE TABLE public.agent_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (0, 1)), -- 0=dislike, 1=like
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, zone_id) -- 1 voto por zona por utilizador
);
```
- RLS: utilizadores autenticados podem inserir (para si), selecionar os seus votos, admins/supervisors podem ver todos
- Sem limite de 24h nesta fase (simplificação) — apenas 1 voto por zona, actualizável

**Habilitar realtime** na tabela `atms` (para rastrear `last_updated` nos analytics).

### Parte 2 — Widget de Avaliação na Zona (utilizador subscrito)

**Ficheiro: `src/pages/ZoneDetail.tsx`**

Após a lista de ATMs (apenas para `subStatus === 'active'`), adicionar secção discreta:
- Mostrar o nome do agente responsável (consultar `agent_zones` + `profiles`)
- Usar o `RatingWidget` existente com contagem de likes/dislikes do agente naquela zona
- Consultar voto do utilizador actual em `agent_ratings`
- Ao votar: upsert em `agent_ratings` (user_id, zone_id)
- Texto: "Como avalia a fiabilidade das informações desta zona?"
- Não intrusivo: aparece no fundo da lista de ATMs, com design subtil

**Ficheiro: `src/components/RatingWidget.tsx`**
- Ajustar variant `success` → verificar se existe no Button, senão usar classe custom
- Componente já está pronto, apenas precisa de integração

### Parte 3 — Painel de Análise de Agentes (admin/supervisor)

**Novo ficheiro: `src/pages/dashboard/AgentAnalytics.tsx`**

Painel acessível via sidebar, que mostra para cada agente:

1. **Score de reputação** — (likes / total votos) × 5, arredondado a 1 casa
2. **Total likes / dislikes** — agregado de todas as zonas
3. **Frequência de actualização** — conta quantas vezes o agente actualizou ATMs nos últimos 7/30 dias (via `atms.last_updated` cruzado com `agent_zones`)
4. **Última actualização** — timestamp da última alteração feita pelo agente
5. **Zonas geridas** — lista com score individual por zona
6. **Alerta** — se score < 2.5, badge de aviso

Layout: tabela/lista com cards expansíveis por agente. Filtro por nome, zona, score.

**Ficheiro: `src/components/DashboardLayout.tsx`**
- Adicionar link "Análise Agentes" com ícone `BarChart3`, roles: `['admin', 'supervisor']`

**Ficheiro: `src/App.tsx`**
- Nova rota `/dashboard/agent-analytics` protegida para admin/supervisor

### Parte 4 — Tracking de actividade do agente

Para calcular a frequência de actualizações, vamos usar os timestamps `last_updated` da tabela `atms`. Quando o agente actualiza um ATM, o `last_updated` é definido — cruzando com `agent_zones` sabemos quais ATMs pertencem a zonas do agente.

Adicionalmente, criar uma **tabela `agent_activity_log`** para registo mais granular:
```sql
CREATE TABLE public.agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  atm_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'update',
  created_at timestamptz NOT NULL DEFAULT now()
);
```
- RLS: agentes inserem os seus, admins/supervisors lêem todos
- Inserir um registo cada vez que o agente actualiza um ATM (no `AgentDashboard.tsx`, dentro de `handleUpdateAtm`)

### Ficheiros a criar/modificar

| Ficheiro | Alteração |
|---|---|
| BD (migration) | Criar `agent_ratings` e `agent_activity_log` com RLS |
| `src/pages/ZoneDetail.tsx` | Adicionar widget de avaliação para subscritos |
| `src/pages/dashboard/AgentAnalytics.tsx` | **Criar** — painel de análise |
| `src/pages/AgentDashboard.tsx` | Registar actividade no log ao actualizar ATM |
| `src/components/DashboardLayout.tsx` | Adicionar link na sidebar |
| `src/App.tsx` | Adicionar rota protegida |

### Notas de design
- Widget de avaliação é discreto: aparece abaixo dos ATMs, sem popup
- Painel de analytics usa cards com métricas visuais (barras de progresso, badges coloridos)
- Alerta vermelho automático se score de agente cai abaixo de 2.5

