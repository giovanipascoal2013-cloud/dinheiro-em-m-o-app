import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Vite bundler issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MiniMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  height?: string;
}

const MapClickHandler: React.FC<{ onPositionChange: (lat: number, lng: number) => void }> = ({ onPositionChange }) => {
  useMapEvents({
    click(e) {
      onPositionChange(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
};

const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  const prevRef = useRef({ lat, lng });

  useEffect(() => {
    if (Math.abs(prevRef.current.lat - lat) > 0.0001 || Math.abs(prevRef.current.lng - lng) > 0.0001) {
      map.flyTo([lat, lng], map.getZoom(), { duration: 0.5 });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
};

export const MiniMap: React.FC<MiniMapProps> = ({ latitude, longitude, onPositionChange, height = '200px' }) => {
  const markerRef = useRef<L.Marker>(null);

  const handleDragEnd = useCallback(() => {
    const m = markerRef.current;
    if (!m) return;
    const pos = m.getLatLng();
    onPositionChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
  }, [onPositionChange]);

  const eventHandlers = useMemo(() => ({ dragend: handleDragEnd }), [handleDragEnd]);

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          position={[latitude, longitude]}
          draggable
          ref={markerRef}
          eventHandlers={eventHandlers}
        />
        <MapClickHandler onPositionChange={onPositionChange} />
        <RecenterMap lat={latitude} lng={longitude} />
      </MapContainer>
    </div>
  );
};
