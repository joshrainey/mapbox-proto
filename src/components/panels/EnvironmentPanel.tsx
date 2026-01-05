import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSun, FiChevronDown, FiCloud, FiZap, FiRefreshCw } from 'react-icons/fi';
import { useEnvironmentStore, useUIStore } from '../../stores';
import type { TimeOfDay } from '../../types';

const TIME_OF_DAY_OPTIONS: { id: TimeOfDay; name: string; icon: string; color: string }[] = [
  { id: 'dawn', name: 'Dawn', icon: '🌅', color: '#ff8c42' },
  { id: 'morning', name: 'Morning', icon: '🌤', color: '#87ceeb' },
  { id: 'noon', name: 'Noon', icon: '☀️', color: '#ffd700' },
  { id: 'afternoon', name: 'Afternoon', icon: '🌇', color: '#ffb347' },
  { id: 'dusk', name: 'Dusk', icon: '🌆', color: '#ff6b35' },
  { id: 'night', name: 'Night', icon: '🌙', color: '#4a5568' },
];

export const EnvironmentPanel = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const {
    enabled,
    timeOfDay,
    ambientLight,
    directionalLight,
    fog,
    fogEnabled,
    setEnabled,
    setAmbientLight,
    setDirectionalLight,
    setFog,
    setFogEnabled,
    applyPreset,
    reset,
  } = useEnvironmentStore();

  const [expanded, setExpanded] = useState(true);
  const [ambientExpanded, setAmbientExpanded] = useState(false);
  const [directionalExpanded, setDirectionalExpanded] = useState(false);
  const [fogExpanded, setFogExpanded] = useState(false);

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
          <FiSun className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Environment
          </span>
          {enabled && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
            }`}>
              ON
            </span>
          )}
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
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Enable 3D Lighting
            </span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                enabled
                  ? 'bg-amber-500'
                  : isDark
                  ? 'bg-zinc-700'
                  : 'bg-zinc-300'
              }`}
            >
              <motion.div
                animate={{ x: enabled ? 20 : 2 }}
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {enabled && (
            <>
              {/* Time of Day Presets */}
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
                  Time of Day
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIME_OF_DAY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => applyPreset(option.id)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-colors ${
                        timeOfDay === option.id
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
                            : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                          : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 hover:text-zinc-800'
                      }`}
                    >
                      <span className="text-base">{option.icon}</span>
                      <span>{option.name}</span>
                    </button>
                  ))}
                </div>
                {timeOfDay === 'custom' && (
                  <div className={`mt-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} text-center`}>
                    Custom settings
                  </div>
                )}
              </div>

              {/* Ambient Light Section */}
              <CollapsibleSection
                title="Ambient Light"
                icon={<FiZap size={14} />}
                expanded={ambientExpanded}
                onToggle={() => setAmbientExpanded(!ambientExpanded)}
                isDark={isDark}
              >
                <ColorControl
                  label="Color"
                  value={ambientLight.color}
                  onChange={(color) => setAmbientLight({ color })}
                  isDark={isDark}
                />
                <SliderControl
                  label="Intensity"
                  value={ambientLight.intensity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(intensity) => setAmbientLight({ intensity })}
                  isDark={isDark}
                />
              </CollapsibleSection>

              {/* Directional Light Section */}
              <CollapsibleSection
                title="Directional Light"
                icon={<FiSun size={14} />}
                expanded={directionalExpanded}
                onToggle={() => setDirectionalExpanded(!directionalExpanded)}
                isDark={isDark}
              >
                <ColorControl
                  label="Color"
                  value={directionalLight.color}
                  onChange={(color) => setDirectionalLight({ color })}
                  isDark={isDark}
                />
                <SliderControl
                  label="Intensity"
                  value={directionalLight.intensity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(intensity) => setDirectionalLight({ intensity })}
                  isDark={isDark}
                />
                <SliderControl
                  label="Azimuth"
                  value={directionalLight.direction[0]}
                  min={0}
                  max={360}
                  step={5}
                  suffix="°"
                  onChange={(azimuth) =>
                    setDirectionalLight({ direction: [azimuth, directionalLight.direction[1]] })
                  }
                  isDark={isDark}
                />
                <SliderControl
                  label="Altitude"
                  value={directionalLight.direction[1]}
                  min={0}
                  max={90}
                  step={5}
                  suffix="°"
                  onChange={(altitude) =>
                    setDirectionalLight({ direction: [directionalLight.direction[0], altitude] })
                  }
                  isDark={isDark}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Cast Shadows
                  </span>
                  <button
                    onClick={() => setDirectionalLight({ castShadows: !directionalLight.castShadows })}
                    className={`relative w-8 h-4 rounded-full transition-colors ${
                      directionalLight.castShadows
                        ? 'bg-amber-500'
                        : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                    }`}
                  >
                    <motion.div
                      animate={{ x: directionalLight.castShadows ? 16 : 2 }}
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                {directionalLight.castShadows && (
                  <SliderControl
                    label="Shadow Intensity"
                    value={directionalLight.shadowIntensity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(shadowIntensity) => setDirectionalLight({ shadowIntensity })}
                    isDark={isDark}
                    className="mt-2"
                  />
                )}
              </CollapsibleSection>

              {/* Fog & Atmosphere Section (combined per Mapbox spec) */}
              <CollapsibleSection
                title="Fog & Atmosphere"
                icon={<FiCloud size={14} />}
                expanded={fogExpanded}
                onToggle={() => setFogExpanded(!fogExpanded)}
                isDark={isDark}
                toggle={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFogEnabled(!fogEnabled);
                    }}
                    className={`relative w-8 h-4 rounded-full transition-colors ${
                      fogEnabled
                        ? 'bg-amber-500'
                        : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                    }`}
                  >
                    <motion.div
                      animate={{ x: fogEnabled ? 16 : 2 }}
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                }
              >
                {fogEnabled && (
                  <>
                    {/* Fog Colors */}
                    <div className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>
                      Fog Colors
                    </div>
                    <ColorControl
                      label="Fog Color"
                      value={fog.color}
                      onChange={(color) => setFog({ color })}
                      isDark={isDark}
                    />
                    <ColorControl
                      label="High Color"
                      value={fog.highColor}
                      onChange={(highColor) => setFog({ highColor })}
                      isDark={isDark}
                    />

                    {/* Atmosphere Colors */}
                    <div className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-3 mb-2`}>
                      Atmosphere
                    </div>
                    <ColorControl
                      label="Space Color"
                      value={fog.spaceColor}
                      onChange={(spaceColor) => setFog({ spaceColor })}
                      isDark={isDark}
                    />
                    <SliderControl
                      label="Star Intensity"
                      value={fog.starIntensity}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(starIntensity) => setFog({ starIntensity })}
                      isDark={isDark}
                    />

                    {/* Fog Settings */}
                    <div className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-3 mb-2`}>
                      Fog Settings
                    </div>
                    <SliderControl
                      label="Horizon Blend"
                      value={fog.horizonBlend}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(horizonBlend) => setFog({ horizonBlend })}
                      isDark={isDark}
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                          Range Start
                        </label>
                        <input
                          type="number"
                          value={fog.range[0]}
                          onChange={(e) =>
                            setFog({ range: [parseFloat(e.target.value) || 0, fog.range[1]] })
                          }
                          step="0.5"
                          min="-20"
                          max="20"
                          className={`w-full px-2 py-1 text-xs rounded font-mono ${
                            isDark
                              ? 'bg-zinc-800 text-white border-zinc-700'
                              : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                          } border focus:outline-none focus:ring-1 focus:ring-amber-500`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                          Range End
                        </label>
                        <input
                          type="number"
                          value={fog.range[1]}
                          onChange={(e) =>
                            setFog({ range: [fog.range[0], parseFloat(e.target.value) || 0] })
                          }
                          step="1"
                          min="-20"
                          max="20"
                          className={`w-full px-2 py-1 text-xs rounded font-mono ${
                            isDark
                              ? 'bg-zinc-800 text-white border-zinc-700'
                              : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                          } border focus:outline-none focus:ring-1 focus:ring-amber-500`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                          Vert. Start (m)
                        </label>
                        <input
                          type="number"
                          value={fog.verticalRange[0]}
                          onChange={(e) =>
                            setFog({ verticalRange: [parseFloat(e.target.value) || 0, fog.verticalRange[1]] })
                          }
                          step="50"
                          min="0"
                          className={`w-full px-2 py-1 text-xs rounded font-mono ${
                            isDark
                              ? 'bg-zinc-800 text-white border-zinc-700'
                              : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                          } border focus:outline-none focus:ring-1 focus:ring-amber-500`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                          Vert. End (m)
                        </label>
                        <input
                          type="number"
                          value={fog.verticalRange[1]}
                          onChange={(e) =>
                            setFog({ verticalRange: [fog.verticalRange[0], parseFloat(e.target.value) || 0] })
                          }
                          step="100"
                          min="0"
                          className={`w-full px-2 py-1 text-xs rounded font-mono ${
                            isDark
                              ? 'bg-zinc-800 text-white border-zinc-700'
                              : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                          } border focus:outline-none focus:ring-1 focus:ring-amber-500`}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CollapsibleSection>

              {/* Reset Button */}
              <button
                onClick={reset}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300 hover:text-zinc-700'
                }`}
              >
                <FiRefreshCw size={14} />
                Reset to Defaults
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  isDark: boolean;
  children: React.ReactNode;
  toggle?: React.ReactNode;
}

