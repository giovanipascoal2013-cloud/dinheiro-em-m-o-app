# Dinheiro em Mão - Documentação Técnica

## Visão Geral
Marketplace de informação sobre ATMs agrupados por Zonas para o mercado angolano.

---

## 1. Schema da Base de Dados (SQL)

```sql
-- Tabela de Zonas
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    centro_geo_lat DECIMAL(10, 8) NOT NULL,
    centro_geo_long DECIMAL(11, 8) NOT NULL,
    raio_metros INTEGER DEFAULT 1000 CHECK (raio_metros <= 1500),
    atm_count INTEGER DEFAULT 0,
    price_kz INTEGER GENERATED ALWAYS AS (atm_count * 50) STORED,
    agent_id UUID REFERENCES agents(id),
    reputation_score DECIMAL(2, 1) DEFAULT 0.0 CHECK (reputation_score >= 0 AND reputation_score <= 5),
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'suspensa')),
    cidade VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de ATMs
CREATE TABLE atms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zona_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(255),
    lat DECIMAL(10, 8) NOT NULL,
    long DECIMAL(11, 8) NOT NULL,
    status_atm VARCHAR(20) DEFAULT 'offline' CHECK (status_atm IN ('com_dinheiro', 'sem_dinheiro', 'offline')),
    last_update_at TIMESTAMPTZ DEFAULT NOW(),
    reported_by UUID REFERENCES agents(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Agentes
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    total_likes INTEGER DEFAULT 0,
    total_dislikes INTEGER DEFAULT 0,
    avg_reputation DECIMAL(2, 1) DEFAULT 0.0,
    payout_banco VARCHAR(50),
    payout_iban VARCHAR(50),
    payout_titular VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Utilizadores
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Subscrições
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    zona_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    amount_kz INTEGER NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    payment_ref VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, zona_id, start_date)
);

-- Tabela de Avaliações
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    zona_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CHECK (value IN (0, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Transações
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount_kz INTEGER NOT NULL,
    method VARCHAR(30) DEFAULT 'multicaixa_express' CHECK (method IN ('multicaixa_express', 'referencia', 'cartao')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Moderação/Audit
CREATE TABLE moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('zone', 'atm', 'agent')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    reporter_user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_zones_cidade ON zones(cidade);
CREATE INDEX idx_zones_status ON zones(status);
CREATE INDEX idx_atms_zona_id ON atms(zona_id);
CREATE INDEX idx_atms_status ON atms(status_atm);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expiry_date);
CREATE INDEX idx_ratings_user_zona ON ratings(user_id, zona_id);

-- Trigger para atualizar reputation_score
CREATE OR REPLACE FUNCTION update_reputation_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE zones
    SET reputation_score = ROUND((likes::DECIMAL / NULLIF(likes + dislikes, 0)) * 5, 1),
        updated_at = NOW()
    WHERE id = NEW.zona_id;
    
    UPDATE agents
    SET avg_reputation = (
        SELECT ROUND(AVG(reputation_score), 1)
        FROM zones WHERE agent_id = (SELECT agent_id FROM zones WHERE id = NEW.zona_id)
    ),
    total_likes = total_likes + CASE WHEN NEW.value = 1 THEN 1 ELSE 0 END,
    total_dislikes = total_dislikes + CASE WHEN NEW.value = 0 THEN 1 ELSE 0 END
    WHERE id = (SELECT agent_id FROM zones WHERE id = NEW.zona_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reputation
AFTER INSERT ON ratings
FOR EACH ROW EXECUTE FUNCTION update_reputation_score();
```

---

## 2. Endpoints da API (RESTful)

### Autenticação

```
POST /api/auth/register
Request:
{
  "telefone": "+244923456789",
  "password": "senhaSegura123"
}
Response (201):
{
  "id": "uuid",
  "telefone": "+244923456789",
  "role": "user",
  "created_at": "2024-12-21T10:00:00Z"
}

POST /api/auth/login
Request:
{
  "telefone": "+244923456789",
  "password": "senhaSegura123"
}
Response (200):
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "telefone": "+244923456789",
    "role": "user"
  }
}
```

### Zonas

```
GET /api/zones?cidade=Luanda&sort=rating&limit=20&offset=0
Response (200):
{
  "data": [
    {
      "id": "zone-1",
      "nome": "Centro de Luanda",
      "cidade": "Luanda",
      "atm_count": 12,
      "price_kz": 600,
      "reputation_score": 4.2,
      "likes": 156,
      "dislikes": 37,
      "status": "ativa"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}

GET /api/zones/:id
Headers: Authorization: Bearer {token}
Response (200 - se subscrito):
{
  "id": "zone-1",
  "nome": "Centro de Luanda",
  "atms": [
    {
      "id": "atm-1",
      "nome": "BFA Marginal",
      "status_atm": "com_dinheiro",
      "last_update_at": "2024-12-21T08:30:00Z"
    }
  ],
  "agent": {
    "id": "agent-1",
    "nome": "João Silva",
    "verified": true
  }
}
Response (403 - não subscrito):
{
  "error": "subscription_required",
  "price_kz": 600
}

POST /api/zones/:id/subscribe
Headers: Authorization: Bearer {token}
Request:
{
  "payment_method": "multicaixa_express",
  "payment_ref": "MCX123456789"
}
Response (201):
{
  "subscription": {
    "id": "sub-uuid",
    "zona_id": "zone-1",
    "start_date": "2024-12-21",
    "expiry_date": "2025-03-21",
    "status": "active"
  },
  "transaction": {
    "id": "tx-uuid",
    "amount_kz": 600,
    "ref": "MCX123456789"
  }
}

POST /api/zones/:id/rate
Headers: Authorization: Bearer {token}
Request:
{
  "value": 1  // 1 = like, 0 = dislike
}
Response (201):
{
  "id": "rating-uuid",
  "message": "Avaliação registada"
}
Response (429 - rate limited):
{
  "error": "rate_limit_exceeded",
  "message": "Só pode avaliar uma vez a cada 24 horas"
}
```

