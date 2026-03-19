

## Plano: Adaptar DB para CSV + Importar ATMs + Manter Mapbox

### 1. Corrigir build (dependências)

**Ficheiro:** `package.json`
- Remover `@vis.gl/react-google-maps` (que quebrou o build)
- Manter `mapbox-gl` e `@types/mapbox-gl`

### 2. Migração DB: Adicionar colunas à tabela `atms`

O CSV tem colunas que não existem na tabela actual. Adicionar:

| Coluna CSV | Nova coluna DB | Tipo | Default |
|---|---|---|---|
| cidade | `cidade` | text | null |
| Fila | `fila` | text | null |
| papel | `has_paper` | boolean | true |
| provincia | `provincia` | text | null |
| status | `status` | text | 'Operacional' |

```sql
ALTER TABLE public.atms
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS fila text,
  ADD COLUMN IF NOT EXISTS has_paper boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Operacional';
```

### 3. Importar 113 ATMs do CSV

Usar a ferramenta de inserção para fazer INSERT dos 113 ATMs. Mapeamento:
- `name` → `bank_name`
- `cash` ("Sim"/"Não") → `has_cash` (true/false)
- `papel` ("Sim"/"Não") → `has_paper` (true/false)
- `status` ("Operacional"/"Sob Manutenção"/"Fora de Serviço") → `status`
- `zone_id` → null (atribuir depois)

### 4. Actualizar formulário e listagem de ATMs

**Ficheiro:** `src/pages/dashboard/ATMs.tsx`
- Adicionar campos ao formulário: cidade, fila, has_paper, provincia, status
- Mostrar cidade, provincia e status na tabela
- Adicionar filtro por cidade e por status operacional

### 5. Actualizar tipos e cards

**Ficheiro:** `src/types/index.ts` — Actualizar interface ATM com novos campos
**Ficheiro:** `src/components/ATMList.tsx` — Adaptar ao novo campo `status` (Operacional/Sob Manutenção/Fora de Serviço) em vez de apenas `status_atm`

### 6. Mostrar ATMs no mapa

**Ficheiro:** `src/components/ZonesMap.tsx`
- Manter Mapbox como está
- Quando zoom > 13, fazer query aos ATMs e mostrar marcadores individuais
- Cores: verde = com dinheiro, vermelho = sem dinheiro, cinza = fora de serviço

### Ficheiros a modificar:
1. `package.json` — remover google maps package
2. **Migração SQL** — adicionar 5 colunas à tabela `atms`
3. **Inserção SQL** — importar 113 ATMs do CSV
4. `src/pages/dashboard/ATMs.tsx` — formulário e listagem com novos campos
5. `src/components/ATMList.tsx` — adaptar status
6. `src/types/index.ts` — actualizar tipos
7. `src/components/ZonesMap.tsx` — mostrar ATMs ao fazer zoom

