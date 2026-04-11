

## Plano: Botão "Rever Guia" no Perfil

### Alteração

Adicionar um botão no `Profile.tsx` (após os dados pessoais, antes do botão "Guardar") que limpa a flag de onboarding do `localStorage` e redireciona o utilizador para a página principal do seu cargo, onde o guia reaparecerá automaticamente.

### Lógica

- Determinar a `storageKey` correcta com base no cargo do utilizador:
  - Agente → `onboarding_seen_agent`, redireciona para `/agent`
  - Supervisor/Admin → `onboarding_seen_supervisor`, redireciona para `/dashboard`
  - Utilizador normal → `onboarding_seen_user`, redireciona para `/`
- Ao clicar: `localStorage.removeItem(storageKey)` + `navigate(destino)`

### Ficheiro a modificar

| Ficheiro | Alteração |
|---|---|
| `src/pages/Profile.tsx` | Adicionar botão "Rever guia de introdução" com ícone `BookOpen`, antes do botão Guardar. Importar `useAuth` roles para determinar a chave correcta. |

### UI

Botão discreto com `variant="outline"`, texto "Rever guia de introdução", ícone `BookOpen`. Colocado após a secção bancária (agentes) ou após cidade (utilizadores), separado por um `border-t`.

