import { forwardRef, useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore, useUIStore, useDrawingStore, useEnvironmentStore, syncDrawInstance, getMapStyleUrl } from '../../stores';

interface MapContainerProps {
  accessToken: string;
}

// Custom draw styles
const DRAW_STYLES = [
  // Point styles
  {
    id: 'gl-draw-point',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 8,
      'circle-color': '#8b5cf6',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  },
  // Line styles
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString']],
    paint: {
      'line-color': '#ef4444',
      'line-width': 3,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  },
  // Polygon fill
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.3,
    },
  },
  // Polygon outline
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'line-color': '#3b82f6',
      'line-width': 2,
    },
  },
  // Vertex points
  {
    id: 'gl-draw-point-vertex',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#3b82f6',
      'circle-stroke-width': 2,
    },
  },
  // Midpoints
  {
    id: 'gl-draw-point-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#3b82f6',
      'circle-opacity': 0.5,
    },
  },
];

export const MapContainer = forwardRef<HTMLDivElement, MapContainerProps>(
  ({ accessToken }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const setMap = useMapStore((s) => s.setMap);
    const mapStyle = useUIStore((s) => s.mapStyle);
    const customStyles = useUIStore((s) => s.customStyles);
    const drawingMode = useDrawingStore((s) => s.mode);
    const environment = useEnvironmentStore();

    // Add terrain and sky to the map
    const addTerrainAndSky = useCallback((map: mapboxgl.Map) => {
      // Only add terrain source if it doesn't exist
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }

      try {
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      } catch (e) {
        // Terrain might not be supported on some styles
      }

      // Add sky layer if it doesn't exist
      if (!map.getLayer('sky')) {
        try {
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 90.0],
              'sky-atmosphere-sun-intensity': 15,
            },
          });
        } catch (e) {
          // Sky might not be supported
        }
      }
    }, []);

    // Initialize map
    useEffect(() => {
      if (!containerRef.current || !accessToken || mapRef.current) return;

      mapboxgl.accessToken = accessToken;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapStyleUrl(mapStyle, customStyles),
        center: [-74.006, 40.7128],
        zoom: 12,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        preserveDrawingBuffer: true,
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

      // Initialize drawing tools
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'simple_select',
        styles: DRAW_STYLES as any,
      });

      map.addControl(draw);
      drawRef.current = draw;

      map.on('load', () => {
        mapRef.current = map;
        setMap(map);
        addTerrainAndSky(map);

        // Set up draw sync handlers
        const handlers = syncDrawInstance(draw);
        map.on('draw.create', handlers.onDrawCreate);
        map.on('draw.update', handlers.onDrawUpdate);
        map.on('draw.delete', handlers.onDrawDelete);
        map.on('draw.selectionchange', handlers.onDrawSelectionChange);
      });

      return () => {
        map.remove();
        mapRef.current = null;
        drawRef.current = null;
      };
    }, [accessToken, setMap, addTerrainAndSky]);

    // Update map style when mapStyle changes
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      const styleUrl = getMapStyleUrl(mapStyle, customStyles);

      // Store current draw features before style change
      const draw = drawRef.current;
      let drawnFeatures: GeoJSON.FeatureCollection | null = null;
      if (draw) {
        drawnFeatures = draw.getAll();
      }

      map.setStyle(styleUrl);

      // Re-add terrain, sky, and draw features after style loads
      map.once('style.load', () => {
        addTerrainAndSky(map);

        // Re-add drawn features
        if (draw && drawnFeatures && drawnFeatures.features.length > 0) {
          drawnFeatures.features.forEach((feature) => {
            try {
              draw.add(feature);
            } catch (e) {
              console.warn('Could not restore draw feature:', e);
            }
          });
        }
      });
    }, [mapStyle, customStyles, addTerrainAndSky]);

    // Sync drawing mode
    useEffect(() => {
      const draw = drawRef.current;
      if (draw && drawingMode) {
        try {
          draw.changeMode(drawingMode as any);
        } catch (e) {
          console.warn('Draw mode not available:', drawingMode);
        }
      }
    }, [drawingMode]);

    // Apply environment settings (lighting, fog with atmosphere)
    // Reference: https://docs.mapbox.com/style-spec/reference/fog/
    // Reference: https://docs.mapbox.com/style-spec/reference/light/
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      try {
        if (environment.enabled) {
          // Apply lights configuration using Mapbox GL v3 API
          // Both ambient and directional lights are required for 3D lighting to work
          // Type cast needed as TypeScript definitions may not be fully up to date
          const lights = [
            {
              id: 'ambient',
              type: 'ambient',
              properties: {
                color: environment.ambientLight.color,
                intensity: environment.ambientLight.intensity,
              },
            },
            {
              id: 'directional',
              type: 'directional',
              properties: {
                color: environment.directionalLight.color,
                intensity: environment.directionalLight.intensity,
                direction: environment.directionalLight.direction,
                'cast-shadows': environment.directionalLight.castShadows,
                'shadow-intensity': environment.directionalLight.shadowIntensity,
              },
            },
          ] as any;
          (map as any).setLights(lights);

          // Apply fog settings (includes atmosphere properties per Mapbox v3 spec)
          // Fog provides: color blending, atmosphere effect, stars, and depth perception
          if (environment.fogEnabled) {
            map.setFog({
              color: environment.fog.color,
              'high-color': environment.fog.highColor,
              'horizon-blend': environment.fog.horizonBlend,
              range: environment.fog.range,
              'vertical-range': environment.fog.verticalRange,
              'space-color': environment.fog.spaceColor,
              'star-intensity': environment.fog.starIntensity,
            });
          } else {
            map.setFog(null);
          }

          // Update sky layer if it exists (for atmosphere simulation)
          if (map.getLayer('sky')) {
            map.setPaintProperty('sky', 'sky-atmosphere-color', environment.fog.highColor);
            map.setPaintProperty('sky', 'sky-atmosphere-halo-color', environment.fog.color);
            map.setPaintProperty('sky', 'sky-atmosphere-sun-intensity', Math.max(5, 15 - environment.fog.starIntensity * 10));
          }
        } else {
          // Reset to defaults when disabled
          (map as any).setLights(undefined);
          map.setFog(null);
        }
      } catch (e) {
        console.warn('Could not apply environment settings:', e);
      }
    }, [
      environment.enabled,
      environment.ambientLight,
      environment.directionalLight,
      environment.fog,
      environment.fogEnabled,
    ]);

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
