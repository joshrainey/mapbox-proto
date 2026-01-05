import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EnvironmentStore,
  EnvironmentState,
  AmbientLight,
  DirectionalLight,
  Fog,
  TimeOfDay,
} from '../types';

// Time of day presets with Mapbox GL v3 compatible values
// Fog includes atmosphere properties (space-color, star-intensity) per Mapbox spec
export const TIME_PRESETS: Record<TimeOfDay, Omit<EnvironmentState, 'enabled' | 'timeOfDay'>> = {
  dawn: {
    ambientLight: { color: '#ffd4a3', intensity: 0.4 },
    directionalLight: {
      color: '#ff8c42',
      intensity: 0.6,
      direction: [80, 15], // Sun rising from east, low angle
      castShadows: true,
      shadowIntensity: 0.3,
    },
    fog: {
      color: '#ffdab3',
      highColor: '#ff7f50',
      horizonBlend: 0.1,
      range: [0.5, 10],
      verticalRange: [0, 500],
      spaceColor: '#1a1a2e',
      starIntensity: 0.1,
    },
    fogEnabled: true,
  },
  morning: {
    ambientLight: { color: '#fffaed', intensity: 0.6 },
    directionalLight: {
      color: '#fff5e6',
      intensity: 0.8,
      direction: [120, 45], // Sun from southeast
      castShadows: true,
      shadowIntensity: 0.4,
    },
    fog: {
      color: '#e6f3ff',
      highColor: '#87ceeb',
      horizonBlend: 0.05,
      range: [2, 15],
      verticalRange: [0, 1000],
      spaceColor: '#1a1a2e',
      starIntensity: 0,
    },
    fogEnabled: false,
  },
  noon: {
    ambientLight: { color: '#ffffff', intensity: 0.8 },
    directionalLight: {
      color: '#ffffff',
      intensity: 1.0,
      direction: [180, 80], // Sun from south, high angle
      castShadows: true,
      shadowIntensity: 0.5,
    },
    fog: {
      color: '#ffffff',
      highColor: '#87ceeb',
      horizonBlend: 0.02,
      range: [5, 20],
      verticalRange: [0, 2000],
      spaceColor: '#0a0a1a',
      starIntensity: 0,
    },
    fogEnabled: false,
  },
  afternoon: {
    ambientLight: { color: '#fff8e6', intensity: 0.7 },
    directionalLight: {
      color: '#ffedcc',
      intensity: 0.9,
      direction: [240, 50], // Sun from southwest
      castShadows: true,
      shadowIntensity: 0.45,
    },
    fog: {
      color: '#fff8e6',
      highColor: '#87ceeb',
      horizonBlend: 0.04,
      range: [3, 18],
      verticalRange: [0, 1500],
      spaceColor: '#0a0a1a',
      starIntensity: 0,
    },
    fogEnabled: false,
  },
  dusk: {
    ambientLight: { color: '#ffb380', intensity: 0.5 },
    directionalLight: {
      color: '#ff6b35',
      intensity: 0.7,
      direction: [280, 15], // Sun setting in west, low angle
      castShadows: true,
      shadowIntensity: 0.35,
    },
    fog: {
      color: '#ffccb3',
      highColor: '#ff6347',
      horizonBlend: 0.12,
      range: [0.3, 8],
      verticalRange: [0, 400],
      spaceColor: '#1a1a3e',
      starIntensity: 0.3,
    },
    fogEnabled: true,
  },
  night: {
    ambientLight: { color: '#4a5568', intensity: 0.2 },
    directionalLight: {
      color: '#c4d4e6', // Moonlight
      intensity: 0.3,
      direction: [210, 60], // Moon position (default Mapbox direction)
      castShadows: true,
      shadowIntensity: 0.15,
    },
    fog: {
      color: '#1a1a2e',
      highColor: '#0d0d1a',
      horizonBlend: 0.05,
      range: [0.2, 6],
      verticalRange: [0, 300],
      spaceColor: '#000010',
      starIntensity: 1.0,
    },
    fogEnabled: true,
  },
};

const DEFAULT_STATE: EnvironmentState = {
  enabled: false,
  timeOfDay: 'noon',
  ...TIME_PRESETS.noon,
};

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },

      setAmbientLight: (light: Partial<AmbientLight>) => {
        set((state) => ({
          ambientLight: { ...state.ambientLight, ...light },
          timeOfDay: 'custom',
        }));
      },

      setDirectionalLight: (light: Partial<DirectionalLight>) => {
        set((state) => ({
          directionalLight: { ...state.directionalLight, ...light },
          timeOfDay: 'custom',
        }));
      },

      setFog: (fog: Partial<Fog>) => {
        set((state) => ({
          fog: { ...state.fog, ...fog },
          timeOfDay: 'custom',
        }));
      },

      setFogEnabled: (fogEnabled: boolean) => {
        set({ fogEnabled });
      },

      setTimeOfDay: (timeOfDay: TimeOfDay | 'custom') => {
        if (timeOfDay === 'custom') {
          set({ timeOfDay });
        } else {
          const preset = TIME_PRESETS[timeOfDay];
          set({ timeOfDay, ...preset });
        }
      },

      applyPreset: (time: TimeOfDay) => {
        const preset = TIME_PRESETS[time];
        set({ timeOfDay: time, ...preset });
      },

      reset: () => {
        set(DEFAULT_STATE);
      },
    }),
    {
      name: 'mapbox-proto-environment',
      partialize: (state) => ({
        enabled: state.enabled,
        ambientLight: state.ambientLight,
        directionalLight: state.directionalLight,
        fog: state.fog,
        fogEnabled: state.fogEnabled,
        timeOfDay: state.timeOfDay,
      }),
    }
  )
);
