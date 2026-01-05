import type { Map, LngLatLike, EasingOptions } from 'mapbox-gl';

// ============================================
// Camera & Animation Types
// ============================================

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export type EasingType = 
  | 'linear' 
  | 'easeIn' 
  | 'easeOut' 
  | 'easeInOut' 
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'bounce'
  | 'elastic'
  | 'custom';

export type AnimationType = 'flyTo' | 'easeTo' | 'jumpTo' | 'rotateTo';

export interface Keyframe {
  id: string;
  name: string;
  camera: CameraState;
  animationType: AnimationType;
  duration: number; // ms
  easing: EasingType;
  customEasing?: string; // Custom easing function string
  delay: number; // ms delay before this keyframe starts
  essential: boolean; // Whether animation respects prefers-reduced-motion
}

export interface AnimationSequence {
  id: string;
  name: string;
  keyframes: Keyframe[];
  loop: boolean;
  loopDelay: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentKeyframeIndex: number;
  currentTime: number; // ms into current keyframe
  totalDuration: number;
}

// ============================================
// Layer & Style Types
// ============================================

export type LayerType = 
  | 'fill' 
  | 'line' 
  | 'symbol' 
  | 'circle' 
  | 'fill-extrusion'
  | 'raster'
  | 'heatmap'
  | 'hillshade'
  | 'background';

export interface ProtoLayer {
  id: string;
  name: string;
  type: LayerType;
  sourceId: string;
  visible: boolean;
  paint: Record<string, any>;
  layout: Record<string, any>;
  filter?: any[];
  minzoom?: number;
  maxzoom?: number;
}

export interface ProtoSource {
  id: string;
  name: string;
  type: 'geojson' | 'vector' | 'raster' | 'image' | 'video';
  data: any;
}

// ============================================
// Drawing Types
// ============================================

export type DrawMode = 
  | 'simple_select'
  | 'direct_select'
  | 'draw_point'
  | 'draw_line_string'
  | 'draw_polygon'
  | 'draw_circle'
  | 'draw_arc';

export interface DrawnFeature {
  id: string;
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: Record<string, any>;
}

export interface DrawingState {
  mode: DrawMode;
  features: DrawnFeature[];
  selectedIds: string[];
  snapToGrid: boolean;
  showMeasurements: boolean;
}

// ============================================
// Animated Line Types
// ============================================

export interface AnimatedLine {
  id: string;
  coordinates: [number, number][];
  style: {
    color: string;
    width: number;
    dashArray?: number[];
    glow: boolean;
    glowColor?: string;
    glowWidth?: number;
  };
  animation: {
    duration: number;
    easing: EasingType;
    trailLength: number; // 0-1, how much of the line trails behind
    loop: boolean;
  };
  progress: number; // 0-1
}

// ============================================
// UI State Types
// ============================================

export interface PanelState {
  camera: boolean;
  physics: boolean;
  timeline: boolean;
  layers: boolean;
  markers: boolean;
  lines: boolean;
  drawing: boolean;
  environment: boolean;
  code: boolean;
  inspector: boolean;
}

// ============================================
// Map Style Types
// ============================================

export type BuiltInStyleId =
  | 'streets'
  | 'outdoors'
  | 'light'
  | 'dark'
  | 'satellite'
  | 'satellite-streets'
  | 'navigation-day'
  | 'navigation-night';

// MapStyleId can be a built-in style or a custom style ID (prefixed with 'custom-')
export type MapStyleId = BuiltInStyleId | `custom-${string}`;

export interface MapStyle {
  id: MapStyleId;
  name: string;
  url: string;
  isCustom?: boolean;
}

export interface UIState {
  panels: PanelState;
  theme: 'dark' | 'light';
  mapStyle: MapStyleId;
  customStyles: MapStyle[];
  showGrid: boolean;
  showCoordinates: boolean;
  showFPS: boolean;
  selectedLayerId: string | null;
  selectedKeyframeId: string | null;
}

// ============================================
// Preset Types
// ============================================

export interface CameraPreset {
  id: string;
  name: string;
  camera: CameraState;
  icon?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  layers: ProtoLayer[];
  sources: ProtoSource[];
}

export interface ProjectPreset {
  id: string;
  name: string;
  camera: CameraState;
  sequences: AnimationSequence[];
  layers: ProtoLayer[];
  sources: ProtoSource[];
  drawnFeatures: DrawnFeature[];
  animatedLines: AnimatedLine[];
}

// ============================================
// Code Export Types
// ============================================

export type ExportFormat = 'standalone' | 'module' | 'snippet';

