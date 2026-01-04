import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Map } from 'mapbox-gl';
import type { MapStore, CameraState, Keyframe, EasingType } from '../types';

// Easing functions
const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  },
  custom: (t) => t, // Placeholder, will be overridden
};

export const getEasing = (type: EasingType, customFn?: string): (t: number) => number => {
  if (type === 'custom' && customFn) {
    try {
      // Safely evaluate custom easing function
      return new Function('t', `return ${customFn}`) as (t: number) => number;
    } catch {
      return easingFunctions.linear;
    }
  }
  return easingFunctions[type] || easingFunctions.linear;
};

const DEFAULT_CAMERA: CameraState = {
  center: [-74.006, 40.7128], // NYC
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

export const useMapStore = create<MapStore>()(
  subscribeWithSelector((set, get) => ({
    map: null,
    isLoaded: false,
    camera: DEFAULT_CAMERA,

    setMap: (map: Map) => {
      set({ map, isLoaded: true });
      
      // Sync camera state when map moves
      map.on('move', () => {
        const center = map.getCenter();
        set({
          camera: {
            center: [center.lng, center.lat],
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
          },
        });
      });
    },

    setCamera: (camera: Partial<CameraState>) => {
      set((state) => ({
        camera: { ...state.camera, ...camera },
      }));
    },

    syncFromMap: () => {
      const { map } = get();
      if (!map) return;
      
      const center = map.getCenter();
      set({
        camera: {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        },
      });
    },

    flyTo: (camera: CameraState, options?: Partial<Keyframe>) => {
      const { map } = get();
      if (!map) return;

      const easing = options?.easing 
        ? getEasing(options.easing, options.customEasing)
        : undefined;

      map.flyTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
        duration: options?.duration ?? 2000,
        essential: options?.essential ?? true,
        easing,
      });
    },

    easeTo: (camera: CameraState, options?: Partial<Keyframe>) => {
      const { map } = get();
      if (!map) return;

      const easing = options?.easing 
        ? getEasing(options.easing, options.customEasing)
        : undefined;

      map.easeTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
        duration: options?.duration ?? 1000,
        essential: options?.essential ?? true,
        easing,
      });
    },

    jumpTo: (camera: CameraState) => {
      const { map } = get();
      if (!map) return;

      map.jumpTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      });
    },
  }))
);

// Camera presets
export const CAMERA_PRESETS = [
  { id: 'overhead', name: 'Overhead', camera: { ...DEFAULT_CAMERA, pitch: 0, bearing: 0 } },
  { id: 'isometric', name: 'Isometric', camera: { ...DEFAULT_CAMERA, pitch: 60, bearing: -20 } },
  { id: 'street', name: 'Street Level', camera: { ...DEFAULT_CAMERA, zoom: 17, pitch: 75, bearing: 0 } },
  { id: 'bird', name: "Bird's Eye", camera: { ...DEFAULT_CAMERA, zoom: 15, pitch: 45, bearing: 45 } },
  { id: 'cinematic', name: 'Cinematic', camera: { ...DEFAULT_CAMERA, zoom: 14, pitch: 50, bearing: -30 } },
];
