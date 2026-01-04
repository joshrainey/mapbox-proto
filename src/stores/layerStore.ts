import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { LayerStore, ProtoLayer, ProtoSource, LayerType } from '../types';
import { useMapStore } from './mapStore';

// Default paint properties by layer type
export const DEFAULT_PAINT: Record<LayerType, Record<string, any>> = {
  fill: {
    'fill-color': '#3b82f6',
    'fill-opacity': 0.6,
    'fill-outline-color': '#1d4ed8',
  },
  line: {
    'line-color': '#ef4444',
    'line-width': 3,
    'line-opacity': 1,
  },
  circle: {
    'circle-color': '#8b5cf6',
    'circle-radius': 8,
    'circle-opacity': 0.8,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
  symbol: {
    'text-color': '#000000',
    'text-halo-color': '#ffffff',
    'text-halo-width': 1,
  },
  'fill-extrusion': {
    'fill-extrusion-color': '#3b82f6',
    'fill-extrusion-height': 100,
    'fill-extrusion-base': 0,
    'fill-extrusion-opacity': 0.8,
  },
  raster: {
    'raster-opacity': 1,
    'raster-brightness-min': 0,
    'raster-brightness-max': 1,
  },
  heatmap: {
    'heatmap-weight': 1,
    'heatmap-intensity': 1,
    'heatmap-radius': 30,
    'heatmap-opacity': 0.8,
  },
  hillshade: {
    'hillshade-shadow-color': '#000000',
    'hillshade-highlight-color': '#ffffff',
    'hillshade-accent-color': '#000000',
  },
  background: {
    'background-color': '#f0f0f0',
    'background-opacity': 1,
  },
};

// Default layout properties by layer type
export const DEFAULT_LAYOUT: Record<LayerType, Record<string, any>> = {
  fill: { visibility: 'visible' },
  line: { 
    visibility: 'visible',
    'line-cap': 'round',
    'line-join': 'round',
  },
  circle: { visibility: 'visible' },
  symbol: { 
    visibility: 'visible',
    'text-field': ['get', 'name'],
    'text-size': 14,
    'text-anchor': 'center',
  },
  'fill-extrusion': { visibility: 'visible' },
  raster: { visibility: 'visible' },
  heatmap: { visibility: 'visible' },
  hillshade: { visibility: 'visible' },
  background: { visibility: 'visible' },
};

export const useLayerStore = create<LayerStore>()(
  immer((set, get) => ({
    sources: [],
    layers: [],
    selectedLayerId: null,

    // ========================
    // Source CRUD
    // ========================

    addSource: (source: Omit<ProtoSource, 'id'>) => {
      const id = nanoid();
      const map = useMapStore.getState().map;
      
      set((state) => {
        state.sources.push({ ...source, id });
      });

      // Add to actual map
      if (map && !map.getSource(id)) {
        if (source.type === 'geojson') {
          map.addSource(id, {
            type: 'geojson',
            data: source.data,
          });
        }
      }

      return id;
    },

    updateSource: (id: string, data: any) => {
      const map = useMapStore.getState().map;
      
      set((state) => {
        const source = state.sources.find((s) => s.id === id);
        if (source) {
          source.data = data;
        }
      });

      // Update actual map source
      if (map) {
        const mapSource = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
        if (mapSource && typeof mapSource.setData === 'function') {
          mapSource.setData(data);
        }
      }
    },

    removeSource: (id: string) => {
      const map = useMapStore.getState().map;
      const state = get();

      // First remove all layers using this source
      const layersToRemove = state.layers.filter((l) => l.sourceId === id);
      layersToRemove.forEach((layer) => {
        if (map && map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      });

      // Then remove the source
      if (map && map.getSource(id)) {
        map.removeSource(id);
      }

      set((s) => {
        s.sources = s.sources.filter((source) => source.id !== id);
        s.layers = s.layers.filter((layer) => layer.sourceId !== id);
      });
    },

    // ========================
    // Layer CRUD
    // ========================

    addLayer: (layer: Omit<ProtoLayer, 'id'>) => {
      const id = nanoid();
      const map = useMapStore.getState().map;
      
      const newLayer: ProtoLayer = {
        ...layer,
        id,
        paint: layer.paint ?? DEFAULT_PAINT[layer.type] ?? {},
        layout: layer.layout ?? DEFAULT_LAYOUT[layer.type] ?? {},
      };

      set((state) => {
        state.layers.push(newLayer);
      });

      // Add to actual map
      if (map && !map.getLayer(id)) {
        try {
          const layerConfig: mapboxgl.AnyLayer = {
            id,
            type: layer.type as any,
            source: layer.sourceId,
            paint: newLayer.paint,
            layout: newLayer.layout,
          };

          if (layer.filter) {
            (layerConfig as any).filter = layer.filter;
          }
          if (layer.minzoom !== undefined) {
            layerConfig.minzoom = layer.minzoom;
          }
          if (layer.maxzoom !== undefined) {
            layerConfig.maxzoom = layer.maxzoom;
          }

          map.addLayer(layerConfig);
        } catch (e) {
          console.error('Error adding layer:', e);
        }
      }

      return id;
    },

    updateLayer: (id: string, updates: Partial<ProtoLayer>) => {
      const map = useMapStore.getState().map;

      set((state) => {
        const layer = state.layers.find((l) => l.id === id);
        if (layer) {
          Object.assign(layer, updates);
        }
      });

      // Update actual map layer
      if (map && map.getLayer(id)) {
        // Update paint properties
        if (updates.paint) {
          Object.entries(updates.paint).forEach(([prop, value]) => {
            try {
              map.setPaintProperty(id, prop as any, value);
            } catch (e) {
              console.error(`Error setting paint property ${prop}:`, e);
            }
          });
        }

        // Update layout properties
        if (updates.layout) {
          Object.entries(updates.layout).forEach(([prop, value]) => {
            try {
              map.setLayoutProperty(id, prop as any, value);
            } catch (e) {
              console.error(`Error setting layout property ${prop}:`, e);
            }
          });
        }

        // Update filter
        if (updates.filter !== undefined) {
          try {
            map.setFilter(id, updates.filter);
          } catch (e) {
            console.error('Error setting filter:', e);
          }
        }

        // Update zoom range
        if (updates.minzoom !== undefined || updates.maxzoom !== undefined) {
          try {
            map.setLayerZoomRange(
              id,
              updates.minzoom ?? 0,
              updates.maxzoom ?? 24
            );
          } catch (e) {
            console.error('Error setting zoom range:', e);
          }
        }
      }
    },

    removeLayer: (id: string) => {
      const map = useMapStore.getState().map;

      if (map && map.getLayer(id)) {
        map.removeLayer(id);
      }

      set((state) => {
        state.layers = state.layers.filter((l) => l.id !== id);
        if (state.selectedLayerId === id) {
          state.selectedLayerId = null;
        }
      });
    },

    reorderLayers: (fromIndex: number, toIndex: number) => {
      const map = useMapStore.getState().map;

      set((state) => {
        const [removed] = state.layers.splice(fromIndex, 1);
        state.layers.splice(toIndex, 0, removed);

        // Reorder on actual map
        if (map) {
          // Get the layer that should be above the moved layer
          const beforeId = state.layers[toIndex + 1]?.id;
          try {
            map.moveLayer(removed.id, beforeId);
          } catch (e) {
            console.error('Error reordering layer:', e);
          }
        }
      });
    },

    toggleLayerVisibility: (id: string) => {
      const map = useMapStore.getState().map;
      const state = get();
      const layer = state.layers.find((l) => l.id === id);
      
      if (!layer) return;

      const newVisibility = layer.visible ? 'none' : 'visible';

      set((s) => {
        const l = s.layers.find((l) => l.id === id);
        if (l) {
          l.visible = !l.visible;
          l.layout = { ...l.layout, visibility: newVisibility };
        }
      });

      if (map && map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', newVisibility);
      }
    },

    setSelectedLayer: (id: string | null) => {
      set((state) => {
        state.selectedLayerId = id;
      });
    },
  }))
);

// Helper to create a quick GeoJSON source + layer
export const addGeoJSONLayer = (
  geojson: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry,
  type: LayerType,
  name?: string
) => {
  const { addSource, addLayer } = useLayerStore.getState();
  
  const sourceId = addSource({
    name: name ?? 'GeoJSON Source',
    type: 'geojson',
    data: geojson,
  });

  const layerId = addLayer({
    name: name ?? `${type} Layer`,
    type,
    sourceId,
    visible: true,
    paint: DEFAULT_PAINT[type],
    layout: DEFAULT_LAYOUT[type],
  });

  return { sourceId, layerId };
};
