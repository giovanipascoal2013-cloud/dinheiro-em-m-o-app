import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZoneCardData } from '@/components/ZoneCard';
import { MapPin, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZonesMapProps {
  zones: ZoneCardData[];
  onZoneSelect?: (zoneId: string) => void;
  className?: string;
}

const MAPBOX_TOKEN_KEY = 'mapbox_token';

export const ZonesMap: React.FC<ZonesMapProps> = ({ zones, onZoneSelect, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem(MAPBOX_TOKEN_KEY) || '');
  const [isTokenSet, setIsTokenSet] = useState(() => !!localStorage.getItem(MAPBOX_TOKEN_KEY));
  const [tokenInput, setTokenInput] = useState('');
  const [selectedZone, setSelectedZone] = useState<ZoneCardData | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const handleSetToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setIsTokenSet(true);
      setMapError(null);
    }
  };

  const handleResetToken = () => {
    localStorage.removeItem(MAPBOX_TOKEN_KEY);
    setMapboxToken('');
    setIsTokenSet(false);
    setTokenInput('');
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [13.2344, -8.8390],
        zoom: 11,
        pitch: 45,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      map.current.on('error', (e) => {
        const error = e.error as { status?: number } | undefined;
        if (error?.status === 401) {
          setMapError('Token inválido. Por favor, verifique o seu token Mapbox.');
          handleResetToken();
        }
      });

      map.current.on('load', () => addZoneMarkers());
    } catch {
      setMapError('Erro ao inicializar o mapa.');
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken]);

  const addZoneMarkers = () => {
    if (!map.current) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    zones.forEach((zone) => {
      const el = document.createElement('div');
      el.className = 'zone-marker';
      el.innerHTML = `
        <div class="relative cursor-pointer group">
          <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
            <span class="text-primary-foreground font-bold text-sm">${zone.atm_count ?? 0}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 -z-10"></div>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedZone(zone);
        map.current?.flyTo({
          center: [zone.longitude, zone.latitude],
          zoom: 14,
          duration: 1000,
        });
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([zone.longitude, zone.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (map.current && isTokenSet) addZoneMarkers();
  }, [zones, isTokenSet]);

  const handleViewZone = () => {
    if (selectedZone && onZoneSelect) onZoneSelect(selectedZone.id);
  };

  if (!isTokenSet) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-card border border-border ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="relative p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Mapa de Zonas</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Para ver o mapa interactivo, introduza o seu token público do Mapbox.{' '}
            <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
          </p>
          {mapError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {mapError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="text"
              placeholder="pk.eyJ1Ijo..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 h-11 px-4 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
            />
            <Button onClick={handleSetToken} disabled={!tokenInput.trim()}>Activar Mapa</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      <button
        onClick={handleResetToken}
        className="absolute top-3 left-3 p-2 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
        title="Alterar token Mapbox"
      >
        <Navigation className="h-4 w-4" />
      </button>

      {selectedZone && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-xl shadow-elegant p-4 animate-slide-up">
          <button onClick={() => setSelectedZone(null)} className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{selectedZone.name}</h4>
              {selectedZone.description && <p className="text-sm text-muted-foreground">{selectedZone.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">{selectedZone.atm_count ?? 0} ATMs</span>
            <span className="text-foreground font-semibold ml-auto">{selectedZone.price_kz.toLocaleString()} KZ</span>
          </div>
          <Button className="w-full mt-4" size="sm" onClick={handleViewZone}>Ver Zona</Button>
        </div>
      )}

      <style>{`
        .zone-marker { cursor: pointer; }
        .zone-marker > div { animation: markerPulse 2s infinite; }
        @keyframes markerPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
    </div>
  );
};
