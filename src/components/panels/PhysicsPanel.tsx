import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiZap,
  FiChevronDown,
  FiPlay,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiTarget,
  FiSliders,
  FiSettings,
  FiDownload,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { useMapStore, useUIStore } from '../../stores';
import {
  SpringSimulator,
  CameraAnimator,
  easings,
  CubicBezier,
  generatePhysicsAnimationCode,
  type SpringConfig,
  type PhysicsType,
  type AnimationTarget,
} from '../../utils/physics';
import { copyToClipboard } from '../../utils/codeGenerator';

// Spring presets
const SPRING_PRESETS: Record<string, SpringConfig> = {
  default: { stiffness: 100, damping: 10, mass: 1 },
  gentle: { stiffness: 50, damping: 15, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 300, damping: 20, mass: 1 },
  slow: { stiffness: 50, damping: 20, mass: 2 },
  molasses: { stiffness: 30, damping: 30, mass: 3 },
  snappy: { stiffness: 400, damping: 25, mass: 0.5 },
  bouncy: { stiffness: 200, damping: 8, mass: 1 },
  elastic: { stiffness: 150, damping: 5, mass: 1 },
};

// Easing categories
const EASING_CATEGORIES = {
  standard: ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'],
  smooth: ['easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInQuart', 'easeOutQuart', 'easeInOutQuart'],
  dramatic: ['easeInExpo', 'easeOutExpo', 'easeInOutExpo', 'easeInCirc', 'easeOutCirc', 'easeInOutCirc'],
  overshoot: ['easeInBack', 'easeOutBack', 'easeInOutBack'],
  elastic: ['easeInElastic', 'easeOutElastic', 'easeInOutElastic'],
  bounce: ['easeInBounce', 'easeOutBounce', 'easeInOutBounce'],
};

