

## Plano: Corrigir preço por ATM hardcoded (500) em todos os ficheiros

### Problema
O financeiro definiu `price_per_atm = 100` na base de dados, mas vários ficheiros usam o valor `500` hardcoded em vez de consultar a configuração da plataforma. Isto afecta os preços exibidos no dashboard principal, no painel de zonas e nos cartões de zona.

### Ficheiros com o problema

| Ficheiro | Linha | Valor hardcoded |
|---|---|---|
| `src/pages/Dashboard.tsx` (RecentZonesList) | 303 | `zone.atm_count * 500` |
| `src/pages/dashboard/Zones.tsx` (detail dialog) | 185 | `zoneDetail.atms.length * 500` |
| `src/pages/dashboard/Zones.tsx` (ZoneCard) | 345 | `'Auto (500 KZ/ATM)'` |

### Solução

Usar o hook `usePricePerAtm` (já existe) em cada componente afectado para obter o valor dinâmico da tabela `platform_settings`.

**1. `src/pages/Dashboard.tsx`**
- Importar `usePricePerAtm`
- No componente `RecentZonesList`, chamar `const { pricePerAtm } = usePricePerAtm();`
- Linha 303: substituir `zone.atm_count * 500` por `zone.atm_count * pricePerAtm`

**2. `src/pages/dashboard/Zones.tsx`**
- Importar `usePricePerAtm`
- No componente `ZonesPage`, chamar `const { pricePerAtm } = usePricePerAtm();`
- Passar `pricePerAtm` ao `ZoneCard` como prop e ao cálculo do detail dialog
- Linha 185: substituir `zoneDetail.atms.length * 500` por `zoneDetail.atms.length * pricePerAtm`
- Linha 345: substituir `'Auto (500 KZ/ATM)'` por `` `Auto (${pricePerAtm} KZ/ATM)` ``

### Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `src/pages/Dashboard.tsx` | Usar `usePricePerAtm` no `RecentZonesList` |
| `src/pages/dashboard/Zones.tsx` | Usar `usePricePerAtm` no `ZonesPage`, propagar ao card e detail |

