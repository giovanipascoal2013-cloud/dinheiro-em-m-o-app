

## Plano: Onboarding Guiado + Registo de ATM pelo Agente

### Visão geral

Reformular o fluxo de criação de conta para distinguir **Cliente** vs **Agente** desde o registo. Agentes recém-criados passam por um onboarding obrigatório, completam o perfil, registam pelo menos um ATM (com foto + GPS) e só acedem ao Dashboard após aprovação. Clientes recebem um onboarding opcional que sugere subscrição.

---

### 1. Tela de Auth — Selecção de tipo de conta

No registo (`/auth`), adicionar **antes** do formulário um seletor com dois cartões:
- **"Sou Cliente"** — quero consultar ATMs com dinheiro
- **"Sou Agente"** — quero registar ATMs e ganhar dinheiro

A escolha grava a intenção (`account_type`) nos metadados do signup. No login esta secção não aparece.

### 2. Atribuição automática de role + perfil pendente

Após signup como agente:
- Criar automaticamente o registo em `user_roles` com `role = 'agent'`
- Criar registo em nova tabela `agent_onboarding_progress` para rastrear o estado: `profile_completed`, `first_atm_submitted`, `first_atm_approved`

### 3. Gating de navegação (novo `AgentOnboardingGate`)

Componente que envolve `/agent` e bloqueia acesso enquanto o agente não completou o fluxo. Sempre que o agente faz login, é redirecionado para o passo onde parou:

```text
[Cria conta agente]
       ↓
[Onboarding ilustrado] ← obrigatório, primeira vez
       ↓
[/profile/setup] → preencher Nome, Província, Cidade, IBAN
       ↓
[/agent/register-atm] → tirar foto + GPS + dados
       ↓
[/agent/pending] → aguardar aprovação
       ↓
[/agent] (Dashboard desbloqueado)
```

### 4. Onboarding ilustrado do Agente (8 passos)

Substituir o `OnboardingGuide` existente por uma versão obrigatória e mais rica para agentes:

1. **Bem-vindo, Agente** — o que é ser agente na plataforma
2. **Como ganha dinheiro** — comissão por subscrição na sua zona
3. **Bónus e referências** — link de partilha gera comissão extra
4. **Partilhar zonas** — flyers automáticos com QR
5. **Registar o seu primeiro ATM** — explica que precisa estar fisicamente em frente ao ATM
6. **Foto cronometrada** — tem 2 minutos para tirar a foto a partir da câmara (não galeria)
7. **GPS obrigatório** — dispositivo deve permitir localização
8. **Aprovação** — admin valida e cria a zona com o ATM

Botão "Começar registo" no final → leva a `/profile/setup`.

### 5. Nova página `/agent/register-atm`

Fluxo em 3 etapas (stepper):

**Etapa 1: Captura de foto**
- Usar `<input type="file" accept="image/*" capture="environment">` para forçar câmara traseira (não galeria)
- Iniciar timer de **2 minutos** ao entrar no ecrã. Ao expirar, reseta tudo e mostra "Tempo esgotado, recomece o processo"
- Botão: "Tirar foto agora"

**Etapa 2: GPS + Upload**
- Imediatamente após a foto: `navigator.geolocation.getCurrentPosition()` com `enableHighAccuracy: true`
- Se utilizador recusa → bloquear progresso com mensagem "Precisamos da sua localização para registar este ATM"
- Upload da foto para Storage (`bucket: atm-photos`)
- Reverse geocoding (Nominatim/OSM) para obter endereço auto-preenchido

**Etapa 3: Dados do ATM**
- **Nome do ATM** (input livre, com placeholder "Ex: ATM BAI Kilamba, ATM BFA Bombeiros, ATM Keve Kikagil")
- **Endereço** (auto-preenchido, editável)
- **Coordenadas** (auto-preenchido, read-only com botão "Refazer GPS")
- **Dinheiro** (toggle Sim/Não)
- **Papel** (toggle Sim/Não)
- **Observações** (textarea opcional)
- Botão "Submeter para aprovação"