### ATMs

```
POST /api/atms/:id/report
Headers: Authorization: Bearer {token}
Request:
{
  "description": "ATM está offline mas mostra com dinheiro"
}
Response (201):
{
  "report_id": "uuid",
  "message": "Denúncia registada para investigação"
}
```

### Agentes

```
GET /api/agents/:id/metrics
Headers: Authorization: Bearer {token} (agent role required)
Response (200):
{
  "total_zones": 2,
  "total_atms": 22,
  "total_likes": 178,
  "total_dislikes": 68,
  "avg_reputation": 3.6,
  "pending_payout_kz": 12600,
  "next_payout_date": "2025-01-15"
}

PATCH /api/atms/:id/status
Headers: Authorization: Bearer {token} (agent role required)
Request:
{
  "status_atm": "com_dinheiro"
}
Response (200):
{
  "id": "atm-1",
  "status_atm": "com_dinheiro",
  "last_update_at": "2024-12-21T10:30:00Z"
}
```

### Admin

```
GET /api/admin/reports?status=pending
Headers: Authorization: Bearer {token} (admin role required)
Response (200):
{
  "data": [
    {
      "id": "report-uuid",
      "target_type": "atm",
      "target_id": "atm-1",
      "reason": "Informação incorreta",
      "status": "pending",
      "created_at": "2024-12-20T15:00:00Z"
    }
  ]
}

POST /api/admin/zones/:id/suspend
Headers: Authorization: Bearer {token} (admin role required)
Response (200):
{
  "message": "Zona suspensa com sucesso"
}
```

---

## 3. Sprint Plan (6 Milestones)

### Sprint 1: MVP Base (2 semanas)
- [x] Design system e componentes UI
- [x] Landing page com cards de zonas
- [x] Página de detalhes da zona
- [x] Autenticação (login/registo)
- [ ] Setup Supabase/backend

### Sprint 2: Pagamentos (2 semanas)
- [ ] Integração Multicaixa Express (sandbox)
- [ ] Fluxo de subscrição completo
- [ ] Gestão de transações
- [ ] Controle de acesso por subscrição

### Sprint 3: Sistema de Rating (1 semana)
- [ ] Avaliação de agentes (like/dislike)
- [ ] Cálculo automático de reputação
- [ ] Rate limiting (1 voto/24h)
- [ ] Alertas para baixa reputação

### Sprint 4: Painel do Agente (2 semanas)
- [ ] Dashboard completo do agente
- [ ] Atualização de status de ATMs
- [ ] Métricas e ganhos
- [ ] Histórico de payouts

### Sprint 5: Admin & Moderação (1.5 semanas)
- [ ] Painel administrativo
- [ ] Sistema de denúncias
- [ ] Suspensão de zonas/agentes
- [ ] Logs de auditoria

### Sprint 6: Testes & Deploy (1 semana)
- [ ] Testes unitários e integração
- [ ] Testes de segurança
- [ ] Documentação final
- [ ] Deploy produção

---

## 4. Regras de Negócio

### Preços
- Preço da zona = `atm_count × 50 KZ`
- Duração da subscrição = 90 dias (trimestral)

### Reputação
- Score = `(likes / (likes + dislikes)) × 5` (arredondado a 1 casa)
- Score < 2.5 → Zona marcada com alerta + notificação admin

### Payouts
- Split padrão: 70% agente / 30% plataforma
- Frequência: Mensal ou trimestral (configurável)

### Rate Limiting
- 1 avaliação por zona a cada 24 horas por utilizador

### Segurança
- Telefones normalizados para +244XXXXXXXXX
- Passwords com hash bcrypt (min 6 caracteres)
- JWT tokens para autenticação

---

## 5. Microcopies (pt-AO)

| Contexto | Texto |
|----------|-------|
| Landing hero | "Encontre ATMs com Dinheiro" |
| Landing subtitle | "Zonas verificadas por agentes locais — subscreva para aceder informações em tempo real" |
| Card CTA (não subscrito) | "Subscrever" |
| Card CTA (subscrito) | "Acessar" |
| Paywall título | "Acesso à Zona Bloqueado" |
| Paywall descrição | "Subscreva para ver o estado dos {n} ATMs e avaliar o agente. Acesso trimestral por apenas {price} KZ." |
| Payment CTA | "Pagar {price} KZ" |
| Rating CTA | "Avalie a fiabilidade do agente {nome} — ajude toda a comunidade a encontrar ATMs com dinheiro!" |
| ATM com dinheiro | "Com dinheiro" |
| ATM sem dinheiro | "Sem dinheiro" |
| ATM offline | "Offline" |
| Login título | "Entrar na sua conta" |
| Register título | "Criar nova conta" |
| Success subscription | "Subscrição ativada! Agora tem acesso à zona {nome} por 90 dias" |
| Footer | "© 2024 Dinheiro em Mão. Feito em Angola 🇦🇴" |

---

## 6. Checklist de Rollout

- [ ] Configurar ambiente de produção
- [ ] Configurar domínio e SSL
- [ ] Integração Multicaixa Express (produção)
- [ ] Verificação inicial de 3-5 agentes piloto
- [ ] Testes com utilizadores beta (50 users)
- [ ] Monitorização de erros (Sentry)
- [ ] Analytics (GA4 ou similar)
- [ ] Política de privacidade e termos
- [ ] Suporte WhatsApp configurado
- [ ] Backup automático da base de dados
