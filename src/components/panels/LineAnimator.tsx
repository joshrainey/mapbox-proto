import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiTrendingUp,
  FiChevronDown,
  FiPlay,
  FiPause,
  FiSquare,
  FiPlus,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useMapStore, useUIStore } from '../../stores';
import { copyToClipboard } from '../../utils/codeGenerator';
import { easings } from '../../utils/physics';

// ============================================
// Pure JS line utilities (no Turf)
// ============================================

interface Coordinate {
  lng: number;
  lat: number;
}

/**
 * Calculate distance between two points (simple Euclidean for screen space)
 * For geo-accurate distance, use Haversine - but for animation this is fine
 */
function distance(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Interpolate between two points
 */
function lerp2D(a: [number, number], b: [number, number], t: number): [number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
}

/**
 * Get partial line up to a progress point (0-1)
 * Returns valid coordinates array, never empty, never invalid
 */
function getPartialLine(coords: [number, number][], progress: number): [number, number][] {
  if (!coords || coords.length < 2) {
    console.warn('getPartialLine: invalid coords');
    return coords || [];
  }
  
  // Clamp progress
  const p = Math.max(0, Math.min(1, progress));
  
  if (p <= 0) {
    // Return first point duplicated (valid 2-point line)
    return [coords[0], coords[0]];
  }
  
  if (p >= 1) {
    return coords;
  }
  
  // Calculate segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  
  for (let i = 1; i < coords.length; i++) {
    const len = distance(coords[i - 1], coords[i]);
    segmentLengths.push(len);
    totalLength += len;
  }
  
  if (totalLength === 0) {
    return [coords[0], coords[0]];
  }
  
  // Find target distance
  const targetLength = totalLength * p;
  let accumulated = 0;
  
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLen = segmentLengths[i];
    
    if (accumulated + segmentLen >= targetLength) {
      // We're in this segment
      const segmentProgress = segmentLen > 0 
        ? (targetLength - accumulated) / segmentLen 
        : 0;
      
      const interpolated = lerp2D(coords[i], coords[i + 1], segmentProgress);
      
      // Return all points up to i, plus interpolated point
      const result = coords.slice(0, i + 1);
      result.push(interpolated);
      return result;
    }
    
    accumulated += segmentLen;
  }
  
  // Fallback - return full line
  return coords;
}

/**
 * Get line segment for trail effect (from tailProgress to headProgress)
 */
function getLineSegment(
  coords: [number, number][],
  headProgress: number,
  trailLength: number
): [number, number][] {
  const tailProgress = Math.max(0, headProgress - trailLength);
  
  if (headProgress <= 0) {
    return [coords[0], coords[0]];
  }
  
  // Get head position
  const headLine = getPartialLine(coords, headProgress);
  
  if (tailProgress <= 0) {
    return headLine;
  }
  
  // Get tail position and trim
  const tailLine = getPartialLine(coords, tailProgress);
  
  // The visible segment is from tail end to head end
  if (tailLine.length < 2 || headLine.length < 2) {
    return headLine;
  }
  
  // Start from tail's last point, add remaining points from head
  const tailEnd = tailLine[tailLine.length - 1];
  const tailEndIndex = tailLine.length - 1;
  
  // Find where tail ends in the head line and slice from there
  const result: [number, number][] = [tailEnd];
  
  for (let i = tailEndIndex; i < headLine.length; i++) {
    const point = headLine[i];
    // Avoid duplicates
    const last = result[result.length - 1];
    if (point[0] !== last[0] || point[1] !== last[1]) {
      result.push(point);
    }
  }
  
  // Ensure at least 2 points
  if (result.length < 2) {
    result.push(result[0]);
  }
  
  return result;
}

// ============================================
// Line style presets
// ============================================

interface LineStyle {
  color: string;
  width: number;
  opacity: number;
  dashArray?: number[];
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'bevel' | 'round' | 'miter';
  glow: boolean;
  glowColor?: string;
  glowWidth?: number;
  blur?: number;
}

const LINE_PRESETS: Record<string, LineStyle> = {
  solid: {
    color: '#3b82f6',
    width: 4,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    glow: false,
  },
  dashed: {
    color: '#8b5cf6',
    width: 3,
    opacity: 1,
    dashArray: [10, 5],
    lineCap: 'round',
    lineJoin: 'round',
    glow: false,
  },
  dotted: {
    color: '#ec4899',
    width: 4,
    opacity: 1,
    dashArray: [2, 6],
    lineCap: 'round',
    lineJoin: 'round',
    glow: false,
  },
  neon: {
    color: '#22d3ee',
    width: 2,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    glow: true,
    glowColor: '#22d3ee',
    glowWidth: 8,
    blur: 4,
  },
  fire: {
    color: '#fbbf24',
    width: 3,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    glow: true,
    glowColor: '#f97316',
    glowWidth: 10,
    blur: 6,
  },
  subtle: {
    color: '#6b7280',
    width: 2,
    opacity: 0.6,
    lineCap: 'round',
    lineJoin: 'round',
    glow: false,
  },
  thick: {
    color: '#10b981',
    width: 8,
    opacity: 0.8,
    lineCap: 'round',
    lineJoin: 'round',
    glow: false,
  },
  trail: {
    color: '#a855f7',
    width: 4,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    glow: true,
    glowColor: '#a855f7',
    glowWidth: 12,
    blur: 8,
  },
};

