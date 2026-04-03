

## Plano: Substituir Mapbox por Leaflet (sem WebGL)

### Problema
O Mapbox GL JS requer WebGL, que não está disponível no ambiente de preview do Lovable. Isto causa "Failed to initialize WebGL" e mostra "Mapa indisponível" nos mini-mapas dos formulários de criação de zonas e ATMs. O mesmo problema afecta o `ZonesMap` na landing page.

### Solução
Substituir **mapbox-gl** por **Leaflet + react-leaflet**, que usa tiles raster (sem WebGL). Isto resolve o problema em todos os ambientes.

### Ficheiros a modificar

#### 1. Instalar dependências
- `npm install leaflet react-leaflet @types/leaflet`
- Remover `mapbox-gl` e `@types/mapbox-gl`

#### 2. `src/components/MiniMap.tsx` — reescrever com Leaflet
- Usar `MapContainer`, `TileLayer`, `Marker` do react-leaflet
- Tiles: OpenStreetMap (gratuito, sem token)
- Marcador arrastável com `eventHandlers.dragend` → `onPositionChange`
- Click no mapa → mover marcador e chamar `onPositionChange`
- Manter mesma interface (`latitude`, `longitude`, `onPositionChange`, `height`)

#### 3. `src/components/ZonesMap.tsx` — reescrever com Leaflet
- Usar `MapContainer`, `TileLayer`, `Marker`, `Popup` do react-leaflet
- Tile style escuro: `CartoDB.DarkMatter` (gratuito)
- Zone markers com ícones customizados (DivIcon)
- ATM markers com cores condicionais (verde/vermelho/cinza)
- Popups nativos do Leaflet para info dos ATMs
- Card de zona seleccionada mantém-se como overlay React
- Geolocalização via `navigator.geolocation` (já existente)

#### 4. Corrigir imports de CSS
- Adicionar `import 'leaflet/dist/leaflet.css'` nos componentes
- Fix do ícone padrão do Leaflet (problema conhecido com bundlers)

### Impacto
- `MiniMap` usado em: `Zones.tsx` (form), `ATMs.tsx` (form)
- `ZonesMap` usado em: `Index.tsx` (landing page)
- Interface pública mantém-se idêntica — zero alterações nos consumidores

