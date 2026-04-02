import React, { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGluaGVpcm9lbW1hbyIsImEiOiJjbW15eG83OGcwMmlvMm9yNG1mZnJ2MmV6In0.40U0QUqTx_3joFZkLj5uFQ';

interface MiniMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  height?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({ latitude, longitude, onPositionChange, height = '200px' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const handleDragEnd = useCallback(() => {
    if (!marker.current) return;
    const lngLat = marker.current.getLngLat();
    onPositionChange(parseFloat(lngLat.lat.toFixed(6)), parseFloat(lngLat.lng.toFixed(6)));
  }, [onPositionChange]);

  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 14,
    });

    marker.current = new mapboxgl.Marker({ draggable: true, color: 'hsl(217, 91%, 60%)' })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    marker.current.on('dragend', handleDragEnd);

    map.current.on('click', (e) => {
      marker.current?.setLngLat(e.lngLat);
      onPositionChange(parseFloat(e.lngLat.lat.toFixed(6)), parseFloat(e.lngLat.lng.toFixed(6)));
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update marker position when props change externally
  useEffect(() => {
    if (marker.current && map.current) {
      const current = marker.current.getLngLat();
      if (Math.abs(current.lat - latitude) > 0.0001 || Math.abs(current.lng - longitude) > 0.0001) {
        marker.current.setLngLat([longitude, latitude]);
        map.current.flyTo({ center: [longitude, latitude], duration: 500 });
      }
    }
  }, [latitude, longitude]);

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
