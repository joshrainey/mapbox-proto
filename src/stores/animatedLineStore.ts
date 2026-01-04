import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import * as turf from '@turf/turf';
import type { AnimatedLineStore, AnimatedLine, EasingType } from '../types';
import { useMapStore, getEasing } from './mapStore';

// Active animation loops
const activeAnimations = new Map<string, number>();

export const useAnimatedLineStore = create<AnimatedLineStore>()(
  immer((set, get) => ({
    lines: [],

    addLine: (line: Omit<AnimatedLine, 'id' | 'progress'>) => {
      const id = nanoid();
      const map = useMapStore.getState().map;

      const newLine: AnimatedLine = {
        ...line,
        id,
        progress: 0,
      };

      set((state) => {
        state.lines.push(newLine);
      });

      // Create map source and layers
      if (map) {
        // Create the full line source
        const lineGeoJSON: GeoJSON.Feature = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: line.coordinates,
          },
        };

        // Source for the animated portion
        map.addSource(`animated-line-${id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        // Optional glow layer (rendered first, underneath)
        if (line.style.glow) {
          map.addLayer({
            id: `animated-line-glow-${id}`,
            type: 'line',
            source: `animated-line-${id}`,
            paint: {
              'line-color': line.style.glowColor ?? line.style.color,
              'line-width': (line.style.glowWidth ?? line.style.width * 3),
              'line-opacity': 0.4,
              'line-blur': 3,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          });
        }

        // Main line layer
        map.addLayer({
          id: `animated-line-${id}`,
          type: 'line',
          source: `animated-line-${id}`,
          paint: {
            'line-color': line.style.color,
            'line-width': line.style.width,
            'line-opacity': 1,
            ...(line.style.dashArray && {
              'line-dasharray': line.style.dashArray,
            }),
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        });
      }

      return id;
    },

    updateLine: (id: string, updates: Partial<AnimatedLine>) => {
      const map = useMapStore.getState().map;

      set((state) => {
        const line = state.lines.find((l) => l.id === id);
        if (line) {
          Object.assign(line, updates);
        }
      });

      // Update map layer styles if needed
      if (map && updates.style) {
        if (updates.style.color) {
          map.setPaintProperty(`animated-line-${id}`, 'line-color', updates.style.color);
        }
        if (updates.style.width) {
          map.setPaintProperty(`animated-line-${id}`, 'line-width', updates.style.width);
        }
      }
    },

    removeLine: (id: string) => {
      const map = useMapStore.getState().map;

      // Stop animation if running
      if (activeAnimations.has(id)) {
        cancelAnimationFrame(activeAnimations.get(id)!);
        activeAnimations.delete(id);
      }

      // Remove from map
      if (map) {
        if (map.getLayer(`animated-line-glow-${id}`)) {
          map.removeLayer(`animated-line-glow-${id}`);
        }
        if (map.getLayer(`animated-line-${id}`)) {
          map.removeLayer(`animated-line-${id}`);
        }
        if (map.getSource(`animated-line-${id}`)) {
          map.removeSource(`animated-line-${id}`);
        }
      }

      set((state) => {
        state.lines = state.lines.filter((l) => l.id !== id);
      });
    },

    setProgress: (id: string, progress: number) => {
      const map = useMapStore.getState().map;
      const state = get();
      const line = state.lines.find((l) => l.id === id);

      if (!line || !map) return;

      set((s) => {
        const l = s.lines.find((l) => l.id === id);
        if (l) l.progress = progress;
      });

      // Update the line geometry on the map
      const fullLine = turf.lineString(line.coordinates);
      const totalLength = turf.length(fullLine);
      
      // Calculate the visible portion based on progress and trail length
      const headDistance = totalLength * Math.min(progress, 1);
      const tailDistance = Math.max(0, headDistance - totalLength * line.animation.trailLength);

      if (headDistance <= 0) {
        // Nothing to show yet
        const source = map.getSource(`animated-line-${id}`) as mapboxgl.GeoJSONSource;
        source?.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
        return;
      }

      try {
        // Get the visible segment
        const sliced = turf.lineSliceAlong(fullLine, tailDistance, headDistance);
        
        const source = map.getSource(`animated-line-${id}`) as mapboxgl.GeoJSONSource;
        source?.setData(sliced);
      } catch (e) {
        // Edge case handling for very short segments
        console.warn('Error slicing line:', e);
      }
    },

    playLine: (id: string) => {
      const state = get();
      const line = state.lines.find((l) => l.id === id);
      if (!line) return;

      // Stop any existing animation
      if (activeAnimations.has(id)) {
        cancelAnimationFrame(activeAnimations.get(id)!);
      }

      const startTime = performance.now();
      const duration = line.animation.duration;
      const easingFn = getEasing(line.animation.easing);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;

        if (progress >= 1) {
          if (line.animation.loop) {
            // Reset and continue
            set((s) => {
              const l = s.lines.find((l) => l.id === id);
              if (l) l.progress = 0;
            });
            get().playLine(id);
            return;
          } else {
            progress = 1;
            get().setProgress(id, 1);
            activeAnimations.delete(id);
            return;
          }
        }

        // Apply easing
        const easedProgress = easingFn(progress);
        get().setProgress(id, easedProgress);

        activeAnimations.set(id, requestAnimationFrame(animate));
      };

      activeAnimations.set(id, requestAnimationFrame(animate));
    },

    stopLine: (id: string) => {
      if (activeAnimations.has(id)) {
        cancelAnimationFrame(activeAnimations.get(id)!);
        activeAnimations.delete(id);
      }

      set((state) => {
        const line = state.lines.find((l) => l.id === id);
        if (line) {
          line.progress = 0;
        }
      });

      // Clear the line on map
      const map = useMapStore.getState().map;
      if (map) {
        const source = map.getSource(`animated-line-${id}`) as mapboxgl.GeoJSONSource;
        source?.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
      }
    },
  }))
);

// Helper to create an arc between two points
export const createArc = (
  start: [number, number],
  end: [number, number],
  options?: {
    steps?: number;
    offset?: number; // How much to curve the arc (0-1)
  }
): [number, number][] => {
  const { steps = 100, offset = 0.3 } = options ?? {};
  
  // Calculate midpoint
  const midLng = (start[0] + end[0]) / 2;
  const midLat = (start[1] + end[1]) / 2;
  
  // Calculate perpendicular offset
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular vector
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Control point
  const controlLng = midLng + perpX * distance * offset;
  const controlLat = midLat + perpY * distance * offset;
  
  // Generate quadratic bezier curve points
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng =
      (1 - t) * (1 - t) * start[0] +
      2 * (1 - t) * t * controlLng +
      t * t * end[0];
    const lat =
      (1 - t) * (1 - t) * start[1] +
      2 * (1 - t) * t * controlLat +
      t * t * end[1];
    coords.push([lng, lat]);
  }
  
  return coords;
};

// Helper to create a great circle arc (for long distances)
export const createGreatCircleArc = (
  start: [number, number],
  end: [number, number],
  steps = 100
): [number, number][] => {
  const line = turf.greatCircle(turf.point(start), turf.point(end), {
    npoints: steps,
  });
  return line.geometry.coordinates as [number, number][];
};
