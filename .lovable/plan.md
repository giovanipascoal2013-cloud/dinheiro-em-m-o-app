

## Plano: IBAN do agente no perfil + pré-preenchimento nos levantamentos

### Resumo
Adicionar campos `iban` e `iban_titular` à tabela `profiles` para que agentes registem os seus dados bancários no perfil. O modal de levantamento pré-preenche esses dados automaticamente. O dashboard de admin já mostra os dados via `bank_details` (sem alteração necessária).

### 1. Migração de Base de Dados

Adicionar duas colunas à tabela `profiles`:

```sql
ALTER TABLE public.profiles ADD COLUMN iban text;
ALTER TABLE public.profiles ADD COLUMN iban_titular text;
```

### 2. Página de Perfil (`src/pages/Profile.tsx`)

- Importar `useAuth` para verificar `isAgent`
- Adicionar estados `iban` e `ibanTitular`
- Carregar e guardar esses campos no fetch/update do perfil
- Renderizar secção condicional (apenas para agentes) com:
  - Separador visual "Dados Bancários (Levantamentos)"
  - Campo "Titular da conta" (texto, max 120 chars)
  - Campo "IBAN" (texto, mono, placeholder `AO06 ...`, max 34 chars)
  - Nota explicativa: "Estes dados serão usados nas suas solicitações de levantamento"

### 3. Modal de Levantamento (`src/components/WithdrawalModal.tsx`)

- Ao abrir, fazer fetch do perfil do agente (`iban`, `iban_titular`)
- Pré-preencher `titular` e `iban` com os dados do perfil
- Se o agente não tiver IBAN cadastrado, mostrar aviso: "Configure o seu IBAN na página de perfil"
- Remover a selecção de método (forçar sempre IBAN, já que é o requisito)
  - **Alternativa**: manter Multicaixa Express como opção, mas pré-preencher apenas quando IBAN é seleccionado
- Os campos continuam editáveis para correcções pontuais

### 4. Sem alteração no Dashboard Admin

O `Withdrawals.tsx` já lê `bank_details` do JSON gravado na tabela `withdrawals`. Como o modal já grava `{ titular, iban, banco }`, os dados do perfil fluem automaticamente para o admin.

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| Migração SQL | +2 colunas `iban`, `iban_titular` em `profiles` |
| `src/pages/Profile.tsx` | Secção bancária condicional para agentes |
| `src/components/WithdrawalModal.tsx` | Fetch perfil, pré-preencher IBAN/titular |

