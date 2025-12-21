import { useState, useMemo } from 'react';
import { Search, MapPin, SlidersHorizontal, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ZoneCard } from '@/components/ZoneCard';
import { Button } from '@/components/ui/button';
import { mockZones, mockCurrentUser, isUserSubscribed } from '@/data/mockData';
import logoIcon from '@/assets/logo-icon.png';

const cities = ['Todas', 'Luanda', 'Benguela', 'Huambo'];
const sortOptions = [
  { value: 'rating', label: 'Melhor avaliação' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'atms', label: 'Mais ATMs' },
];

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  const filteredZones = useMemo(() => {
    let zones = [...mockZones];

    // Filter by search
    if (searchQuery) {
      zones = zones.filter(z => 
        z.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.cidade.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity !== 'Todas') {
      zones = zones.filter(z => z.cidade === selectedCity);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        zones.sort((a, b) => b.reputation_score - a.reputation_score);
        break;
      case 'price_asc':
        zones.sort((a, b) => a.price_kz - b.price_kz);
        break;
      case 'price_desc':
        zones.sort((a, b) => b.price_kz - a.price_kz);
        break;
      case 'atms':
        zones.sort((a, b) => b.atm_count - a.atm_count);
        break;
    }

    return zones;
  }, [searchQuery, selectedCity, sortBy]);

  const handleZoneClick = (zoneId: string) => {
    navigate(`/zone/${zoneId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={true} />

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

            {/* Search bar */}
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
            {/* City filter pills */}
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCity === city
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {city !== 'Todas' && <MapPin className="h-3.5 w-3.5" />}
                {city}
              </button>
            ))}

            <div className="h-6 w-px bg-border mx-1" />

            {/* Sort button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ordenar
            </button>
          </div>

          {/* Sort options */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-3 pb-1 animate-fade-in">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setShowFilters(false);
                  }}
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

      {/* Zones grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredZones.length} zona{filteredZones.length !== 1 ? 's' : ''} disponíve{filteredZones.length !== 1 ? 'is' : 'l'}
          </h2>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Limpar pesquisa
            </button>
          )}
        </div>

        {filteredZones.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredZones.map((zone, index) => (
              <div 
                key={zone.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ZoneCard
                  zone={zone}
                  isSubscribed={isUserSubscribed(mockCurrentUser.id, zone.id)}
                  onClick={() => handleZoneClick(zone.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma zona encontrada</p>
            <Button variant="ghost" onClick={() => {setSearchQuery(''); setSelectedCity('Todas');}} className="mt-4">
              Ver todas as zonas
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Dinheiro em Mão. Feito em Angola 🇦🇴
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
