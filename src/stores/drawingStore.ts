import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { DrawingStore, DrawMode, DrawnFeature } from '../types';

export const useDrawingStore = create<DrawingStore>()(
  immer((set, get) => ({
    mode: 'simple_select',
    features: [],
    selectedIds: [],
    snapToGrid: false,
    showMeasurements: true,

    setMode: (mode: DrawMode) => {
      set((state) => {
        state.mode = mode;
      });
    },

    addFeature: (feature: DrawnFeature) => {
      set((state) => {
        // Ensure unique ID
        const existingIndex = state.features.findIndex((f) => f.id === feature.id);
        if (existingIndex >= 0) {
          state.features[existingIndex] = feature;
        } else {
          state.features.push(feature);
        }
      });
    },

    updateFeature: (id: string, updates: Partial<DrawnFeature>) => {
      set((state) => {
        const feature = state.features.find((f) => f.id === id);
        if (feature) {
          Object.assign(feature, updates);
        }
      });
    },

    deleteFeatures: (ids: string[]) => {
      set((state) => {
        state.features = state.features.filter((f) => !ids.includes(f.id));
        state.selectedIds = state.selectedIds.filter((id) => !ids.includes(id));
      });
    },

    setSelection: (ids: string[]) => {
      set((state) => {
        state.selectedIds = ids;
      });
    },

    clearAll: () => {
      set((state) => {
        state.features = [];
        state.selectedIds = [];
        state.mode = 'simple_select';
      });
    },

    importGeoJSON: (geojson: GeoJSON.FeatureCollection) => {
      set((state) => {
        const newFeatures = geojson.features.map((f) => ({
          id: (f.id as string) ?? nanoid(),
          type: 'Feature' as const,
          geometry: f.geometry,
          properties: f.properties ?? {},
        }));
        state.features.push(...newFeatures);
      });
    },

    exportGeoJSON: (): GeoJSON.FeatureCollection => {
      const state = get();
      return {
        type: 'FeatureCollection',
        features: state.features.map((f) => ({
          type: 'Feature',
          id: f.id,
          geometry: f.geometry,
          properties: f.properties,
        })),
      };
    },
  }))
);

// Sync with Mapbox Draw instance
export const syncDrawInstance = (draw: MapboxDraw) => {
  const { features, setSelection, addFeature, deleteFeatures } = useDrawingStore.getState();
  
  // Initial sync: add stored features to draw
  features.forEach((f) => {
    try {
      draw.add({
        type: 'Feature',
        id: f.id,
        geometry: f.geometry,
        properties: f.properties,
      });
    } catch (e) {
      console.error('Error adding feature to draw:', e);
    }
  });

  return {
    // Call these from map event handlers
    onDrawCreate: (e: { features: GeoJSON.Feature[] }) => {
      e.features.forEach((f) => {
        addFeature({
          id: (f.id as string) ?? nanoid(),
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties ?? {},
        });
      });
    },

    onDrawUpdate: (e: { features: GeoJSON.Feature[] }) => {
      e.features.forEach((f) => {
        addFeature({
          id: (f.id as string) ?? nanoid(),
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties ?? {},
        });
      });
    },

    onDrawDelete: (e: { features: GeoJSON.Feature[] }) => {
      deleteFeatures(e.features.map((f) => f.id as string));
    },

    onDrawSelectionChange: (e: { features: GeoJSON.Feature[] }) => {
      setSelection(e.features.map((f) => f.id as string));
    },
  };
};
