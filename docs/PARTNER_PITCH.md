# Dinheiro em Mão - Pitch para Parceiros

## O Problema
Em Angola, encontrar um ATM com dinheiro é um desafio diário. Os cidadãos perdem horas a procurar multicaixas funcionais, sem saber quais têm notas disponíveis.

## A Solução
**Dinheiro em Mão** é um marketplace de informação em tempo real sobre ATMs, organizado por zonas geográficas e verificado por agentes locais.

## Como Funciona

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    AGENTES      │────▶│    PLATAFORMA   │────▶│   UTILIZADORES  │
│                 │     │                 │     │                 │
│ Verificam ATMs  │     │ Processa dados  │     │ Subscrevem zonas│
│ Ganham comissão │     │ Gere pagamentos │     │ Veem ATMs       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Modelo de Negócio
- **Subscrição trimestral** por zona
- **Preço**: Nº de ATMs × 50 KZ (ex: 10 ATMs = 500 KZ/trimestre)
- **Split**: 70% agente / 30% plataforma

## Métricas Alvo (Ano 1)

| Métrica | Meta |
|---------|------|
| Zonas ativas | 100 |
| Subscritores | 10,000 |
| MRR | 5,000,000 KZ |
| Agentes verificados | 150 |

## Oportunidade de Parceria

### Para EMIS / Multicaixa
- **Integração API**: Receber status real dos ATMs automaticamente
- **Dados**: Insights sobre uso e procura por região
- **Canal**: Comunicação direta com utilizadores

### Para Bancos
- **Visibilidade**: Destaque para ATMs da rede
- **Feedback**: Relatórios sobre problemas reportados
- **Engagement**: Alcançar clientes onde procuram dinheiro

## Pontos de Integração Técnica

### Multicaixa Express
```
Endpoint: /api/payments/multicaixa
- Iniciar pagamento
- Confirmar transação
- Webhook de notificação
```

### API de Status ATMs (proposta para EMIS)
```
GET /emis/atms/status
- Lista ATMs com estado atual
- Nível de notas disponíveis
- Último abastecimento
```

### Webhook para Bancos
```
POST /webhooks/bank
- Notificação de ATM offline
- Relatório semanal de uso
- Alertas de problemas
```

## Próximos Passos

1. **Piloto Luanda** - 20 zonas, 5 agentes, 500 utilizadores
2. **Integração Pagamentos** - Multicaixa Express
3. **Expansão** - Benguela, Huambo
4. **API Partners** - EMIS, BFA, BAI

## Contacto

**Dinheiro em Mão**
📧 parceiros@dinheiroemmao.ao
📱 +244 9XX XXX XXX

---

*Feito em Angola 🇦🇴*
