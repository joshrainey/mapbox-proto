import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiMapPin,
  FiChevronDown,
  FiCopy,
  FiCheck,
  FiPlus,
} from 'react-icons/fi';
import { useMapStore, useUIStore } from '../../stores';
import { copyToClipboard } from '../../utils/codeGenerator';
import mapboxgl from 'mapbox-gl';

// Marker style presets
const MARKER_PRESETS = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, simple dot',
    html: `<div class="marker-minimal"></div>`,
    css: `.marker-minimal {
  width: 16px;
  height: 16px;
  background: #8b5cf6;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: transform 0.2s;
}
.marker-minimal:hover {
  transform: scale(1.3);
}`,
  },
  {
    id: 'pin-classic',
    name: 'Classic Pin',
    description: 'Traditional map pin with shadow',
    html: `<div class="marker-pin">
  <svg viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#ef4444"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>
</div>`,
    css: `.marker-pin {
  cursor: pointer;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
  transition: transform 0.2s, filter 0.2s;
}
.marker-pin:hover {
  transform: translateY(-4px);
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3));
}`,
  },
  {
    id: 'pulse',
    name: 'Pulsing Dot',
    description: 'Animated pulse effect',
    html: `<div class="marker-pulse">
  <div class="marker-pulse-dot"></div>
  <div class="marker-pulse-ring"></div>
</div>`,
    css: `.marker-pulse {
  position: relative;
  cursor: pointer;
}
.marker-pulse-dot {
  width: 14px;
  height: 14px;
  background: #3b82f6;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  position: relative;
  z-index: 1;
}
.marker-pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: rgba(59, 130, 246, 0.4);
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0% { width: 14px; height: 14px; opacity: 1; }
  100% { width: 50px; height: 50px; opacity: 0; }
}`,
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Numbered or labeled badge',
    html: `<div class="marker-badge">
  <span class="marker-badge-text">1</span>
</div>`,
    css: `.marker-badge {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.marker-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.6);
}
.marker-badge-text {
  color: white;
  font-size: 12px;
  font-weight: 600;
  font-family: system-ui, sans-serif;
}`,
  },
  {
    id: 'glow',
    name: 'Neon Glow',
    description: 'Glowing cyberpunk style',
    html: `<div class="marker-glow"></div>`,
    css: `.marker-glow {
  width: 12px;
  height: 12px;
  background: #22d3ee;
  border-radius: 50%;
  box-shadow: 
    0 0 10px #22d3ee,
    0 0 20px #22d3ee,
    0 0 40px #22d3ee,
    0 0 60px rgba(34, 211, 238, 0.5);
  cursor: pointer;
  transition: transform 0.2s;
  animation: glow-pulse 2s ease-in-out infinite;
}
.marker-glow:hover {
  transform: scale(1.5);
}
@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}`,
  },
  {
    id: 'flag',
    name: 'Flag',
    description: 'Flag on a pole',
    html: `<div class="marker-flag">
  <div class="marker-flag-pole"></div>
  <div class="marker-flag-banner">📍</div>
</div>`,
    css: `.marker-flag {
  position: relative;
  cursor: pointer;
}
.marker-flag-pole {
  width: 2px;
  height: 32px;
  background: linear-gradient(to bottom, #374151 0%, #1f2937 100%);
  border-radius: 1px;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}
.marker-flag-banner {
  position: absolute;
  bottom: 24px;
  left: 2px;
  font-size: 20px;
  animation: flag-wave 1s ease-in-out infinite;
}
@keyframes flag-wave {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}`,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Rotated square with gradient',
    html: `<div class="marker-diamond"></div>`,
    css: `.marker-diamond {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  transform: rotate(45deg);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: transform 0.2s;
}
.marker-diamond:hover {
  transform: rotate(45deg) scale(1.3);
}`,
  },
  {
    id: 'ring',
    name: 'Ring',
    description: 'Hollow circle with thick border',
    html: `<div class="marker-ring"></div>`,
    css: `.marker-ring {
  width: 20px;
  height: 20px;
  background: transparent;
  border: 4px solid #10b981;
  border-radius: 50%;
  box-shadow: 
    0 0 0 3px white,
    0 3px 8px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}
.marker-ring:hover {
  transform: scale(1.2);
  border-color: #059669;
}`,
  },
  {
    id: 'tooltip',
    name: 'Tooltip Pin',
    description: 'Pin with label on hover',
    html: `<div class="marker-tooltip" data-label="Location">
  <div class="marker-tooltip-dot"></div>
</div>`,
    css: `.marker-tooltip {
  position: relative;
  cursor: pointer;
}
.marker-tooltip-dot {
  width: 14px;
  height: 14px;
  background: #ec4899;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.2s;
}
.marker-tooltip::before {
  content: attr(data-label);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  padding: 4px 8px;
  background: #1f2937;
  color: white;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  white-space: nowrap;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}
.marker-tooltip:hover::before {
  opacity: 1;
  transform: translateX(-50%) translateY(-8px);
}
.marker-tooltip:hover .marker-tooltip-dot {
  transform: scale(1.2);
}`,
  },
  {
    id: 'custom-svg',
    name: 'Custom Icon',
    description: 'Any SVG icon',
    html: `<div class="marker-icon">
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#8b5cf6" stroke-width="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
</div>`,
    css: `.marker-icon {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
}
.marker-icon:hover {
  transform: scale(1.15) translateY(-2px);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
}
.marker-icon svg {
  display: block;
}`,
  },
];

