

## Plano: Alterar instruções de pagamento para Pagamento por Referência

### Problema
O modal de pagamento mostra instruções de transferência bancária (IBAN). O método passou a ser **Pagamento por Referência** via Multicaixa, com entidade **00930** (UNITEL Money) e referência **949 344 625**.

### Alterações em `src/components/PaymentModal.tsx`

1. **Substituir constantes**:
   - Remover `COMPANY_IBAN`
   - Adicionar `PAYMENT_ENTITY = '00930'` e `PAYMENT_REFERENCE = '949 344 625'`

2. **Secção de instruções (step 'info')**:
   - Substituir o título "Dados para transferência" por "Dados para pagamento por referência"
   - Adicionar bloco explicativo: "Vai ao Multicaixa, escolhe o menu Pagamentos → Pagamentos por Referência, escolhe a entidade UNITEL Money ou insere o código da entidade 00930."
   - Substituir campo IBAN por dois campos:
     - **Entidade**: `00930` (com botão copiar)
     - **Referência de pagamento**: `949 344 625` (com botão copiar)
   - Manter campo **Valor** e campo **Referência da plataforma** (gerada automaticamente)

3. **WhatsApp — mensagem simplificada**:
   - A mensagem pré-preenchida passa a conter **apenas a referência da plataforma**: `Ref: ${paymentRef}`
   - Texto do campo: "Enviar comprovativo via WhatsApp (incluir apenas a referência da plataforma)"

4. **Aviso inferior**:
   - Alterar para: "Após o pagamento, envie o comprovativo por WhatsApp incluindo apenas a referência da plataforma para activar a sua subscrição."

5. **Método na transação**:
   - Alterar o valor de `method` no insert de `'transferencia'` para `'referencia'`

### Ficheiro a modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/PaymentModal.tsx` | Constantes, instruções, campos, mensagem WhatsApp, método da transação |

