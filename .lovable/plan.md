

## Plano: Corrigir fluxo de pagamento — 3 problemas de usabilidade

### Problemas identificados

1. **Referência muda ao reabrir o modal** — O utilizador paga, envia comprovativo pelo WhatsApp, fecha o modal sem clicar "Já paguei". Ao reabrir, gera-se uma nova referência diferente da enviada.
2. **Login exigido só no fim** — O utilizador completa todo o processo de pagamento e só ao clicar "Já paguei" descobre que precisa de login.
3. **Campo de código de referência distrai** — É o primeiro elemento interactivo, e utilizadores sem código não sabem o que preencher.

### Soluções

**Problema 1 — Persistir a referência por zona**

- Ao gerar a referência, guardar no `localStorage` com chave `payment_ref_{zoneId}`
- Ao abrir o modal, verificar se já existe uma referência guardada para aquela zona; se sim, reutilizá-la em vez de gerar nova
- Limpar do `localStorage` apenas após o clique em "Já paguei" (step `pending`)
- Adicionar alerta visual: "⚠️ Não feche esta janela sem clicar em 'Já paguei' após efectuar o pagamento"

**Problema 2 — Exigir login ANTES de abrir o modal**

- No `ZoneDetail.tsx`, ao clicar no botão "Subscrever", verificar se `user` existe
- Se não estiver logado, redirecionar para `/auth` com `redirectTo` de volta à zona (ex: `/auth?redirect=/zona/${id}`)
- Assim o modal nunca abre sem sessão activa
- Remover a verificação tardia de login dentro do `handleConfirmPayment` (já não será necessária)

**Problema 3 — Esconder o campo de referência por defeito**

- Mover o campo de código de referência para baixo (depois dos dados de pagamento, antes do botão "Já paguei")
- Mostrar apenas um link/botão discreto: "Tem um código de desconto?"
- Ao clicar, expande e mostra o input
- Se `initialRefCode` vier preenchido (via URL), expandir automaticamente
- Isto evita que utilizadores sem código fiquem confusos

### Alteração de ordem no modal (de cima para baixo)

```text
1. Resumo da zona + preço
2. Instruções de pagamento (Entidade, Referência, Valor, Ref. Plataforma, WhatsApp)
3. ⚠️ Aviso: "NÃO feche sem clicar Já paguei"
4. Link discreto "Tem um código de desconto?" → expande campo
5. Botão "Já paguei"
```

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/PaymentModal.tsx` | Persistir ref no localStorage; reordenar layout; esconder campo referência; melhorar avisos |
| `src/pages/ZoneDetail.tsx` | Bloquear abertura do modal sem login; redirecionar para `/auth?redirect=...` |

