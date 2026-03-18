

## Plano de Alterações

### 1. Corrigir atribuição de zonas a agentes (RLS fix)

**Problema:** A tabela `user_roles` tem apenas duas políticas de SELECT:
- "Users can view their own roles" (`user_id = auth.uid()`)
- "Admins can manage all roles" (ALL para admins)

Supervisores **não conseguem listar agentes** porque não têm permissão de SELECT sobre as rows de outros utilizadores em `user_roles`. A query `.from('user_roles').select(...).eq('role', 'agent')` retorna vazio para supervisores.

**Solução -- Migração SQL:**
- Adicionar política SELECT em `user_roles` para supervisores poderem ver todos os roles:
```sql
CREATE POLICY "Supervisors can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role));
```

### 2. Substituir Mapbox por Google Maps

**Problema:** O mapa actual usa Mapbox, requer token do utilizador e não mostra ATMs nem locais de referência.

**Solução:**
- Remover dependências `mapbox-gl` e `@types/mapbox-gl`
- Reescrever `src/components/ZonesMap.tsx` para usar Google Maps via `@vis.gl/react-google-maps` (biblioteca oficial React do Google Maps)
- Requer uma API Key do Google Maps (Maps JavaScript API + Places API)
- Usar `secrets--add_secret` para pedir a chave ao utilizador

**Funcionalidades do novo mapa:**
- **Nível de zoom baixo:** Mostra marcadores das zonas (círculos com contagem de ATMs)
- **Zoom mais preciso (>14):** Mostra marcadores individuais dos ATMs (com ícone de banco e estado com/sem dinheiro)
- **Locais próximos:** Activar a camada de Places/POI do Google Maps para mostrar referências como lojas, hospitais, etc. que ajudem a localizar os ATMs
- Ao clicar numa zona, faz flyTo e mostra card com detalhes
- Ao clicar num ATM, mostra popup com banco, endereço e estado

**Ficheiros a modificar:**
- `src/components/ZonesMap.tsx` -- reescrever completamente
- `package.json` -- remover mapbox, adicionar `@vis.gl/react-google-maps`

### 3. Buscar ATMs no mapa

- O componente `ZonesMap` receberá as zonas como prop (já acontece)
- Quando o zoom ultrapassa nível 13, faz query à tabela `atms` para as zonas visíveis no viewport e renderiza marcadores individuais
- Cores: verde = com dinheiro, vermelho = sem dinheiro

### Ficheiros a modificar:
1. **Migração SQL** -- adicionar SELECT policy para supervisores em `user_roles`
2. `src/components/ZonesMap.tsx` -- reescrever para Google Maps
3. `package.json` -- trocar mapbox por Google Maps library
4. **Secret** -- pedir Google Maps API Key ao utilizador