// ============================================
// Animation config
// ============================================

interface AnimationConfig {
  duration: number;
  easing: string;
  trailLength: number; // 0-1, 0 = no trail (full line), 1 = just the head
  loop: boolean;
  pingPong: boolean; // Reverse on complete instead of restart
}

// ============================================
// Component
// ============================================

export const LineAnimator = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const map = useMapStore((s) => s.map);

  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Line coordinates
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Style
  const [stylePreset, setStylePreset] = useState('solid');
  const [style, setStyle] = useState<LineStyle>(LINE_PRESETS.solid);
  
  // Animation
  const [config, setConfig] = useState<AnimationConfig>({
    duration: 3000,
    easing: 'easeInOutCubic',
    trailLength: 0,
    loop: true,
    pingPong: false,
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsJson, setSettingsJson] = useState('');

  // Source/layer IDs
  const sourceId = 'line-animator-source';
  const layerId = 'line-animator-layer';
  const glowLayerId = 'line-animator-glow';

  // Initialize source and layers
  useEffect(() => {
    if (!map) return;

    // Wait for map to be ready
    const setup = () => {
      // Add source
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] },
          },
        });
      }

      // Add glow layer (below main line)
      if (!map.getLayer(glowLayerId)) {
        map.addLayer({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': style.glowColor || style.color,
            'line-width': style.glowWidth || style.width * 3,
            'line-opacity': style.glow ? 0.4 : 0,
            'line-blur': style.blur || 4,
          },
          layout: {
            'line-cap': style.lineCap,
            'line-join': style.lineJoin,
          },
        });
      }

      // Add main line layer
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': style.color,
            'line-width': style.width,
            'line-opacity': style.opacity,
            ...(style.dashArray && { 'line-dasharray': style.dashArray }),
          },
          layout: {
            'line-cap': style.lineCap,
            'line-join': style.lineJoin,
          },
        });
      }
    };

    if (map.loaded()) {
      setup();
    } else {
      map.on('load', setup);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clean up layers/source
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map]);

  // Update layer styles when style changes
  useEffect(() => {
    if (!map) return;

    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'line-color', style.color);
      map.setPaintProperty(layerId, 'line-width', style.width);
      map.setPaintProperty(layerId, 'line-opacity', style.opacity);
      if (style.dashArray) {
        map.setPaintProperty(layerId, 'line-dasharray', style.dashArray);
      }
      map.setLayoutProperty(layerId, 'line-cap', style.lineCap);
      map.setLayoutProperty(layerId, 'line-join', style.lineJoin);
    }

    if (map.getLayer(glowLayerId)) {
      map.setPaintProperty(glowLayerId, 'line-color', style.glowColor || style.color);
      map.setPaintProperty(glowLayerId, 'line-width', style.glowWidth || style.width * 3);
      map.setPaintProperty(glowLayerId, 'line-opacity', style.glow ? 0.4 : 0);
      map.setPaintProperty(glowLayerId, 'line-blur', style.blur || 4);
    }
  }, [map, style]);

  // Handle drawing mode
  useEffect(() => {
    if (!map || !isDrawing) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setCoordinates((prev) => [...prev, coord]);
    };

    const onDblClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
      setIsDrawing(false);
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.doubleClickZoom.disable();

    return () => {
      map.getCanvas().style.cursor = '';
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.doubleClickZoom.enable();
    };
  }, [map, isDrawing]);

  // Update map when coordinates change (while drawing)
  useEffect(() => {
    if (!map || coordinates.length < 2) return;

    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      });
    }
  }, [map, coordinates]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !map || coordinates.length < 2) return;

    const startTime = performance.now();
    const easingFn = (easings[config.easing as keyof typeof easings] || easings.linear) as (t: number) => number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let rawProgress = elapsed / config.duration;

      if (config.pingPong) {
        // Ping pong: 0->1->0->1...
        const cycle = Math.floor(rawProgress);
        const cycleProgress = rawProgress - cycle;
        rawProgress = cycle % 2 === 0 ? cycleProgress : 1 - cycleProgress;
      }

      if (rawProgress >= 1 && !config.loop && !config.pingPong) {
        // Done
        setProgress(1);
        setIsPlaying(false);
        updateLine(1);
        return;
      }

      const loopedProgress = config.loop ? rawProgress % 1 : Math.min(rawProgress, 1);
      const easedProgress = easingFn(loopedProgress);

      setProgress(easedProgress);
      updateLine(easedProgress);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, config, coordinates, map]);

  const updateLine = (p: number) => {
    if (!map || coordinates.length < 2) return;

    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (!source) return;

    let visibleCoords: [number, number][];

    if (config.trailLength > 0) {
      // Trail mode - show segment from tail to head
      visibleCoords = getLineSegment(coordinates, p, config.trailLength);
    } else {
      // Draw mode - show from start to head
      visibleCoords = getPartialLine(coordinates, p);
    }

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: visibleCoords },
    });
  };

  const handlePlay = () => {
    if (coordinates.length < 2) return;
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setProgress(0);
    updateLine(0);
  };

  const handleClear = () => {
    handleStop();
    setCoordinates([]);
    if (map) {
      const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
      }
    }
  };

  const handlePresetChange = (presetId: string) => {
    setStylePreset(presetId);
    setStyle(LINE_PRESETS[presetId]);
  };

  // Export settings
  const exportSettings = () => {
    return JSON.stringify({
      coordinates,
      style,
      stylePreset,
      animation: config,
      _meta: {
        description: "Line animation settings. Edit and import back.",
        easingOptions: Object.keys(easings).filter(k => k !== 'springApprox'),
        trailLengthHelp: "0 = draw full line, 0.1-0.5 = trailing segment",
      }
    }, null, 2);
  };

  const importSettings = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.coordinates) setCoordinates(data.coordinates);
      if (data.style) setStyle(data.style);
      if (data.stylePreset) setStylePreset(data.stylePreset);
      if (data.animation) setConfig(data.animation);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCopyCode = async () => {
    const code = generateCode();
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCode = () => {
    const easingCode = config.easing === 'linear' 
      ? '(t) => t'
      : `// ${config.easing}
(t) => {
  // Easing function - see easings library or CSS cubic-bezier
  ${getEasingCode(config.easing)}
}`;

    return `// Animated Line (No Turf - Edge-case Safe)
const coordinates = ${JSON.stringify(coordinates, null, 2)};

// Style
const style = ${JSON.stringify(style, null, 2)};

// Animation config
const duration = ${config.duration};
const trailLength = ${config.trailLength};
const loop = ${config.loop};

// Line utilities
function getPartialLine(coords, progress) {
  if (progress <= 0) return [coords[0], coords[0]];
  if (progress >= 1) return coords;
  
  let totalLength = 0;
  const segmentLengths = [];
  
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i-1][0];
    const dy = coords[i][1] - coords[i-1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }
  
  const targetLength = totalLength * progress;
  let accumulated = 0;
  
  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulated + segmentLengths[i] >= targetLength) {
      const t = (targetLength - accumulated) / segmentLengths[i];
      const interpolated = [
        coords[i][0] + (coords[i+1][0] - coords[i][0]) * t,
        coords[i][1] + (coords[i+1][1] - coords[i][1]) * t
      ];
      return [...coords.slice(0, i + 1), interpolated];
    }
    accumulated += segmentLengths[i];
  }
  
  return coords;
}

// Add source
map.addSource('animated-line', {
  type: 'geojson',
  data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
});

// Add glow layer (optional)
${style.glow ? `map.addLayer({
  id: 'animated-line-glow',
  type: 'line',
  source: 'animated-line',
  paint: {
    'line-color': '${style.glowColor || style.color}',
    'line-width': ${style.glowWidth || style.width * 3},
    'line-opacity': 0.4,
    'line-blur': ${style.blur || 4}
  },
  layout: { 'line-cap': '${style.lineCap}', 'line-join': '${style.lineJoin}' }
});` : '// No glow'}

// Add main line layer
map.addLayer({
  id: 'animated-line',
  type: 'line',
  source: 'animated-line',
  paint: {
    'line-color': '${style.color}',
    'line-width': ${style.width},
    'line-opacity': ${style.opacity}${style.dashArray ? `,
    'line-dasharray': [${style.dashArray.join(', ')}]` : ''}
  },
  layout: { 'line-cap': '${style.lineCap}', 'line-join': '${style.lineJoin}' }
});

// Easing function
const easing = ${easingCode};

// Animate
function animate() {
  const startTime = performance.now();
  
  function frame(currentTime) {
    const elapsed = currentTime - startTime;
    let progress = elapsed / duration;
    
    if (progress >= 1) {
      ${config.loop ? 'animate(); return;' : 'progress = 1;'}
    }
    
    const eased = easing(progress);
    const visible = getPartialLine(coordinates, eased);
    
    map.getSource('animated-line').setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: visible }
    });
    
    ${config.loop ? 'requestAnimationFrame(frame);' : 'if (progress < 1) requestAnimationFrame(frame);'}
  }
  
  requestAnimationFrame(frame);
}

animate();
`;
  };

  const getEasingCode = (name: string): string => {
    const codes: Record<string, string> = {
      easeInQuad: 'return t * t;',
      easeOutQuad: 'return t * (2 - t);',
      easeInOutQuad: 'return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;',
      easeInCubic: 'return t * t * t;',
      easeOutCubic: 'return (--t) * t * t + 1;',
      easeInOutCubic: 'return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;',
      easeOutElastic: 'return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;',
      easeOutBounce: `const n1 = 7.5625, d1 = 2.75;
  if (t < 1/d1) return n1 * t * t;
  if (t < 2/d1) return n1 * (t -= 1.5/d1) * t + 0.75;
  if (t < 2.5/d1) return n1 * (t -= 2.25/d1) * t + 0.9375;
  return n1 * (t -= 2.625/d1) * t + 0.984375;`,
    };
    return codes[name] || 'return t;';
  };

  return (
    <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1"
        >
          <FiTrendingUp className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Lines
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="ml-auto">
            <FiChevronDown className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          </motion.div>
        </button>
        <button
          onClick={() => {
            setSettingsJson(exportSettings());
            setShowSettings(true);
          }}
          className={`ml-2 p-1.5 rounded-md transition-colors ${
            isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
          }`}
          title="Import/Export Settings"
        >
          <FiSettings size={14} />
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl mx-4 rounded-xl shadow-2xl ${
                isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
              }`}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <h3 className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Line Animation Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className={`p-1 rounded-md ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                }`}>
                  <FiX size={18} />
                </button>
              </div>
              <div className="p-4">
                <textarea
                  value={settingsJson}
                  onChange={(e) => setSettingsJson(e.target.value)}
                  className={`w-full h-80 px-3 py-2 text-xs font-mono rounded-lg resize-none ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-zinc-50 text-zinc-900 border-zinc-300'
                  } border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                  spellCheck={false}
                />
              </div>
              <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (importSettings(settingsJson)) {
                      setShowSettings(false);
                    } else {
                      alert('Invalid JSON');
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-500"
                >
                  Import
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Draw Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsDrawing(!isDrawing)}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                isDrawing
                  ? 'bg-cyan-600 text-white'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              {isDrawing ? 'Drawing... (dbl-click to finish)' : 'Draw Line'}
            </button>
            <button
              onClick={handleClear}
              disabled={coordinates.length === 0}
              className={`px-3 py-2 rounded-lg ${
                coordinates.length > 0
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  : isDark
                  ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-600'
                  : 'opacity-50 cursor-not-allowed bg-zinc-200 text-zinc-400'
              }`}
            >
              <FiTrash2 size={16} />
            </button>
          </div>

          {/* Point count */}
          {coordinates.length > 0 && (
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {coordinates.length} points
            </div>
          )}

          {/* Style Presets */}
          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
              Style
            </label>
            <div className="flex flex-wrap gap-1">
              {Object.keys(LINE_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    stylePreset === preset
                      ? 'bg-cyan-600 text-white'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Controls */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Duration
                </label>
                <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {config.duration}ms
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Trail Length
                </label>
                <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {config.trailLength.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={config.trailLength}
                onChange={(e) => setConfig({ ...config, trailLength: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.loop}
                  onChange={(e) => setConfig({ ...config, loop: e.target.checked })}
                  className="rounded"
                />
                <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Loop</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.pingPong}
                  onChange={(e) => setConfig({ ...config, pingPong: e.target.checked })}
                  className="rounded"
                />
                <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Ping Pong</span>
              </label>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
              >
                <FiPause size={16} />
                Pause
              </button>
            ) : (
              <button
                onClick={handlePlay}
                disabled={coordinates.length < 2}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg ${
                  coordinates.length >= 2
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <FiPlay size={16} />
                Play
              </button>
            )}
            <button
              onClick={handleStop}
              className={`px-3 py-2 rounded-lg ${
                isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              <FiSquare size={16} />
            </button>
            <button
              onClick={handleCopyCode}
              disabled={coordinates.length < 2}
              className={`px-3 py-2 rounded-lg ${
                coordinates.length >= 2
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  : isDark
                  ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-600'
                  : 'opacity-50 cursor-not-allowed bg-zinc-200 text-zinc-400'
              }`}
            >
              {copied ? <FiCheck size={16} className="text-green-500" /> : <FiCopy size={16} />}
            </button>
          </div>

          {/* Progress bar */}
          {coordinates.length >= 2 && (
            <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <div
                className="h-full bg-cyan-500 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}

          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            No Turf.js — handles edge cases without breaking.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
