## Plano: Rodapé profissional com contactos, redes sociais e links legais

### O que será feito

Criar um componente `Footer` reutilizável com 4 secções e aplicá-lo nas páginas públicas.

### Conteúdo do rodapé

**Coluna 1 — Sobre**

- Logo + nome "Dinheiro em Mão"
- Texto: "Ajudando você a encontrar caixas eletrônicos operacionais com dinheiro disponível, economizando tempo e frustração."

**Coluna 2 — Contacte-nos**

- Email: [docflex.angola@gmail.com](mailto:docflex.angola@gmail.com) (link `mailto:`)
- Telefone: +244 933 986 318 (link `tel:`)

**Coluna 3 — Links**

- Sobre Nós (âncora ou página futura)
- Políticas e Condições de Uso (âncora ou página futura)

**Coluna 4 — Redes Sociais** (ícones com links)

- Facebook: [https://www.facebook.com/share/16vq3AX1ga/?mibextid=wwXIfr](https://www.facebook.com/share/16vq3AX1ga/?mibextid=wwXIfr)
- WhatsApp: [https://wa.me/244933986318](https://wa.me/244933986318)
- Instagram: [https://www.instagram.com/dinheiroemmao2?igsh=cWZreWJnMzQ2bGN6](https://www.instagram.com/dinheiroemmao2?igsh=cWZreWJnMzQ2bGN6)

**Barra inferior:** © 2025 Dinheiro em Mão. Feito em Angola 🇦🇴

### Ficheiros a criar/modificar

1. `**src/components/Footer.tsx**` — novo componente reutilizável
  - Layout responsivo: 4 colunas em desktop, empilhado em mobile
  - Ícones Lucide: `Mail`, `Phone`, `Facebook`, `Instagram` + ícone SVG inline para WhatsApp (Lucide não tem WhatsApp)
  - Links externos com `target="_blank"` e `rel="noopener noreferrer"`
2. **Páginas que receberão o Footer:**
  - `src/pages/Index.tsx` — substituir o footer inline actual
  - `src/pages/ZoneDetail.tsx` — adicionar no final
  - `src/pages/MyZones.tsx` — adicionar no final
  - `src/pages/Auth.tsx` — adicionar no final

As páginas do dashboard (admin/agente) não recebem este footer pois já têm o `DashboardLayout`.