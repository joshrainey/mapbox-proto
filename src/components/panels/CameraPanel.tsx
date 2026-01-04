import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiChevronDown, FiPlay, FiZap, FiTarget } from 'react-icons/fi';
import { useMapStore, useAnimationStore, captureKeyframe, CAMERA_PRESETS, useUIStore } from '../../stores';
import type { CameraState, EasingType, AnimationType } from '../../types';

export const CameraPanel = () => {
  const { camera, setCamera, flyTo, easeTo, jumpTo } = useMapStore();
  const { activeSequenceId, addKeyframe } = useAnimationStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [animationType, setAnimationType] = useState<AnimationType>('flyTo');
  const [duration, setDuration] = useState(2000);
  const [easing, setEasing] = useState<EasingType>('easeInOut');
  const [expanded, setExpanded] = useState(true);

  const handleSliderChange = (key: keyof CameraState, value: number) => {
    const newCamera = { ...camera, [key]: value };
    setCamera(newCamera);
    jumpTo(newCamera);
  };

  const handleCenterChange = (index: 0 | 1, value: number) => {
    const newCenter: [number, number] = [...camera.center] as [number, number];
    newCenter[index] = value;
    const newCamera = { ...camera, center: newCenter };
    setCamera(newCamera);
    jumpTo(newCamera);
  };

  const handlePresetClick = (preset: typeof CAMERA_PRESETS[number]) => {
    const targetCamera = { ...camera, ...preset.camera };
    flyTo(targetCamera, { duration, easing });
  };

  const handleAnimate = () => {
    const options = { duration, easing, animationType };
    switch (animationType) {
      case 'flyTo':
        flyTo(camera, options);
        break;
      case 'easeTo':
        easeTo(camera, options);
        break;
      case 'jumpTo':
        jumpTo(camera);
        break;
    }
  };

  const handleCaptureKeyframe = () => {
    if (activeSequenceId) {
      const keyframe = captureKeyframe();
      keyframe.duration = duration;
      keyframe.easing = easing;
      keyframe.animationType = animationType;
      addKeyframe(activeSequenceId, keyframe);
    }
  };

  return (
    <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center justify-between ${
          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
        } transition-colors`}
      >
        <div className="flex items-center gap-2">
          <FiCamera className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Camera
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
        </motion.div>
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Presets */}
          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
              Presets
            </label>
            <div className="flex flex-wrap gap-1">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 hover:text-zinc-900'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Center Coordinates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                Longitude
              </label>
              <input
                type="number"
                value={camera.center[0].toFixed(6)}
                onChange={(e) => handleCenterChange(0, parseFloat(e.target.value) || 0)}
                step="0.001"
                className={`w-full px-2 py-1.5 text-sm rounded-md font-mono ${
                  isDark
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                } border focus:outline-none focus:ring-1 focus:ring-violet-500`}
              />
            </div>
            <div>
              <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                Latitude
              </label>
              <input
                type="number"
                value={camera.center[1].toFixed(6)}
                onChange={(e) => handleCenterChange(1, parseFloat(e.target.value) || 0)}
                step="0.001"
                className={`w-full px-2 py-1.5 text-sm rounded-md font-mono ${
                  isDark
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                } border focus:outline-none focus:ring-1 focus:ring-violet-500`}
              />
            </div>
          </div>

          {/* Sliders */}
          <SliderControl
            label="Zoom"
            value={camera.zoom}
            min={0}
            max={22}
            step={0.1}
            onChange={(v) => handleSliderChange('zoom', v)}
            isDark={isDark}
          />
          <SliderControl
            label="Pitch"
            value={camera.pitch}
            min={0}
            max={85}
            step={1}
            suffix="°"
            onChange={(v) => handleSliderChange('pitch', v)}
            isDark={isDark}
          />
          <SliderControl
            label="Bearing"
            value={camera.bearing}
            min={-180}
            max={180}
            step={1}
            suffix="°"
            onChange={(v) => handleSliderChange('bearing', v)}
            isDark={isDark}
          />

          {/* Animation Options */}
          <div className={`pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
              Animation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={animationType}
                onChange={(e) => setAnimationType(e.target.value as AnimationType)}
                className={`px-2 py-1.5 text-sm rounded-md ${
                  isDark
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                } border focus:outline-none focus:ring-1 focus:ring-violet-500`}
              >
                <option value="flyTo">flyTo</option>
                <option value="easeTo">easeTo</option>
                <option value="jumpTo">jumpTo</option>
                <option value="rotateTo">rotateTo</option>
              </select>
              <select
                value={easing}
                onChange={(e) => setEasing(e.target.value as EasingType)}
                className={`px-2 py-1.5 text-sm rounded-md ${
                  isDark
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                } border focus:outline-none focus:ring-1 focus:ring-violet-500`}
              >
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="easeInOut">Ease In/Out</option>
                <option value="easeInCubic">Ease In Cubic</option>
                <option value="easeOutCubic">Ease Out Cubic</option>
                <option value="bounce">Bounce</option>
                <option value="elastic">Elastic</option>
              </select>
            </div>

            <SliderControl
              label="Duration"
              value={duration}
              min={100}
              max={10000}
              step={100}
              suffix="ms"
              onChange={setDuration}
              isDark={isDark}
              className="mt-3"
            />

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAnimate}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <FiPlay size={14} />
                Preview
              </button>
              <button
                onClick={handleCaptureKeyframe}
                disabled={!activeSequenceId}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSequenceId
                    ? isDark
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                      : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                    : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <FiTarget size={14} />
                Capture
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Reusable slider component
interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
  isDark: boolean;
  className?: string;
}

const SliderControl = ({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
  isDark,
  className = '',
}: SliderControlProps) => (
  <div className={className}>
    <div className="flex justify-between mb-1">
      <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {label}
      </label>
      <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500"
      style={{
        background: isDark
          ? `linear-gradient(to right, #8b5cf6 ${((value - min) / (max - min)) * 100}%, #3f3f46 ${((value - min) / (max - min)) * 100}%)`
          : `linear-gradient(to right, #8b5cf6 ${((value - min) / (max - min)) * 100}%, #e4e4e7 ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
  </div>
);
