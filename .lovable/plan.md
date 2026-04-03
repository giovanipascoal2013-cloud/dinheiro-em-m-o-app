

## Plano: Corrigir precificação dinâmica em toda a aplicação

### Problema identificado

O preço base por ATM (`platform_settings.price_per_atm`) é alterado no dashboard financeiro, mas **3 locais** continuam a usar o valor hardcoded `500` em vez de ler da base de dados:

1. **`ZoneCard.tsx` (linha 74)** — `(zone.atm_count ?? 0) * 500` hardcoded
2. **`ZoneDetail.tsx` (linha 86)** — `atms.length * 500` hardcoded
3. **`ZonesMap.tsx` (linha 204)** — mostra `zone.price_kz` directamente (0 KZ para zonas automáticas) sem calcular o preço efectivo

### Solução

**Abordagem**: Carregar `platform_settings.price_per_atm` nos componentes que mostram preços e usar esse valor no cálculo.

#### 1. `ZoneCard.tsx`
- Adicionar prop `pricePerAtm: number` (default 500)
- Substituir `* 500` por `* pricePerAtm`

#### 2. `Index.tsx` (consumidor do ZoneCard)
- Fazer fetch de `platform_settings` com key `price_per_atm` no `useEffect`
- Passar `pricePerAtm` como prop a cada `ZoneCard`

#### 3. `ZoneDetail.tsx`
- Fazer fetch de `platform_settings.price_per_atm` no `useEffect` existente
- Substituir `atms.length * 500` por `atms.length * pricePerAtm`

#### 4. `ZonesMap.tsx`
- Adicionar prop `pricePerAtm: number` (default 500)
- No popup da zona seleccionada, calcular preço efectivo: `zone.price_kz > 0 ? zone.price_kz : (zone.atm_count ?? 0) * pricePerAtm`

#### 5. `Index.tsx` → `ZonesMap`
- Passar `pricePerAtm` ao componente `ZonesMap`

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/ZoneCard.tsx` | Nova prop `pricePerAtm`, usar no cálculo |
| `src/components/ZonesMap.tsx` | Nova prop `pricePerAtm`, preço efectivo no popup |
| `src/pages/Index.tsx` | Fetch `platform_settings`, passar prop aos filhos |
| `src/pages/ZoneDetail.tsx` | Fetch `platform_settings`, substituir `* 500` |

### Impacto
- Todos os preços na landing page, cards, mapa e página de detalhe passam a reflectir o valor definido pelo financeiro
- Zero alterações na base de dados — apenas leitura da tabela `platform_settings` já existente

