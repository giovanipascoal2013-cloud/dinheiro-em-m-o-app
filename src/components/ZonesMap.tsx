import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZoneCardData } from '@/components/ZoneCard';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGluaGVpcm9lbW1hbyIsImEiOiJjbW15eG83OGcwMmlvMm9yNG1mZnJ2MmV6In0.40U0QUqTx_3joFZkLj5uFQ';

interface ZonesMapProps {
  zones: ZoneCardData[];
  subscribedZoneIds?: Set<string>;
  onZoneSelect?: (zoneId: string) => void;
  className?: string;
}

interface ATMMarkerData {
  id: string;
  bank_name: string;
  address: string;
  latitude: number;
  longitude: number;
  has_cash: boolean;
  has_paper: boolean | null;
  status: string | null;
  cidade: string | null;
  fila: string | null;
  zone_id: string | null;
}

export const ZonesMap: React.FC<ZonesMapProps> = ({ zones, subscribedZoneIds = new Set(), onZoneSelect, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const atmMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const [selectedZone, setSelectedZone] = useState<ZoneCardData | null>(null);
  const [atms, setAtms] = useState<ATMMarkerData[]>([]);

  // Fetch ATMs
  useEffect(() => {
    const fetchATMs = async () => {
      const { data } = await supabase.from('atms').select('id, bank_name, address, latitude, longitude, has_cash, has_paper, status, cidade, fila, zone_id');
      if (data) setAtms(data as ATMMarkerData[]);
    };
    fetchATMs();
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [13.2344, -8.8390],
      zoom: 11,
      pitch: 45,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    // Geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    });
    map.current.addControl(geolocate, 'top-right');

    map.current.on('load', () => {
      addZoneMarkers();
      updateATMMarkers();

      // Request geolocation
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.current?.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 13,
            duration: 1500,
          });
        },
        () => { /* keep default center */ },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });

    map.current.on('zoomend', () => {
      updateATMMarkers();
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      atmMarkersRef.current.forEach(marker => marker.remove());
      atmMarkersRef.current = [];
      map.current?.remove();
    };
  }, []);

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

  const updateATMMarkers = () => {
    if (!map.current) return;
    const zoom = map.current.getZoom();

    atmMarkersRef.current.forEach(marker => marker.remove());
    atmMarkersRef.current = [];

    if (zoom < 13) return;

    const bounds = map.current.getBounds();

    atms.forEach((atm) => {
      if (!bounds.contains([atm.longitude, atm.latitude])) return;

      let color = '#22c55e';
      if (atm.status === 'Fora de Serviço') {
        color = '#6b7280';
      } else if (!atm.has_cash) {
        color = '#ef4444';
      }

      const el = document.createElement('div');
      el.className = 'atm-marker';
      el.innerHTML = `
        <div class="cursor-pointer" style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          <span style="color:white;font-size:10px;font-weight:bold;">₿</span>
        </div>
      `;

      const isSubscribed = atm.zone_id ? subscribedZoneIds.has(atm.zone_id) : false;
      const zone = atm.zone_id ? zones.find(z => z.id === atm.zone_id) : null;

      el.addEventListener('click', (e) => {
        e.stopPropagation();

        if (isSubscribed || !atm.zone_id) {
          // Show full ATM info
          const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '260px' }).setHTML(`
            <div style="padding:8px;min-width:180px;">
              <strong style="font-size:13px;">${atm.bank_name}</strong>
              <p style="margin:4px 0;font-size:11px;color:#888;">${atm.address}</p>
              ${atm.cidade ? `<p style="font-size:11px;color:#888;">${atm.cidade}</p>` : ''}
              <div style="display:flex;gap:8px;margin-top:6px;font-size:11px;">
                <span style="color:${atm.has_cash ? '#22c55e' : '#ef4444'}">💰 ${atm.has_cash ? 'Com dinheiro' : 'Sem dinheiro'}</span>
                <span style="color:${atm.has_paper ? '#22c55e' : '#ef4444'}">📄 ${atm.has_paper ? 'Com papel' : 'Sem papel'}</span>
              </div>
              ${atm.fila ? `<p style="font-size:11px;margin-top:4px;">🕐 ${atm.fila}</p>` : ''}
              ${atm.status && atm.status !== 'Operacional' ? `<p style="font-size:11px;color:#ef4444;margin-top:4px;">⚠️ ${atm.status}</p>` : ''}
            </div>
          `);
          popup.setLngLat([atm.longitude, atm.latitude]).addTo(map.current!);
        } else if (zone) {
          // Show zone info card
          setSelectedZone(zone);
          map.current?.flyTo({
            center: [zone.longitude, zone.latitude],
            zoom: 14,
            duration: 1000,
          });
        }
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([atm.longitude, atm.latitude])
        .addTo(map.current!);

      atmMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (map.current) {
      addZoneMarkers();
      updateATMMarkers();
    }
  }, [zones, atms, subscribedZoneIds]);

  const handleViewZone = () => {
    if (selectedZone && onZoneSelect) onZoneSelect(selectedZone.id);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

      {/* Legend */}
      <div className="absolute top-3 right-14 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-success inline-block" />
          <span className="text-foreground">Com dinheiro</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-destructive inline-block" />
          <span className="text-foreground">Sem dinheiro</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-muted-foreground inline-block" />
          <span className="text-foreground">Fora de serviço</span>
        </div>
      </div>

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
