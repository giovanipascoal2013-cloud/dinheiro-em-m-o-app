

## Plano: Implementar "Esqueceu a senha?"

### Resumo
Substituir o toast placeholder por um fluxo completo de recuperação de senha com duas partes: envio do email de reset e página para definir nova senha.

### 1. Página de Reset de Senha (`src/pages/ResetPassword.tsx`)

- Página pública que verifica `type=recovery` no URL hash
- Formulário com campo "Nova senha" e "Confirmar nova senha" (com toggle de visibilidade)
- Chama `supabase.auth.updateUser({ password })` ao submeter
- Após sucesso, redireciona para `/auth` com toast de confirmação
- Se não houver token de recovery válido, mostra mensagem de erro com link para `/auth`
- UI consistente com a página Auth (mesmo header com logo, footer, inputClasses)

### 2. Modificar Auth.tsx

- Substituir o `onClick` do botão "Esqueceu a senha?" para mostrar um mini-formulário inline (ou modal) que:
  - Pede o email ou telefone (conforme o `loginMethod` activo)
  - Se telefone: converte para `{phone}@dinheiroemao.ao`
  - Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
  - Mostra toast de sucesso: "Se a conta existir, receberá um email com instruções"

### 3. Rota no App.tsx

- Adicionar `<Route path="/reset-password" element={<ResetPassword />} />` como rota pública

### Ficheiros

| Ficheiro | Alteração |
|---|---|
| `src/pages/ResetPassword.tsx` | **Criar** — formulário de nova senha |
| `src/pages/Auth.tsx` | Modificar — fluxo de recuperação no botão |
| `src/App.tsx` | Modificar — adicionar rota `/reset-password` |

