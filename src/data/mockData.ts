import { Zone, ATM, Agent, User, Subscription } from '@/types';

// Mock zones data
export const mockZones: Zone[] = [
  {
    id: 'zone-1',
    nome: 'Centro de Luanda',
    centro_geo: { lat: -8.8383, long: 13.2344 },
    raio_metros: 1200,
    atm_count: 12,
    price_kz: 600,
    agent_id: 'agent-1',
    reputation_score: 4.2,
    likes: 156,
    dislikes: 37,
    status: 'ativa',
    cidade: 'Luanda',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-20T14:30:00Z',
  },
  {
    id: 'zone-2',
    nome: 'Talatona',
    centro_geo: { lat: -8.9167, long: 13.2000 },
    raio_metros: 1000,
    atm_count: 8,
    price_kz: 400,
    agent_id: 'agent-2',
    reputation_score: 4.8,
    likes: 89,
    dislikes: 5,
    status: 'ativa',
    cidade: 'Luanda',
    created_at: '2024-02-10T08:00:00Z',
    updated_at: '2024-12-20T12:15:00Z',
  },
  {
    id: 'zone-3',
    nome: 'Morro Bento',
    centro_geo: { lat: -8.8500, long: 13.2167 },
    raio_metros: 800,
    atm_count: 6,
    price_kz: 300,
    agent_id: 'agent-3',
    reputation_score: 3.9,
    likes: 45,
    dislikes: 17,
    status: 'ativa',
    cidade: 'Luanda',
    created_at: '2024-03-05T14:00:00Z',
    updated_at: '2024-12-19T09:45:00Z',
  },
  {
    id: 'zone-4',
    nome: 'Viana Centro',
    centro_geo: { lat: -8.9000, long: 13.3833 },
    raio_metros: 1500,
    atm_count: 10,
    price_kz: 500,
    agent_id: 'agent-1',
    reputation_score: 2.1,
    likes: 22,
    dislikes: 31,
    status: 'ativa',
    cidade: 'Luanda',
    created_at: '2024-01-20T16:00:00Z',
    updated_at: '2024-12-18T11:20:00Z',
  },
  {
    id: 'zone-5',
    nome: 'Benguela Cidade',
    centro_geo: { lat: -12.5763, long: 13.4055 },
    raio_metros: 1100,
    atm_count: 7,
    price_kz: 350,
    agent_id: 'agent-4',
    reputation_score: 4.5,
    likes: 67,
    dislikes: 9,
    status: 'ativa',
    cidade: 'Benguela',
    created_at: '2024-04-01T10:30:00Z',
    updated_at: '2024-12-20T08:00:00Z',
  },
  {
    id: 'zone-6',
    nome: 'Huambo Centro',
    centro_geo: { lat: -12.7761, long: 15.7392 },
    raio_metros: 900,
    atm_count: 5,
    price_kz: 250,
    agent_id: 'agent-5',
    reputation_score: 4.0,
    likes: 34,
    dislikes: 10,
    status: 'ativa',
    cidade: 'Huambo',
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2024-12-19T15:30:00Z',
  },
];

