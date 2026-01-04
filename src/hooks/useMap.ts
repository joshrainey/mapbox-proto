import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useMapStore, useDrawingStore, syncDrawInstance, useUIStore } from '../stores';

// Initialize map
export const useMapInit = (
  containerRef: React.RefObject<HTMLDivElement>,
  accessToken: string
) => {
  const setMap = useMapStore((s) => s.setMap);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (!containerRef.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark' 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11',
      center: [-74.006, 40.7128],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.on('load', () => {
      setMap(map);
    });

    return () => {
      map.remove();
    };
  }, [containerRef, accessToken, setMap]);
};

// Initialize drawing tools
export const useDrawing = () => {
  const map = useMapStore((s) => s.map);
  const mode = useDrawingStore((s) => s.mode);
  const setMode = useDrawingStore((s) => s.setMode);
  const drawRef = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      styles: [
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
      ],
    });

    map.addControl(draw);
    drawRef.current = draw;

    // Set up sync handlers
    const handlers = syncDrawInstance(draw);
    map.on('draw.create', handlers.onDrawCreate);
    map.on('draw.update', handlers.onDrawUpdate);
    map.on('draw.delete', handlers.onDrawDelete);
    map.on('draw.selectionchange', handlers.onDrawSelectionChange);

    return () => {
      map.off('draw.create', handlers.onDrawCreate);
      map.off('draw.update', handlers.onDrawUpdate);
      map.off('draw.delete', handlers.onDrawDelete);
      map.off('draw.selectionchange', handlers.onDrawSelectionChange);
      map.removeControl(draw);
    };
  }, [map]);

  // Sync mode changes
  useEffect(() => {
    if (drawRef.current && mode) {
      try {
        drawRef.current.changeMode(mode as any);
      } catch (e) {
        // Mode might not be available
        console.warn('Draw mode not available:', mode);
      }
    }
  }, [mode]);

  return {
    draw: drawRef.current,
    setMode,
    deleteSelected: useCallback(() => {
      if (drawRef.current) {
        drawRef.current.trash();
      }
    }, []),
    deleteAll: useCallback(() => {
      if (drawRef.current) {
        drawRef.current.deleteAll();
        useDrawingStore.getState().clearAll();
      }
    }, []),
  };
};

// Coordinate picker hook
export const useCoordinatePicker = () => {
  const map = useMapStore((s) => s.map);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!map || !isActive) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      setCoords([e.lngLat.lng, e.lngLat.lat]);
      setIsActive(false);
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.once('click', onClick);

    return () => {
      map.getCanvas().style.cursor = '';
      map.off('click', onClick);
    };
  }, [map, isActive]);

  return {
    coords,
    isActive,
    startPicking: () => setIsActive(true),
    cancelPicking: () => {
      setIsActive(false);
      if (map) map.getCanvas().style.cursor = '';
    },
  };
};

// Mouse position hook
export const useMousePosition = () => {
  const map = useMapStore((s) => s.map);
  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!map) return;

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      setPosition({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    map.on('mousemove', onMouseMove);

    return () => {
      map.off('mousemove', onMouseMove);
    };
  }, [map]);

  return position;
};

// FPS counter hook
export const useFPS = () => {
  const [fps, setFps] = useState(0);
  const showFPS = useUIStore((s) => s.showFPS);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!showFPS) return;

    let frameId: number;

    const measureFPS = () => {
      const now = performance.now();
      const frameTimes = frameTimesRef.current;

      frameTimes.push(now);

      // Keep only last 60 frames
      while (frameTimes.length > 60) {
        frameTimes.shift();
      }

      if (frameTimes.length > 1) {
        const elapsed = frameTimes[frameTimes.length - 1] - frameTimes[0];
        const currentFps = Math.round((frameTimes.length - 1) / (elapsed / 1000));
        setFps(currentFps);
      }

      frameId = requestAnimationFrame(measureFPS);
    };

    frameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [showFPS]);

  return fps;
};

// Keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const togglePanel = useUIStore((s) => s.togglePanel);
  const { play, pause, stop } = useAnimationStore();
  const isPlaying = useAnimationStore((s) => s.playback.isPlaying);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Panel toggles (Ctrl/Cmd + number)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            togglePanel('camera');
            break;
          case '2':
            e.preventDefault();
            togglePanel('timeline');
            break;
          case '3':
            e.preventDefault();
            togglePanel('layers');
            break;
          case '4':
            e.preventDefault();
            togglePanel('drawing');
            break;
          case '5':
            e.preventDefault();
            togglePanel('code');
            break;
        }
      }

      // Playback controls
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case 'Escape':
          stop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel, play, pause, stop, isPlaying]);
};

// Import the animation store for keyboard shortcuts
import { useAnimationStore } from '../stores';
