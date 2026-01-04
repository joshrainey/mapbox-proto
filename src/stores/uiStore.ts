import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIState, PanelState } from '../types';

interface UIStore extends UIState {
  togglePanel: (panel: keyof PanelState) => void;
  setTheme: (theme: 'dark' | 'light') => void;
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
        showGrid: state.showGrid,
        showCoordinates: state.showCoordinates,
        showFPS: state.showFPS,
      }),
    }
  )
);
