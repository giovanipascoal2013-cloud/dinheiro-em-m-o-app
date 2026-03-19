// Types for the Dinheiro em Mão application

export interface Zone {
  id: string;
  nome: string;
  centro_geo: { lat: number; long: number };
  raio_metros: number;
  atm_count: number;
  price_kz: number;
  agent_id: string;
  reputation_score: number;
  likes: number;
  dislikes: number;
  status: 'ativa' | 'suspensa';
  cidade: string;
  created_at: string;
  updated_at: string;
}

export interface ATM {
  id: string;
  zona_id: string;
  nome: string;
  endereco: string;
  lat: number;
  long: number;
  status_atm: 'com_dinheiro' | 'sem_dinheiro' | 'offline';
  last_update_at: string;
  reported_by: string;
  notes?: string;
  distance?: number;
  cidade?: string;
  fila?: string;
  has_paper?: boolean;
  provincia?: string;
  status?: string;
}

export interface Agent {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  verified: boolean;
  zonas: string[];
  total_likes: number;
  total_dislikes: number;
  avg_reputation: number;
  payout_account?: {
    banco: string;
    iban: string;
    titular: string;
  };
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  telefone: string;
  password_hash?: string;
  subscribed_zones: {
    zona_id: string;
    expiry_date: string;
  }[];
  role: 'user' | 'agent' | 'admin';
  last_login?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  zona_id: string;
  amount_kz: number;
  start_date: string;
  expiry_date: string;
  payment_ref: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
}

export interface Rating {
  id: string;
  user_id: string;
  agent_id: string;
  zona_id: string;
  value: 0 | 1;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount_kz: number;
  method: 'multicaixa_express' | 'referencia' | 'cartao';
  status: 'pending' | 'completed' | 'failed';
  ref: string;
  created_at: string;
}

export type ATMStatus = 'com_dinheiro' | 'sem_dinheiro' | 'offline';