const CollapsibleSection = ({
  title,
  icon,
  expanded,
  onToggle,
  isDark,
  children,
  toggle,
}: CollapsibleSectionProps) => (
  <div className={`rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
    <button
      onClick={onToggle}
      className={`w-full px-3 py-2 flex items-center justify-between ${
        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
      } rounded-lg transition-colors`}
    >
      <div className="flex items-center gap-2">
        <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>{icon}</span>
        <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {toggle}
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
        </motion.div>
      </div>
    </button>
    <motion.div
      initial={false}
      animate={{ height: expanded ? 'auto' : 0 }}
      className="overflow-hidden"
    >
      <div className="px-3 pb-3 space-y-3">{children}</div>
    </motion.div>
  </div>
);

// Slider Control Component
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
      <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</label>
      <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {value.toFixed(step < 1 ? 2 : 0)}
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
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500"
      style={{
        background: isDark
          ? `linear-gradient(to right, #f59e0b ${((value - min) / (max - min)) * 100}%, #3f3f46 ${((value - min) / (max - min)) * 100}%)`
          : `linear-gradient(to right, #f59e0b ${((value - min) / (max - min)) * 100}%, #e4e4e7 ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
  </div>
);

// Color Control Component
interface ColorControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
}

const ColorControl = ({ label, value, onChange, isDark }: ColorControlProps) => (
  <div className="flex items-center justify-between">
    <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-20 px-2 py-0.5 text-xs font-mono rounded ${
          isDark
            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
            : 'bg-white text-zinc-700 border-zinc-300'
        } border focus:outline-none focus:ring-1 focus:ring-amber-500`}
      />
    </div>
  </div>
);