Após submissão → tela `/agent/pending` com ilustração "Aguardando aprovação. Será notificado quando aprovado." Não consegue avançar até aprovação.

### 6. Aprovação pelo Admin

Nova secção em `/dashboard/atms` (ou novo separador `/dashboard/atms/pending`):
- Lista de ATMs com `status = 'pending_approval'`
- Cada item mostra foto, coordenadas, dados e o agente submissor
- Acções: **Aprovar** (cria zona automaticamente OU permite atribuir a zona existente, e linka ao agente em `agent_zones`) ou **Rejeitar** (com motivo)
- Ao aprovar → notificação ao agente via tabela `notifications`; gate destrava

### 7. Onboarding de Cliente (opcional, 4 passos)

Aparece na primeira visita a `/` após signup como cliente:
1. **Bem-vindo** — o que é a plataforma
2. **Encontrar zonas** — como pesquisar ATMs perto de si
3. **Subscrever** — desbloquear info em tempo real por mês
4. **Começar agora** com dois botões: **"Subscrever primeira zona"** (vai para `/`) e **"Mais tarde"** (fecha)

Não bloqueante. Pode ser repetido a partir do botão "Rever guia" no Perfil.

### 8. Migração de agentes existentes sem ATM/zona

Job de migração: marcar todos os agentes existentes em `user_roles` que não têm linha em `agent_zones` com `agent_onboarding_progress.first_atm_submitted = false`. No próximo login serão submetidos ao mesmo gate e fluxo.

---

### Detalhes técnicos

**Novas tabelas / colunas (migração SQL):**

| Tabela | Mudança |
|---|---|
| `atms` | Adicionar `status_approval` (`pending`, `approved`, `rejected`), `submitted_by` (uuid), `photo_url` (text), `rejection_reason` (text) |
| `agent_onboarding_progress` (nova) | `agent_id`, `onboarding_seen`, `profile_completed`, `first_atm_submitted`, `first_atm_approved`, timestamps |
| Storage | Novo bucket `atm-photos` (privado, RLS: agente vê próprias, admin vê todas) |

**RLS:**
- Agentes podem `INSERT` em `atms` apenas com `status_approval = 'pending'` e `submitted_by = auth.uid()`
- Listagem pública (`Anyone can view ATMs`) filtrada para mostrar apenas `status_approval = 'approved'`
- Admins/Supervisores podem `UPDATE status_approval` e criar zonas
- Bucket `atm-photos`: política de upload restrita a agentes; leitura para admin/supervisor + dono

**Componentes novos:**
- `src/components/AgentOnboardingGate.tsx` — verifica progresso e redireciona
- `src/pages/agent/RegisterATM.tsx` — fluxo 3 etapas
- `src/pages/agent/Pending.tsx` — ecrã de espera
- `src/components/AccountTypeSelector.tsx` — cartões cliente/agente em `/auth`
- `src/pages/dashboard/PendingATMs.tsx` — fila de aprovação
- `src/components/PhotoCaptureStep.tsx`, `GpsStep.tsx`, `ATMDetailsStep.tsx`

**Componentes a alterar:**
- `Auth.tsx` — adicionar selector e gravar `account_type` em metadados; criar role automaticamente
- `App.tsx` — envolver `/agent` com `AgentOnboardingGate`; novas rotas
- `AgentDashboard.tsx` — desbloqueado só após aprovação
- `Index.tsx` — onboarding cliente opcional
- `OnboardingGuide.tsx` — suportar variante "obrigatória" (sem botão pular)
- `handle_new_user` (DB function) — atribuir role agent automaticamente se metadata `account_type = 'agent'`

**Geolocalização:** Browser API `getCurrentPosition` com `enableHighAccuracy: true, timeout: 15000`. Reverse geocode via Nominatim (já compatível com Leaflet usado no projecto).

**Timer de 2 minutos:** `useEffect` com `setTimeout` que limpa estado e mostra toast ao expirar; cancela se utilizador completa antes.

**Notificações:** usar função existente `notify_user(_user_id, _title, _message, _type)` quando ATM aprovado/rejeitado.

