

## Plano: Bloquear subscrição duplicada pendente na mesma zona

### Problema
Um utilizador pode clicar "Subscrever" várias vezes e criar múltiplas subscrições pendentes para a mesma zona.

### Solução

**Ficheiro: `src/components/PaymentModal.tsx`**

Antes de inserir a transacção e subscrição (linha ~98), adicionar uma verificação:

1. Consultar `subscriptions` filtrando por `user_id`, `zone_id` e `status = 'pending'`
2. Se existir registo, mostrar erro: *"Já tem uma subscrição pendente para esta zona. Aguarde a aprovação ou contacte o suporte."*
3. Não prosseguir com o insert

Isto é uma verificação client-side simples adicionada no `handleConfirmPayment`, antes do bloco `try`.

**Ficheiro: `src/pages/ZoneDetail.tsx`**

Também no `checkSubscription`, além de verificar subscrições activas, verificar pendentes e mostrar estado "Pendente" no header da zona (em vez de apenas "Subscrito" ou bloqueado), desabilitando o botão de subscrever.

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/PaymentModal.tsx` | Verificar subscrição pendente antes de criar nova |
| `src/pages/ZoneDetail.tsx` | Detectar estado pendente e desabilitar botão |

