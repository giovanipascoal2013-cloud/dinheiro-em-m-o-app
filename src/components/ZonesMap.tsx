import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ZoneCardData } from '@/components/ZoneCard';
import { MapPin, X, MessageCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface ZonesMapProps {
  zones: ZoneCardData[];
  subscribedZoneIds?: Set<string>;
  onZoneSelect?: (zoneId: string) => void;
  className?: string;
  pricePerAtm?: number;
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

const createZoneIcon = (count: number) =>
  L.divIcon({
    className: '',
    html: `<div style="width:40px;height:40px;border-radius:50%;background:hsl(217,91%,60%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);color:white;font-weight:bold;font-size:14px;cursor:pointer;">${count}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const createATMIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;"><span style="color:white;font-size:10px;font-weight:bold;">₿</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const InvalidateSize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 500);
  }, [map]);
  return null;
};

const GeolocateOnMount: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1.5 }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [map]);
  return null;
};

export const ZonesMap: React.FC<ZonesMapProps> = ({ zones, subscribedZoneIds = new Set(), onZoneSelect, className = '', pricePerAtm = 500 }) => {
  const [selectedZone, setSelectedZone] = useState<ZoneCardData | null>(null);
  const [atms, setAtms] = useState<ATMMarkerData[]>([]);

  useEffect(() => {
    const fetchATMs = async () => {
      const { data } = await supabase.from('atms').select('id, bank_name, address, latitude, longitude, has_cash, has_paper, status, cidade, fila, zone_id');
      if (data) setAtms(data as ATMMarkerData[]);
    };
    fetchATMs();
  }, []);

  const atmIcons = useMemo(() => ({
    green: createATMIcon('#22c55e'),
    red: createATMIcon('#ef4444'),
    gray: createATMIcon('#6b7280'),
    neutral: createATMIcon('#3b82f6'),
  }), []);

  const getStatusIcon = (atm: ATMMarkerData) => {
    if (atm.status === 'Fora de Serviço') return atmIcons.gray;
    if (!atm.has_cash) return atmIcons.red;
    return atmIcons.green;
  };

  const handleViewZone = () => {
    if (selectedZone && onZoneSelect) onZoneSelect(selectedZone.id);
  };

  const hasSubscriptions = subscribedZoneIds.size > 0;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <MapContainer
        center={[-8.8390, 13.2344]}
        zoom={11}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <InvalidateSize />
        <GeolocateOnMount />

        {zones.map((zone) => (
          <Marker
            key={zone.id}
            position={[zone.latitude, zone.longitude]}
            icon={createZoneIcon(zone.atm_count ?? 0)}
            eventHandlers={{ click: () => setSelectedZone(zone) }}
          />
        ))}

        {atms.map((atm) => {
          const isSubscribed = atm.zone_id ? subscribedZoneIds.has(atm.zone_id) : false;
          const icon = isSubscribed ? getStatusIcon(atm) : atmIcons.neutral;

          return (
            <Marker
              key={atm.id}
              position={[atm.latitude, atm.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (!isSubscribed && atm.zone_id) {
                    const zone = zones.find(z => z.id === atm.zone_id);
                    if (zone) setSelectedZone(zone);
                  }
                },
              }}
            >
              {/* Caso A: Subscrito — informação completa */}
              {isSubscribed && (
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{atm.bank_name}</strong>
                    <p style={{ margin: '4px 0', fontSize: 11, color: '#888' }}>{atm.address}</p>
                    {atm.cidade && <p style={{ fontSize: 11, color: '#888' }}>{atm.cidade}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: atm.has_cash ? '#22c55e' : '#ef4444' }}>💰 {atm.has_cash ? 'Com dinheiro' : 'Sem dinheiro'}</span>
                      <span style={{ color: atm.has_paper ? '#22c55e' : '#ef4444' }}>📄 {atm.has_paper ? 'Com papel' : 'Sem papel'}</span>
                    </div>
                    {atm.fila && <p style={{ fontSize: 11, marginTop: 4 }}>🕐 {atm.fila}</p>}
                    {atm.status && atm.status !== 'Operacional' && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ {atm.status}</p>}
                  </div>
                </Popup>
              )}

              {/* Caso C: ATM sem zona — pedir suporte */}
              {!atm.zone_id && (
                <Popup>
                  <div style={{ minWidth: 180, textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{atm.bank_name}</p>
                    <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{atm.address}</p>
                    <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                      <p style={{ fontSize: 11, color: '#92400e', margin: 0 }}>
                        Este ATM ainda não está coberto por nenhuma zona.
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/244933986318?text=${encodeURIComponent(`Olá, gostaria de solicitar a activação do ATM: ${atm.bank_name} (${atm.address}). ID: ${atm.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: '#25d366', color: 'white', padding: '6px 12px',
                        borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                      }}
                    >
                      💬 Contactar Suporte
                    </a>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

      {/* Legenda condicional */}
      <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 px-3 py-2 text-xs z-[1000]">
        {hasSubscriptions ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-success inline-block" />
              <span className="text-foreground">Com dinheiro</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-destructive inline-block" />
              <span className="text-foreground">Sem dinheiro</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-muted-foreground inline-block" />
              <span className="text-foreground">Fora de serviço</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary inline-block" />
              <span className="text-foreground">Não subscrito</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Subscreva uma zona para ver o estado dos ATMs</span>
          </div>
        )}
      </div>

      {selectedZone && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-xl shadow-elegant p-4 animate-slide-up z-[1000]">
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
            <span className="text-foreground font-semibold ml-auto">{(selectedZone.price_kz > 0 ? selectedZone.price_kz : (selectedZone.atm_count ?? 0) * pricePerAtm).toLocaleString()} KZ</span>
          </div>
          <Button className="w-full mt-4" size="sm" onClick={handleViewZone}>Ver Zona</Button>
        </div>
      )}
    </div>
  );
};
