

## Plano: Tornar o popup de partilha de zona responsivo

### Problema
O `DialogContent` no `ReferralShare.tsx` usa `sm:max-w-md` mas não tem adaptações para mobile (viewport 390px). O conteúdo pode transbordar e não há scroll interno. O link longo de referência pode quebrar o layout.

### Solução

**Ficheiro: `src/components/ReferralShare.tsx`**

- Adicionar classes mobile ao `DialogContent`: `max-h-[85vh] overflow-y-auto mx-4 rounded-xl` para garantir scroll e margens em ecrãs pequenos
- Reduzir padding interno em mobile: `p-4 sm:p-6`
- No bloco do link de referência, adicionar `min-w-0` e `break-all` para que URLs longas não estourem o layout
- Nos botões de partilha, mudar de `grid-cols-2` para `grid-cols-1 sm:grid-cols-2` em mobile para botões empilhados
- Reduzir o tamanho do código de referência em mobile: `text-base sm:text-lg`

Alteração simples, apenas um ficheiro.