// Mock ATMs data
export const mockATMs: ATM[] = [
  // Zone 1 - Centro de Luanda
  { id: 'atm-1', zona_id: 'zone-1', nome: 'BFA Marginal', endereco: 'Av. 4 de Fevereiro, 123', lat: -8.8390, long: 13.2350, status_atm: 'com_dinheiro', last_update_at: '2024-12-21T08:30:00Z', reported_by: 'agent-1' },
  { id: 'atm-2', zona_id: 'zone-1', nome: 'BAI Mutamba', endereco: 'Rua Major Kanhangulo, 45', lat: -8.8375, long: 13.2340, status_atm: 'com_dinheiro', last_update_at: '2024-12-21T09:15:00Z', reported_by: 'agent-1' },
  { id: 'atm-3', zona_id: 'zone-1', nome: 'BIC Shopping', endereco: 'Centro Comercial Millennium', lat: -8.8400, long: 13.2360, status_atm: 'sem_dinheiro', last_update_at: '2024-12-21T07:00:00Z', reported_by: 'agent-1' },
  { id: 'atm-4', zona_id: 'zone-1', nome: 'Millennium Atlântico', endereco: 'Av. Ho Chi Minh, 89', lat: -8.8365, long: 13.2330, status_atm: 'offline', last_update_at: '2024-12-20T18:00:00Z', reported_by: 'agent-1' },
  { id: 'atm-5', zona_id: 'zone-1', nome: 'Standard Bank Centro', endereco: 'Rua Rainha Ginga, 56', lat: -8.8385, long: 13.2355, status_atm: 'com_dinheiro', last_update_at: '2024-12-21T10:00:00Z', reported_by: 'agent-1' },
  // Zone 2 - Talatona
  { id: 'atm-6', zona_id: 'zone-2', nome: 'BFA Talatona', endereco: 'Via S11, Bloco A', lat: -8.9170, long: 13.2010, status_atm: 'com_dinheiro', last_update_at: '2024-12-21T08:00:00Z', reported_by: 'agent-2' },
  { id: 'atm-7', zona_id: 'zone-2', nome: 'BAI Belas Shopping', endereco: 'Belas Shopping Center', lat: -8.9160, long: 13.1990, status_atm: 'com_dinheiro', last_update_at: '2024-12-21T09:30:00Z', reported_by: 'agent-2' },
  { id: 'atm-8', zona_id: 'zone-2', nome: 'BIC Nova Vida', endereco: 'Urbanização Nova Vida', lat: -8.9180, long: 13.2020, status_atm: 'com_dinheiro', last_update_at: '2024-12-21T07:45:00Z', reported_by: 'agent-2' },
];

// Mock Agents
export const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    nome: 'João Silva',
    telefone: '+244923456789',
    email: 'joao.silva@email.com',
    verified: true,
    zonas: ['zone-1', 'zone-4'],
    total_likes: 178,
    total_dislikes: 68,
    avg_reputation: 3.6,
    payout_account: { banco: 'BFA', iban: 'AO06000400000030628543101', titular: 'João Silva' },
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-12-20T14:00:00Z',
  },
  {
    id: 'agent-2',
    nome: 'Maria Santos',
    telefone: '+244912345678',
    email: 'maria.santos@email.com',
    verified: true,
    zonas: ['zone-2'],
    total_likes: 89,
    total_dislikes: 5,
    avg_reputation: 4.8,
    payout_account: { banco: 'BAI', iban: 'AO06000200000087654321001', titular: 'Maria Santos' },
    created_at: '2024-02-05T08:00:00Z',
    updated_at: '2024-12-20T12:00:00Z',
  },
];

// Mock current user
export const mockCurrentUser: User = {
  id: 'user-1',
  telefone: '+244934567890',
  subscribed_zones: [
    { zona_id: 'zone-1', expiry_date: '2025-03-20T00:00:00Z' },
    { zona_id: 'zone-2', expiry_date: '2025-02-15T00:00:00Z' },
  ],
  role: 'user',
  last_login: '2024-12-21T08:00:00Z',
  created_at: '2024-06-01T10:00:00Z',
};

// Helper functions
export const getZoneById = (id: string): Zone | undefined => mockZones.find(z => z.id === id);
export const getATMsByZoneId = (zoneId: string): ATM[] => mockATMs.filter(atm => atm.zona_id === zoneId);
export const getAgentById = (id: string): Agent | undefined => mockAgents.find(a => a.id === id);
export const isUserSubscribed = (userId: string, zoneId: string): boolean => {
  const user = mockCurrentUser;
  if (user.id !== userId) return false;
  const sub = user.subscribed_zones.find(s => s.zona_id === zoneId);
  if (!sub) return false;
  return new Date(sub.expiry_date) > new Date();
};

export const calculateZonePrice = (atmCount: number): number => atmCount * 50;
