import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, SlidersHorizontal, X, Map, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ZoneCard, ZoneCardData } from '@/components/ZoneCard';
import { ZonesMap } from '@/components/ZonesMap';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import logoIcon from '@/assets/logo-icon.png';

const sortOptions = [
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'atms', label: 'Mais ATMs' },
  { value: 'name', label: 'Nome A-Z' },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [zones, setZones] = useState<ZoneCardData[]>([]);
  const [subscribedZoneIds, setSubscribedZoneIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user]);

  const fetchZones = async () => {
    const { data: zonesData } = await supabase
      .from('zones')
      .select('*')
      .eq('status', 'active');

    if (zonesData) {
      // Get ATM counts per zone
      const { data: atmsData } = await supabase
        .from('atms')
        .select('zone_id');

      const atmCounts: Record<string, number> = {};
      atmsData?.forEach(atm => {
        if (atm.zone_id) {
          atmCounts[atm.zone_id] = (atmCounts[atm.zone_id] || 0) + 1;
        }
      });

      setZones(zonesData.map(z => ({
        ...z,
        atm_count: atmCounts[z.id] || 0,
      })));
    }
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('zone_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString());

    if (data) {
      setSubscribedZoneIds(new Set(data.map(s => s.zone_id)));
    }
  };

  const filteredZones = useMemo(() => {
    let result = [...zones];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(z =>
        z.name.toLowerCase().includes(q) ||
        (z.description && z.description.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price_kz - b.price_kz);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price_kz - a.price_kz);
        break;
      case 'atms':
        result.sort((a, b) => (b.atm_count ?? 0) - (a.atm_count ?? 0));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [zones, searchQuery, sortBy]);

  const handleZoneClick = (zoneId: string) => {
    navigate(`/zone/${zoneId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <img src={logoIcon} alt="" className="h-16 w-16 animate-fade-in" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 animate-slide-up">
              Encontre ATMs com Dinheiro
            </h1>
            <p className="text-muted-foreground text-lg mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Zonas verificadas por agentes locais — subscreva para aceder informações em tempo real
            </p>

            <div className="relative max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar zonas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ordenar
            </button>

            <div className="h-6 w-px bg-border mx-1" />

            <div className="flex items-center bg-muted rounded-full p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="Ver em grelha"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-full transition-all ${viewMode === 'map' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="Ver no mapa"
              >
                <Map className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-3 pb-1 animate-fade-in">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { setSortBy(option.value); setShowFilters(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === option.value
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Mapa de Zonas</h2>
              <span className="text-sm text-muted-foreground">{filteredZones.length} zona{filteredZones.length !== 1 ? 's' : ''}</span>
            </div>
            <ZonesMap zones={filteredZones} subscribedZoneIds={subscribedZoneIds} onZoneSelect={handleZoneClick} className="h-[500px] md:h-[600px]" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {filteredZones.length} zona{filteredZones.length !== 1 ? 's' : ''} disponíve{filteredZones.length !== 1 ? 'is' : 'l'}
              </h2>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                  Limpar pesquisa
                </button>
              )}
            </div>

            {filteredZones.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredZones.map((zone, index) => (
                  <div key={zone.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <ZoneCard
                      zone={zone}
                      isSubscribed={subscribedZoneIds.has(zone.id)}
                      onClick={() => handleZoneClick(zone.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma zona encontrada</p>
                <Button variant="ghost" onClick={() => setSearchQuery('')} className="mt-4">
                  Ver todas as zonas
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2024 Dinheiro em Mão. Feito em Angola 🇦🇴</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
