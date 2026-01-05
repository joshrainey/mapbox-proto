import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EnvironmentStore,
  EnvironmentState,
  AmbientLight,
  DirectionalLight,
  Atmosphere,
  Fog,
  TimeOfDay,
} from '../types';

// Time of day presets
export const TIME_PRESETS: Record<TimeOfDay, Omit<EnvironmentState, 'enabled' | 'timeOfDay'>> = {
  dawn: {
    ambientLight: { color: '#ffd4a3', intensity: 0.4 },
    directionalLight: {
      color: '#ff8c42',
      intensity: 0.6,
      direction: [80, 30],
      castShadows: true,
      shadowIntensity: 0.3,
    },
    atmosphere: {
      color: '#ffa366',
      highColor: '#ff7f50',
      horizonBlend: 0.1,
      spaceColor: '#1a1a2e',
      starIntensity: 0.1,
    },
    fog: {
      color: '#ffdab3',
      highColor: '#ffb366',
      horizonBlend: 0.08,
      range: [0.5, 10],
      verticalRange: [0, 500],
    },
    fogEnabled: true,
  },
  morning: {
    ambientLight: { color: '#fffaed', intensity: 0.6 },
    directionalLight: {
      color: '#fff5e6',
      intensity: 0.8,
      direction: [60, 45],
      castShadows: true,
      shadowIntensity: 0.4,
    },
    atmosphere: {
      color: '#87ceeb',
      highColor: '#add8e6',
      horizonBlend: 0.05,
      spaceColor: '#1a1a2e',
      starIntensity: 0,
    },
    fog: {
      color: '#e6f3ff',
      highColor: '#cce5ff',
      horizonBlend: 0.03,
      range: [2, 15],
      verticalRange: [0, 1000],
    },
    fogEnabled: false,
  },
  noon: {
    ambientLight: { color: '#ffffff', intensity: 0.8 },
    directionalLight: {
      color: '#ffffff',
      intensity: 1.0,
      direction: [0, 80],
      castShadows: true,
      shadowIntensity: 0.5,
    },
    atmosphere: {
      color: '#87ceeb',
      highColor: '#6bb3e0',
      horizonBlend: 0.02,
      spaceColor: '#0a0a1a',
      starIntensity: 0,
    },
    fog: {
      color: '#ffffff',
      highColor: '#f0f8ff',
      horizonBlend: 0.01,
      range: [5, 20],
      verticalRange: [0, 2000],
    },
    fogEnabled: false,
  },
  afternoon: {
    ambientLight: { color: '#fff8e6', intensity: 0.7 },
    directionalLight: {
      color: '#ffedcc',
      intensity: 0.9,
      direction: [300, 50],
      castShadows: true,
      shadowIntensity: 0.45,
    },
    atmosphere: {
      color: '#87ceeb',
      highColor: '#98d6f0',
      horizonBlend: 0.04,
      spaceColor: '#0a0a1a',
      starIntensity: 0,
    },
    fog: {
      color: '#fff8e6',
      highColor: '#ffedcc',
      horizonBlend: 0.02,
      range: [3, 18],
      verticalRange: [0, 1500],
    },
    fogEnabled: false,
  },
  dusk: {
    ambientLight: { color: '#ffb380', intensity: 0.5 },
    directionalLight: {
      color: '#ff6b35',
      intensity: 0.7,
      direction: [280, 20],
      castShadows: true,
      shadowIntensity: 0.35,
    },
    atmosphere: {
      color: '#ff7f50',
      highColor: '#ff6347',
      horizonBlend: 0.12,
      spaceColor: '#1a1a3e',
      starIntensity: 0.2,
    },
    fog: {
      color: '#ffccb3',
      highColor: '#ff9966',
      horizonBlend: 0.1,
      range: [0.3, 8],
      verticalRange: [0, 400],
    },
    fogEnabled: true,
  },
  night: {
    ambientLight: { color: '#4a5568', intensity: 0.2 },
    directionalLight: {
      color: '#c4d4e6',
      intensity: 0.3,
      direction: [180, 60],
      castShadows: true,
      shadowIntensity: 0.15,
    },
    atmosphere: {
      color: '#1a1a2e',
      highColor: '#0d0d1a',
      horizonBlend: 0.02,
      spaceColor: '#000010',
      starIntensity: 1.0,
    },
    fog: {
      color: '#1a1a2e',
      highColor: '#0d0d1a',
      horizonBlend: 0.05,
      range: [0.2, 6],
      verticalRange: [0, 300],
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
    (set, get) => ({
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

      setAtmosphere: (atmosphere: Partial<Atmosphere>) => {
        set((state) => ({
          atmosphere: { ...state.atmosphere, ...atmosphere },
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
        atmosphere: state.atmosphere,
        fog: state.fog,
        fogEnabled: state.fogEnabled,
        timeOfDay: state.timeOfDay,
      }),
    }
  )
);