export const PhysicsPanel = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const map = useMapStore((s) => s.map);
  const camera = useMapStore((s) => s.camera);

  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<'spring' | 'easing' | 'bezier'>('spring');
  const [copied, setCopied] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsJson, setSettingsJson] = useState('');

  // Spring state
  const [springPreset, setSpringPreset] = useState('default');
  const [springConfig, setSpringConfig] = useState<SpringConfig>(SPRING_PRESETS.default);

  // Easing state
  const [selectedEasing, setSelectedEasing] = useState('easeOutCubic');
  const [easingDuration, setEasingDuration] = useState(1500);

  // Bezier state
  const [bezierPoints, setBezierPoints] = useState({ p1x: 0.4, p1y: 0, p2x: 0.2, p2y: 1 });

  // Animation target
  const [targetCamera, setTargetCamera] = useState<AnimationTarget | null>(null);
  const animatorRef = useRef<CameraAnimator | null>(null);
  const startCameraRef = useRef<AnimationTarget | null>(null);

  // Export all settings as JSON
  const exportSettings = () => {
    const settings = {
      mode,
      spring: {
        preset: springPreset,
        config: springConfig,
      },
      easing: {
        function: selectedEasing,
        duration: easingDuration,
      },
      bezier: {
        points: bezierPoints,
        duration: easingDuration,
      },
      animation: {
        start: startCameraRef.current,
        target: targetCamera,
      },
      _meta: {
        description: "Mapbox Proto physics settings. Edit values and paste back to import.",
        springConfigHelp: {
          stiffness: "Higher = faster snap (10-500)",
          damping: "Higher = less bounce (1-50)", 
          mass: "Higher = heavier/slower (0.1-5)",
        },
        easingFunctions: Object.keys(easings).filter(k => k !== 'springApprox'),
        bezierHelp: "p1x/p2x: 0-1, p1y/p2y: -0.5 to 1.5 for overshoot",
      }
    };
    return JSON.stringify(settings, null, 2);
  };

  // Import settings from JSON
  const importSettings = (json: string) => {
    try {
      const settings = JSON.parse(json);
      
      if (settings.mode) setMode(settings.mode);
      
      if (settings.spring) {
        if (settings.spring.preset && SPRING_PRESETS[settings.spring.preset]) {
          setSpringPreset(settings.spring.preset);
        }
        if (settings.spring.config) {
          setSpringConfig({
            stiffness: settings.spring.config.stiffness ?? 100,
            damping: settings.spring.config.damping ?? 10,
            mass: settings.spring.config.mass ?? 1,
          });
        }
      }
      
      if (settings.easing) {
        if (settings.easing.function) setSelectedEasing(settings.easing.function);
        if (settings.easing.duration) setEasingDuration(settings.easing.duration);
      }
      
      if (settings.bezier?.points) {
        setBezierPoints(settings.bezier.points);
      }
      
      if (settings.animation) {
        if (settings.animation.start) startCameraRef.current = settings.animation.start;
        if (settings.animation.target) setTargetCamera(settings.animation.target);
      }
      
      return true;
    } catch (e) {
      console.error('Failed to parse settings:', e);
      return false;
    }
  };

  const handleOpenSettings = () => {
    setSettingsJson(exportSettings());
    setShowSettingsModal(true);
  };

  const handleImportSettings = () => {
    if (importSettings(settingsJson)) {
      setShowSettingsModal(false);
    } else {
      alert('Invalid JSON. Check the format and try again.');
    }
  };

  // Initialize animator
  useEffect(() => {
    if (map) {
      animatorRef.current = new CameraAnimator(map);
    }
    return () => {
      animatorRef.current?.stop();
    };
  }, [map]);

  // Update spring config when preset changes
  useEffect(() => {
    setSpringConfig(SPRING_PRESETS[springPreset]);
  }, [springPreset]);

  const captureTarget = () => {
    setTargetCamera({
      center: [camera.center[0], camera.center[1]],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    });
  };

  const captureStart = () => {
    startCameraRef.current = {
      center: [camera.center[0], camera.center[1]],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    };
  };

  const playAnimation = () => {
    if (!map || !targetCamera || !animatorRef.current) return;

    const from = startCameraRef.current ?? {
      center: [camera.center[0], camera.center[1]],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    };

    if (mode === 'spring') {
      animatorRef.current.animate(from, targetCamera, {
        type: 'spring',
        spring: springConfig,
        duration: 10000,
      });
    } else {
      // Manual easing animation
      const startTime = performance.now();
      const easingFn = mode === 'bezier'
        ? new CubicBezier(bezierPoints.p1x, bezierPoints.p1y, bezierPoints.p2x, bezierPoints.p2y).getEasing()
        : (easings[selectedEasing as keyof typeof easings] as (t: number) => number);

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / easingDuration, 1);
        const eased = easingFn(progress) as number;

        map.jumpTo({
          center: [
            from.center[0] + (targetCamera.center[0] - from.center[0]) * eased,
            from.center[1] + (targetCamera.center[1] - from.center[1]) * eased,
          ],
          zoom: from.zoom + (targetCamera.zoom - from.zoom) * eased,
          bearing: from.bearing + (targetCamera.bearing - from.bearing) * eased,
          pitch: from.pitch + (targetCamera.pitch - from.pitch) * eased,
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  };

  const resetAnimation = () => {
    animatorRef.current?.stop();
    if (startCameraRef.current && map) {
      map.jumpTo({
        center: startCameraRef.current.center,
        zoom: startCameraRef.current.zoom,
        bearing: startCameraRef.current.bearing,
        pitch: startCameraRef.current.pitch,
      });
    }
  };

  const handleCopyCode = async () => {
    if (!targetCamera) return;

    const from = startCameraRef.current ?? {
      center: [camera.center[0], camera.center[1]],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    };

    const code = generatePhysicsAnimationCode(
      {
        type: mode === 'spring' ? 'spring' : 'decay',
        spring: mode === 'spring' ? springConfig : undefined,
        duration: easingDuration,
      },
      from,
      targetCamera
    );

    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
      }`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1"
        >
          <FiZap className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Physics
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="ml-auto">
            <FiChevronDown className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
          </motion.div>
        </button>
        <button
          onClick={handleOpenSettings}
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
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
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
              {/* Modal Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <h3 className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Physics Settings
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className={`p-1 rounded-md ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                  }`}
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4">
                <p className={`text-sm mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Copy this JSON, refine with an LLM, then paste back and import.
                </p>
                <textarea
                  value={settingsJson}
                  onChange={(e) => setSettingsJson(e.target.value)}
                  className={`w-full h-80 px-3 py-2 text-xs font-mono rounded-lg resize-none ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-zinc-50 text-zinc-900 border-zinc-300'
                  } border focus:outline-none focus:ring-2 focus:ring-amber-500`}
                  spellCheck={false}
                />
              </div>

              {/* Modal Footer */}
              <div className={`flex items-center justify-between px-4 py-3 border-t ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <button
                  onClick={async () => {
                    await copyToClipboard(settingsJson);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  }`}
                >
                  {copied ? <FiCheck size={14} className="text-green-500" /> : <FiCopy size={14} />}
                  Copy
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSettings}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-500"
                  >
                    <FiUpload size={14} />
                    Import
                  </button>
                </div>
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
          {/* Mode Selector */}
          <div className="flex gap-1 p-1 rounded-lg bg-zinc-800">
            {(['spring', 'easing', 'bezier'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === m
                    ? 'bg-amber-600 text-white'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Spring Controls */}
          {mode === 'spring' && (
            <>
              {/* Presets */}
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
                  Preset
                </label>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(SPRING_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSpringPreset(preset)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        springPreset === preset
                          ? 'bg-amber-600 text-white'
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

              {/* Spring Parameters */}
              <div className="space-y-3">
                <SliderControl
                  label="Stiffness"
                  value={springConfig.stiffness}
                  min={10}
                  max={500}
                  step={10}
                  onChange={(v) => setSpringConfig({ ...springConfig, stiffness: v })}
                  isDark={isDark}
                  description="Higher = faster, snappier"
                />
                <SliderControl
                  label="Damping"
                  value={springConfig.damping}
                  min={1}
                  max={50}
                  step={1}
                  onChange={(v) => setSpringConfig({ ...springConfig, damping: v })}
                  isDark={isDark}
                  description="Higher = less oscillation"
                />
                <SliderControl
                  label="Mass"
                  value={springConfig.mass}
                  min={0.1}
                  max={5}
                  step={0.1}
                  onChange={(v) => setSpringConfig({ ...springConfig, mass: v })}
                  isDark={isDark}
                  description="Higher = heavier, slower"
                />
              </div>

              {/* Spring Visualization */}
              <SpringVisualizer config={springConfig} isDark={isDark} />
            </>
          )}

          {/* Easing Controls */}
          {mode === 'easing' && (
            <>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
                  Easing Function
                </label>
                {Object.entries(EASING_CATEGORIES).map(([category, funcs]) => (
                  <div key={category} className="mb-2">
                    <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-1 capitalize`}>
                      {category}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {funcs.map((func) => (
                        <button
                          key={func}
                          onClick={() => setSelectedEasing(func)}
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            selectedEasing === func
                              ? 'bg-amber-600 text-white'
                              : isDark
                              ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                              : 'bg-zinc-200 text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          {func.replace('ease', '').replace('InOut', '↔').replace('In', '→').replace('Out', '←')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <SliderControl
                label="Duration"
                value={easingDuration}
                min={200}
                max={5000}
                step={100}
                suffix="ms"
                onChange={setEasingDuration}
                isDark={isDark}
              />

              {/* Easing Visualization */}
              <EasingVisualizer easing={selectedEasing} isDark={isDark} />
            </>
          )}

          {/* Bezier Controls */}
          {mode === 'bezier' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <SliderControl
                  label="P1 X"
                  value={bezierPoints.p1x}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setBezierPoints({ ...bezierPoints, p1x: v })}
                  isDark={isDark}
                />
                <SliderControl
                  label="P1 Y"
                  value={bezierPoints.p1y}
                  min={-0.5}
                  max={1.5}
                  step={0.05}
                  onChange={(v) => setBezierPoints({ ...bezierPoints, p1y: v })}
                  isDark={isDark}
                />
                <SliderControl
                  label="P2 X"
                  value={bezierPoints.p2x}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setBezierPoints({ ...bezierPoints, p2x: v })}
                  isDark={isDark}
                />
                <SliderControl
                  label="P2 Y"
                  value={bezierPoints.p2y}
                  min={-0.5}
                  max={1.5}
                  step={0.05}
                  onChange={(v) => setBezierPoints({ ...bezierPoints, p2y: v })}
                  isDark={isDark}
                />
              </div>

              <SliderControl
                label="Duration"
                value={easingDuration}
                min={200}
                max={5000}
                step={100}
                suffix="ms"
                onChange={setEasingDuration}
                isDark={isDark}
              />

              {/* Bezier Visualization */}
              <BezierVisualizer points={bezierPoints} isDark={isDark} />

              <div className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                cubic-bezier({bezierPoints.p1x}, {bezierPoints.p1y}, {bezierPoints.p2x}, {bezierPoints.p2y})
              </div>
            </>
          )}

          {/* Target Controls */}
          <div className={`pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex gap-2 mb-2">
              <button
                onClick={captureStart}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                <FiSliders size={14} />
                Set Start
              </button>
              <button
                onClick={captureTarget}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg ${
                  targetCamera
                    ? 'bg-amber-600 text-white'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                <FiTarget size={14} />
                Set Target
              </button>
            </div>

            {targetCamera && (
              <div className={`text-xs font-mono p-2 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                z:{targetCamera.zoom.toFixed(1)} p:{targetCamera.pitch.toFixed(0)}° b:{targetCamera.bearing.toFixed(0)}°
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={playAnimation}
              disabled={!targetCamera}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                targetCamera
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <FiPlay size={14} />
              Play
            </button>
            <button
              onClick={resetAnimation}
              className={`px-3 py-2 rounded-lg ${
                isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              <FiRefreshCw size={14} />
            </button>
            <button
              onClick={handleCopyCode}
              disabled={!targetCamera}
              className={`px-3 py-2 rounded-lg ${
                targetCamera
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  : isDark
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {copied ? <FiCheck size={14} className="text-green-500" /> : <FiCopy size={14} />}
            </button>
          </div>

          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Uses jumpTo internally — terrain-immune animations.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  description?: string;
  onChange: (value: number) => void;
  isDark: boolean;
}

const SliderControl = ({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  description,
  onChange,
  isDark,
}: SliderControlProps) => (
  <div>
    <div className="flex justify-between mb-1">
      <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {label}
        {description && (
          <span className={`ml-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            — {description}
          </span>
        )}
      </label>
      <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {value.toFixed(step < 1 ? 2 : 0)}{suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
      style={{
        background: isDark
          ? `linear-gradient(to right, #f59e0b ${((value - min) / (max - min)) * 100}%, #3f3f46 ${((value - min) / (max - min)) * 100}%)`
          : `linear-gradient(to right, #f59e0b ${((value - min) / (max - min)) * 100}%, #e4e4e7 ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
  </div>
);

// Spring motion visualizer
const SpringVisualizer = ({ config, isDark }: { config: SpringConfig; isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw spring curve
    const spring = new SpringSimulator(config);
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;

    for (let i = 0; i <= width; i++) {
      const t = (i / width) * 3; // 3 seconds
      const state = spring.solve(0, 1, 0, t);
      const y = height - (state.value * (height - 20) + 10);

      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }

    ctx.stroke();

    // Draw target line
    ctx.beginPath();
    ctx.strokeStyle = isDark ? '#52525b' : '#a1a1aa';
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, 10);
    ctx.lineTo(width, 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [config, isDark]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`w-full rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
    />
  );
};

// Easing curve visualizer
const EasingVisualizer = ({ easing, isDark }: { easing: string; isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;

    ctx.clearRect(0, 0, width, height);

    const easingFn = (easings[easing as keyof typeof easings] || easings.linear) as (t: number) => number;

    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;

    for (let i = 0; i <= width - padding * 2; i++) {
      const t = i / (width - padding * 2);
      const y = height - padding - (easingFn(t) as number) * (height - padding * 2);

      if (i === 0) {
        ctx.moveTo(i + padding, y);
      } else {
        ctx.lineTo(i + padding, y);
      }
    }

    ctx.stroke();
  }, [easing, isDark]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`w-full rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
    />
  );
};

// Bezier curve visualizer
const BezierVisualizer = ({
  points,
  isDark,
}: {
  points: { p1x: number; p1y: number; p2x: number; p2y: number };
  isDark: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Draw control points
    const p0 = { x: padding, y: height - padding };
    const p1 = { x: padding + points.p1x * graphWidth, y: height - padding - points.p1y * graphHeight };
    const p2 = { x: padding + points.p2x * graphWidth, y: height - padding - points.p2y * graphHeight };
    const p3 = { x: width - padding, y: padding };

    // Control lines
    ctx.beginPath();
    ctx.strokeStyle = isDark ? '#52525b' : '#a1a1aa';
    ctx.lineWidth = 1;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Bezier curve
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();

    // Control points
    [p1, p2].forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = '#f59e0b';
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, isDark]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className={`w-full rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
    />
  );
};
