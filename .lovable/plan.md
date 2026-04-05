

## Plano: Botão "Redefinir senha" na lista de utilizadores (Dashboard Admin)

### Resumo
Adicionar um botão de acção em cada utilizador na página `/dashboard/users` que permite ao admin gerar e enviar um link de redefinição de senha. Para contas com email real, envia o link por email. Para contas telefone (`@dinheiroemao.ao`), gera uma senha temporária e mostra-a ao admin para comunicar ao utilizador.

### Abordagem

Como o reset por email só funciona com emails reais, e contas telefone usam emails fictícios, são necessárias duas estratégias:

- **Conta com email real**: chamar `resetPasswordForEmail` via uma edge function com service role key
- **Conta com telefone** (`*@dinheiroemao.ao`): chamar `admin.updateUserById` na edge function para definir uma nova senha temporária, e mostrá-la ao admin num dialog

### 1. Edge Function `admin-reset-password`

- Recebe `{ user_id }` no body
- Verifica que quem chama é admin (via `has_role`)
- Busca o email do utilizador via `admin.getUserById`
- Se email **não** termina em `@dinheiroemao.ao`: chama `resetPasswordForEmail` → responde `{ method: 'email' }`
- Se email termina em `@dinheiroemao.ao`: gera senha aleatória de 8 chars, chama `admin.updateUserById({ password })` → responde `{ method: 'temporary', tempPassword }`

### 2. Página Users.tsx

- Adicionar botão `Key` (ícone) em cada linha de utilizador
- Ao clicar, abre dialog de confirmação com o nome do utilizador
- Ao confirmar, chama a edge function
- Se resposta `method: 'email'`: toast "Link de redefinição enviado para o email do utilizador"
- Se resposta `method: 'temporary'`: mostra dialog com a senha temporária para o admin copiar e enviar ao utilizador via WhatsApp

### Ficheiros

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/admin-reset-password/index.ts` | **Criar** — edge function |
| `src/pages/dashboard/Users.tsx` | Adicionar botão + dialogs de reset |

