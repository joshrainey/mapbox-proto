import { forwardRef, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore, useUIStore } from '../../stores';

interface MapContainerProps {
  accessToken: string;
}

export const MapContainer = forwardRef<HTMLDivElement, MapContainerProps>(
  ({ accessToken }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const setMap = useMapStore((s) => s.setMap);
    const theme = useUIStore((s) => s.theme);

    useEffect(() => {
      if (!containerRef.current || !accessToken || mapRef.current) return;

      mapboxgl.accessToken = accessToken;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style:
          theme === 'dark'
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/light-v11',
        center: [-74.006, 40.7128],
        zoom: 12,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        preserveDrawingBuffer: true, // For screenshots
      });

      // Add controls
      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );
      map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right');
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-right'
      );

      map.on('load', () => {
        mapRef.current = map;
        setMap(map);

        // Add 3D terrain if available
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });

        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        // Add sky layer for 3D effect
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, [accessToken, setMap]);

    // Update map style when theme changes
    useEffect(() => {
      if (mapRef.current) {
        const style =
          theme === 'dark'
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/light-v11';
        mapRef.current.setStyle(style);
      }
    }, [theme]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    );
  }
);

MapContainer.displayName = 'MapContainer';
