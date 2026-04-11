

## Plano: Onboarding Guiado por Cargo + Notificações Automáticas

### Contexto
Actualmente não existe onboarding guiado — utilizadores, agentes e supervisores são largados nas suas páginas sem orientação. Além disso, eventos críticos (nova subscrição, subscrição pendente, pedido de levantamento) não geram notificações para as partes interessadas.

---

### Parte 1 — Componente de Onboarding (Tour/Guia Interactivo)

**Novo ficheiro: `src/components/OnboardingGuide.tsx`**

Componente reutilizável que mostra um tour passo-a-passo na primeira visita. Usa `localStorage` para controlar se já foi visto (chave: `onboarding_seen_{role}`). Aparece como um modal/drawer com passos numerados, cada um com título, descrição e ícone.

**Lógica:** Se `localStorage.getItem('onboarding_seen_{role}')` não existe, mostrar o guia automaticamente. Botão "Pular" em cada passo e "Concluir" no último.

---

### Parte 2 — Conteúdo do Onboarding por Cargo

**Agente (aparece em `/agent`):**
1. **Bem-vindo, Agente!** — "Como agente, você é o responsável por manter as informações dos ATMs actualizadas. Quanto mais fiável for a sua informação, mais utilizadores subscrevem e mais você ganha."
2. **As suas Zonas** — "Aqui vê as zonas que lhe foram atribuídas e os ATMs de cada uma. Actualize o estado regularmente."
3. **Como ganhar dinheiro** — "Recebe uma percentagem de cada subscrição na sua zona. O valor disponível aparece no topo. Quanto mais ATMs activos e informação recente, maior o preço e mais subscrições atrai."
4. **Link de Referência** — "Partilhe o seu link de referência! Quando alguém subscreve com o seu código, o utilizador recebe desconto e você ganha comissão extra. Copie e envie nas redes sociais."
5. **Levantamentos** — "Quando o saldo estiver disponível (após expiração da subscrição), solicite o levantamento. Certifique-se de que o IBAN está preenchido no seu perfil."
6. **Avaliação** — "Os utilizadores avaliam a fiabilidade da sua informação. Mantenha um bom score para atrair mais subscrições."

**Supervisor (aparece em `/dashboard`):**
1. **Bem-vindo, Supervisor!** — "Gere zonas, ATMs e agentes. O seu trabalho é garantir que a plataforma funciona bem e gera receita."
2. **Gestão de Zonas e ATMs** — "Crie zonas em áreas com alta concentração de ATMs. Atribua agentes estrategicamente — agentes próximos respondem mais rápido."
3. **Subscrições** — "Aprove subscrições pendentes rapidamente. Cada atraso é um utilizador que pode desistir e receita perdida."
4. **Monitorização de Agentes** — "Use o painel de Análise de Agentes para verificar quem está activo e quem precisa de acompanhamento. Scores baixos indicam problemas."
5. **Divulgação** — "Incentive os agentes a partilhar os links de referência. Mais divulgação = mais subscrições = mais receita para todos."

**Utilizador (aparece em `/` após login):**
1. **Bem-vindo ao Dinheiro em Mão!** — "Encontre ATMs com dinheiro perto de si, em tempo real."
2. **Zonas** — "A informação está organizada por zonas. Cada zona cobre uma área geográfica com vários ATMs."
3. **Mapa** — "Use a vista de mapa para encontrar zonas perto de si. Pode alternar entre grelha e mapa."
4. **Como subscrever** — "Escolha uma zona, faça o pagamento por referência e aguarde a aprovação. Depois, veja o estado de todos os ATMs em tempo real."
5. **Bónus de Referência** — "Tem um código de um agente? Use-o ao subscrever para ter desconto! Pode encontrar códigos nas redes sociais."

---

### Parte 3 — Notificações Automáticas de Eventos

Actualmente a tabela `notifications` existe e é usada para notificar o utilizador (aprovação/rejeição). Falta notificar:

**3a. Agente notificado quando alguém subscreve a sua zona**

**Ficheiro: `src/components/PaymentModal.tsx`** (no `handleConfirmPayment`, após criar a subscrição com sucesso)

- Consultar `agent_zones` para encontrar o `agent_id` daquela zona
- Inserir notificação: *"Nova subscrição pendente na zona {nome}! Um utilizador subscreveu. Aguarde a aprovação pelo supervisor."*

**3b. Admin/Supervisor notificado quando há subscrição pendente**

**Ficheiro: `src/components/PaymentModal.tsx`** (mesmo local)

- Consultar `user_roles` para encontrar todos os admins e supervisores
- Inserir notificação para cada um: *"Nova subscrição pendente — {nome_utilizador} subscreveu a zona {nome_zona}. Aprove em Subscrições."*

**3c. Financeiro notificado quando agente solicita levantamento**

**Ficheiro: `src/components/WithdrawalModal.tsx`** (após insert do withdrawal com sucesso)

- Consultar `user_roles` para encontrar todos os financeiros e admins
- Inserir notificação: *"Novo pedido de levantamento de {valor} KZ do agente {nome}. Processe em Levantamentos."*

**RLS:** A política actual de INSERT em `notifications` só permite admin/supervisor. Precisamos de uma nova policy ou usar uma abordagem diferente:
- **Solução:** Criar uma database function `SECURITY DEFINER` chamada `notify_users_by_role(role, title, message)` que insere notificações para todos os utilizadores com aquele role, contornando RLS. Isto é seguro porque a função controla exactamente o que é inserido.

---

### Parte 4 — Exibição de Notificações

**Novo ficheiro: `src/components/NotificationBell.tsx`**

Ícone de sino no header/sidebar que mostra:
- Badge com contagem de não lidas
- Dropdown/popover com lista de notificações recentes
- Marcar como lida ao clicar
- Link para a acção relevante (ex: "Aprove em Subscrições" → link para `/dashboard/subscriptions`)

**Ficheiros a modificar:**
- `src/components/DashboardLayout.tsx` — adicionar `NotificationBell` no header
- `src/components/Header.tsx` — adicionar `NotificationBell` para utilizadores logados

---

### Parte 5 — Integração do Onboarding

**Ficheiros a modificar:**
- `src/pages/AgentDashboard.tsx` — importar e renderizar `OnboardingGuide` com conteúdo de agente
- `src/pages/Dashboard.tsx` — renderizar `OnboardingGuide` com conteúdo de supervisor
- `src/pages/Index.tsx` — renderizar `OnboardingGuide` com conteúdo de utilizador (se logado e primeira vez)

---

### Resumo de ficheiros

| Ficheiro | Alteração |
|---|---|
| BD (migration) | Criar função `notify_users_by_role` SECURITY DEFINER |
| `src/components/OnboardingGuide.tsx` | **Criar** — componente de tour por passos |
| `src/components/NotificationBell.tsx` | **Criar** — ícone com dropdown de notificações |
| `src/components/PaymentModal.tsx` | Notificar agente + admins/supervisores na nova subscrição |
| `src/components/WithdrawalModal.tsx` | Notificar financeiros + admins no pedido de levantamento |
| `src/pages/AgentDashboard.tsx` | Adicionar onboarding de agente |
| `src/pages/Dashboard.tsx` | Adicionar onboarding de supervisor |
| `src/pages/Index.tsx` | Adicionar onboarding de utilizador |
| `src/components/DashboardLayout.tsx` | Adicionar NotificationBell |
| `src/components/Header.tsx` | Adicionar NotificationBell |

