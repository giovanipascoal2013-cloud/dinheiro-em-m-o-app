

## Plano: Proteger informação de ATMs no mapa público

### Problema

O mapa actual revela o estado dos ATMs (verde/vermelho/cinza) a **todos os visitantes**, incluindo não autenticados e não subscritos. As cores e a legenda entregam a informação sem necessidade de subscrição, anulando o modelo de negócio.

Além disso, ATMs sem zona associada (`zone_id = null`) mostram popup com dados completos — deviam apresentar uma mensagem para contactar o suporte.

### Solução

#### 1. Ícones neutros para não-subscritores

- Todos os ATMs cujo `zone_id` **não** esteja no `subscribedZoneIds` usam um **ícone neutro azul** (cor única, sem revelar estado).
- Apenas ATMs de zonas subscritas mantêm o ícone colorido (verde/vermelho/cinza).

#### 2. Legenda condicional

- A legenda (verde/vermelho/cinza) só aparece se `subscribedZoneIds.size > 0`.
- Se não houver subscrições, mostrar legenda genérica: "Subscreva uma zona para ver o estado dos ATMs".

#### 3. Comportamento ao clicar num ATM

**Caso A — Subscrito à zona:** Popup com informação completa (como está hoje).

**Caso B — Não subscrito mas ATM tem zona:** Card inferior com info da zona + botão "Subscrever Zona" (já existe).

**Caso C — ATM sem zona (`zone_id = null`):** Popup com mensagem:
> "Este ATM ainda não está coberto por nenhuma zona. Contacte o suporte para solicitar a activação."
> Botão com link para WhatsApp do suporte (número já usado no footer: +244 933 986 318).

#### 4. Notificação ao suporte (futuro simples)

Por agora, o botão abre o WhatsApp com mensagem pré-preenchida contendo o ID do ATM. Sem necessidade de tabela nova.

---

### Ficheiro a modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/ZonesMap.tsx` | Ícone neutro, legenda condicional, popup caso C, lógica de clique revista |

### Detalhes técnicos

- Novo ícone: `createATMIcon('#3b82f6')` (azul neutro) para ATMs não-subscrito
- Selecção de ícone: `isSubscribed ? (colorByStatus) : neutralIcon`
- Popup caso C: link `https://wa.me/244933986318?text=...` com ID do ATM
- Sem alterações na base de dados