export const MarkerGallery = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const map = useMapStore((s) => s.map);

  const [expanded, setExpanded] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = async (preset: typeof MARKER_PRESETS[0]) => {
    const code = `// HTML Marker: ${preset.name}
// Add this CSS to your stylesheet
const style = document.createElement('style');
style.textContent = \`${preset.css}\`;
document.head.appendChild(style);

// Create marker element
const el = document.createElement('div');
el.innerHTML = \`${preset.html}\`;
const markerElement = el.firstElementChild;

// Add to map
const marker = new mapboxgl.Marker({ element: markerElement })
  .setLngLat([YOUR_LNG, YOUR_LAT])
  .addTo(map);
`;
    
    await copyToClipboard(code);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddToMap = (preset: typeof MARKER_PRESETS[0]) => {
    if (!map) return;

    // Inject CSS if not already present
    const styleId = `marker-style-${preset.id}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = preset.css;
      document.head.appendChild(style);
    }

    // Create marker element
    const el = document.createElement('div');
    el.innerHTML = preset.html;
    const markerElement = el.firstElementChild as HTMLElement;

    // Add at map center
    const center = map.getCenter();
    new mapboxgl.Marker({ element: markerElement })
      .setLngLat([center.lng, center.lat])
      .addTo(map);
  };

  const selected = MARKER_PRESETS.find((p) => p.id === selectedPreset);

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
          <FiMapPin className={isDark ? 'text-rose-400' : 'text-rose-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Markers
          </span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <FiChevronDown className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
        </motion.div>
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-3">
          {/* Preview Grid */}
          <div className="grid grid-cols-5 gap-2">
            {MARKER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                  selectedPreset === preset.id
                    ? 'ring-2 ring-rose-500 bg-rose-500/10'
                    : isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700'
                    : 'bg-zinc-100 hover:bg-zinc-200'
                }`}
                title={preset.name}
              >
                <MarkerPreview preset={preset} />
              </button>
            ))}
          </div>

          {/* Selected Preset Details */}
          {selected && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {selected.name}
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {selected.description}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAddToMap(selected)}
                    className={`p-1.5 rounded-md transition-colors ${
                      isDark
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                    title="Add to map center"
                  >
                    <FiPlus size={14} />
                  </button>
                  <button
                    onClick={() => handleCopyCode(selected)}
                    className={`p-1.5 rounded-md transition-colors ${
                      isDark
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                    title="Copy code"
                  >
                    {copiedId === selected.id ? (
                      <FiCheck size={14} className="text-green-500" />
                    ) : (
                      <FiCopy size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* CSS Preview */}
              <pre className={`text-xs font-mono p-2 rounded overflow-x-auto max-h-32 ${
                isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-zinc-700'
              }`}>
                {selected.css}
              </pre>
            </div>
          )}

          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            HTML markers ignore terrain — no floating issues.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Inline preview component
const MarkerPreview = ({ preset }: { preset: typeof MARKER_PRESETS[0] }) => {
  // Simplified inline previews
  switch (preset.id) {
    case 'minimal':
      return (
        <div className="w-4 h-4 bg-violet-500 border-2 border-white rounded-full shadow-md" />
      );
    case 'pin-classic':
      return (
        <svg viewBox="0 0 24 36" width="18" height="27">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#ef4444"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      );
    case 'pulse':
      return (
        <div className="relative">
          <div className="w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
          <div className="absolute inset-0 w-3 h-3 bg-blue-500/40 rounded-full animate-ping" />
        </div>
      );
    case 'badge':
      return (
        <div className="px-1.5 py-0.5 bg-gradient-to-br from-violet-500 to-violet-700 rounded-full text-white text-[8px] font-bold">
          1
        </div>
      );
    case 'glow':
      return (
        <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee,0_0_16px_#22d3ee]" />
      );
    case 'flag':
      return (
        <div className="text-base">📍</div>
      );
    case 'diamond':
      return (
        <div className="w-3 h-3 bg-gradient-to-br from-amber-500 to-amber-600 rotate-45 border border-white shadow-md" />
      );
    case 'ring':
      return (
        <div className="w-4 h-4 border-[3px] border-emerald-500 rounded-full shadow-[0_0_0_2px_white]" />
      );
    case 'tooltip':
      return (
        <div className="w-3 h-3 bg-pink-500 border-2 border-white rounded-full" />
      );
    case 'custom-svg':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8b5cf6" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      );
    default:
      return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
  }
};