export interface ExportOptions {
  format: ExportFormat;
  includeMapInit: boolean;
  includeStyles: boolean;
  includeAnimations: boolean;
  includeDrawing: boolean;
  minify: boolean;
}

// ============================================
// Environment & Lighting Types
// ============================================

export interface AmbientLight {
  color: string;
  intensity: number; // 0-1
}

export interface DirectionalLight {
  color: string;
  intensity: number; // 0-1
  direction: [number, number]; // [azimuth (0-360), polar (0-90)] in degrees
  castShadows: boolean;
  shadowIntensity: number; // 0-1
}

// Fog includes atmosphere properties per Mapbox GL JS v3 spec
// See: https://docs.mapbox.com/style-spec/reference/fog/
export interface Fog {
  // Base fog properties
  color: string; // Default: "#ffffff"
  highColor: string; // Color above horizon, default: "#245cdf"
  horizonBlend: number; // 0-1, default: 0.1
  range: [number, number]; // [start, end] between -20 and 20, default: [0.5, 10]
  verticalRange: [number, number]; // Height range in meters, default: [0, 0]
  // Atmosphere/space properties (part of fog in Mapbox spec)
  spaceColor: string; // Color of space, default: "#245cdf"
  starIntensity: number; // 0-1, default: 0
}

export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

export interface EnvironmentState {
  enabled: boolean;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;
  fog: Fog;
  fogEnabled: boolean;
  timeOfDay: TimeOfDay | 'custom';
}

// ============================================
// Store Types
// ============================================

export interface MapStore {
  map: Map | null;
  isLoaded: boolean;
  camera: CameraState;
  setMap: (map: Map) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  syncFromMap: () => void;
  flyTo: (camera: CameraState, options?: Partial<Keyframe>) => void;
  easeTo: (camera: CameraState, options?: Partial<Keyframe>) => void;
  jumpTo: (camera: CameraState) => void;
}

export interface AnimationStore {
  sequences: AnimationSequence[];
  activeSequenceId: string | null;
  playback: PlaybackState;
  
  // Sequence CRUD
  createSequence: (name: string) => string;
  deleteSequence: (id: string) => void;
  setActiveSequence: (id: string | null) => void;
  
  // Keyframe CRUD
  addKeyframe: (sequenceId: string, keyframe: Omit<Keyframe, 'id'>) => string;
  updateKeyframe: (sequenceId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  deleteKeyframe: (sequenceId: string, keyframeId: string) => void;
  reorderKeyframes: (sequenceId: string, fromIndex: number, toIndex: number) => void;
  
  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setLoop: (sequenceId: string, loop: boolean) => void;
}

export interface LayerStore {
  sources: ProtoSource[];
  layers: ProtoLayer[];
  selectedLayerId: string | null;
  
  // Source CRUD
  addSource: (source: Omit<ProtoSource, 'id'>) => string;
  updateSource: (id: string, data: any) => void;
  removeSource: (id: string) => void;
  
  // Layer CRUD
  addLayer: (layer: Omit<ProtoLayer, 'id'>) => string;
  updateLayer: (id: string, updates: Partial<ProtoLayer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  toggleLayerVisibility: (id: string) => void;
  setSelectedLayer: (id: string | null) => void;
}

export interface DrawingStore {
  mode: DrawMode;
  features: DrawnFeature[];
  selectedIds: string[];
  snapToGrid: boolean;
  showMeasurements: boolean;
  
  setMode: (mode: DrawMode) => void;
  addFeature: (feature: DrawnFeature) => void;
  updateFeature: (id: string, updates: Partial<DrawnFeature>) => void;
  deleteFeatures: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  clearAll: () => void;
  importGeoJSON: (geojson: GeoJSON.FeatureCollection) => void;
  exportGeoJSON: () => GeoJSON.FeatureCollection;
}

export interface AnimatedLineStore {
  lines: AnimatedLine[];

  addLine: (line: Omit<AnimatedLine, 'id' | 'progress'>) => string;
  updateLine: (id: string, updates: Partial<AnimatedLine>) => void;
  removeLine: (id: string) => void;
  setProgress: (id: string, progress: number) => void;
  playLine: (id: string) => void;
  stopLine: (id: string) => void;
}

export interface EnvironmentStore extends EnvironmentState {
  setEnabled: (enabled: boolean) => void;
  setAmbientLight: (light: Partial<AmbientLight>) => void;
  setDirectionalLight: (light: Partial<DirectionalLight>) => void;
  setFog: (fog: Partial<Fog>) => void;
  setFogEnabled: (enabled: boolean) => void;
  setTimeOfDay: (time: TimeOfDay | 'custom') => void;
  applyPreset: (time: TimeOfDay) => void;
  reset: () => void;
}
