import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIState, PanelState, MapStyleId, MapStyle } from '../types';

// Available map styles
export const MAP_STYLES: MapStyle[] = [
  { id: 'streets', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'outdoors', name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'light', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'dark', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
  { id: 'satellite-streets', name: 'Satellite Streets', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'navigation-day', name: 'Navigation Day', url: 'mapbox://styles/mapbox/navigation-day-v1' },
  { id: 'navigation-night', name: 'Navigation Night', url: 'mapbox://styles/mapbox/navigation-night-v1' },
];

export const getMapStyleUrl = (styleId: MapStyleId): string => {
  const style = MAP_STYLES.find((s) => s.id === styleId);
  return style?.url || MAP_STYLES[3].url; // Default to dark
};

interface UIStore extends UIState {
  togglePanel: (panel: keyof PanelState) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setMapStyle: (style: MapStyleId) => void;
  toggleGrid: () => void;
  toggleCoordinates: () => void;
  toggleFPS: () => void;
  setSelectedKeyframe: (id: string | null) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      panels: {
        camera: true,
        physics: true,
        timeline: true,
        layers: true,
        markers: true,
        lines: true,
        drawing: true,
        code: true,
        inspector: false,
      },
      theme: 'dark',
      mapStyle: 'dark',
      showGrid: false,
      showCoordinates: true,
      showFPS: false,
      selectedLayerId: null,
      selectedKeyframeId: null,

      togglePanel: (panel: keyof PanelState) => {
        set((state) => ({
          panels: {
            ...state.panels,
            [panel]: !state.panels[panel],
          },
        }));
      },

      setTheme: (theme: 'dark' | 'light') => {
        set({ theme });
      },

      setMapStyle: (mapStyle: MapStyleId) => {
        set({ mapStyle });
      },

      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }));
      },

      toggleCoordinates: () => {
        set((state) => ({ showCoordinates: !state.showCoordinates }));
      },

      toggleFPS: () => {
        set((state) => ({ showFPS: !state.showFPS }));
      },

      setSelectedKeyframe: (id: string | null) => {
        set({ selectedKeyframeId: id });
      },
    }),
    {
      name: 'mapbox-proto-ui',
      partialize: (state) => ({
        panels: state.panels,
        theme: state.theme,
        mapStyle: state.mapStyle,
        showGrid: state.showGrid,
        showCoordinates: state.showCoordinates,
        showFPS: state.showFPS,
      }),
    }
  )
);
