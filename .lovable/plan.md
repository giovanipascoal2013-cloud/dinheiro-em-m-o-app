

## Plano: Geolocalização + Token hardcoded + Comportamento ATM por subscrição

### 1. Hardcode do token Mapbox

**Ficheiro:** `src/components/ZonesMap.tsx`

- Remover toda a lógica de localStorage para token (states `mapboxToken`, `isTokenSet`, `tokenInput`, funções `handleSetToken`, `handleResetToken`)
- Remover o UI de input do token (o bloco `if (!isTokenSet)`)
- Remover o botão de reset do token no mapa
- Usar directamente: `mapboxgl.accessToken = 'pk.eyJ1IjoiZGluaGVpcm9lbW1hbyIsImEiOiJjbW15eG83OGcwMmlvMm9yNG1mZnJ2MmV6In0.40U0QUqTx_3joFZkLj5uFQ'`

### 2. Pedir permissão de localização e centralizar mapa

**Ficheiro:** `src/components/ZonesMap.tsx`

- No `useEffect` de inicialização do mapa, após criar o mapa, chamar `navigator.geolocation.getCurrentPosition()`
- Se o utilizador permitir, fazer `map.flyTo({ center: [lng, lat], zoom: 13 })`
- Se negar ou falhar, manter o centro padrão de Luanda `[13.2344, -8.8390]`
- Adicionar `mapboxgl.GeolocateControl` para o utilizador poder re-centrar

### 3. Ao clicar num ATM: comportamento baseado em subscrição

**Ficheiro:** `src/components/ZonesMap.tsx`

- Adicionar prop `subscribedZoneIds: Set<string>` ao componente
- Fetch ATMs agora inclui `zone_id` no select
- Actualizar `ATMMarkerData` para incluir `zone_id: string | null`
- Ao clicar num marcador de ATM:
  - Se o ATM tem `zone_id` e o utilizador **está subscrito** a essa zona → mostrar popup com info completa do ATM (banco, endereço, dinheiro, papel, fila, estado)
  - Se **não está subscrito** → mostrar card da zona a que pertence (nome, preço, ATM count) com botão "Ver Zona" que navega para `/zone/{zoneId}`
  - Se ATM não tem `zone_id` → mostrar apenas info básica (banco e endereço)

**Ficheiro:** `src/pages/Index.tsx`

- Passar `subscribedZoneIds` como prop para `<ZonesMap>`

### Ficheiros a modificar:
1. `src/components/ZonesMap.tsx` — token hardcoded, geolocalização, lógica de clique baseada em subscrição
2. `src/pages/Index.tsx` — passar `subscribedZoneIds` ao mapa

