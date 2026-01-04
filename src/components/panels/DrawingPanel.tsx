import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiEdit3,
  FiChevronDown,
  FiMousePointer,
  FiCircle,
  FiSquare,
  FiMinus,
  FiMapPin,
  FiTrash2,
  FiDownload,
  FiCopy,
} from 'react-icons/fi';
import { useDrawingStore, useUIStore } from '../../stores';
import type { DrawMode } from '../../types';
import { copyToClipboard } from '../../utils/codeGenerator';

const DRAW_MODES: { mode: DrawMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'simple_select', icon: <FiMousePointer size={16} />, label: 'Select' },
  { mode: 'draw_point', icon: <FiMapPin size={16} />, label: 'Point' },
  { mode: 'draw_line_string', icon: <FiMinus size={16} />, label: 'Line' },
  { mode: 'draw_polygon', icon: <FiSquare size={16} />, label: 'Polygon' },
];

export const DrawingPanel = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const {
    mode,
    features,
    selectedIds,
    showMeasurements,
    setMode,
    deleteFeatures,
    clearAll,
    exportGeoJSON,
  } = useDrawingStore();

  const [expanded, setExpanded] = useState(true);
  const [showExport, setShowExport] = useState(false);

  const handleExport = () => {
    const geojson = exportGeoJSON();
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyGeoJSON = async () => {
    const geojson = exportGeoJSON();
    await copyToClipboard(JSON.stringify(geojson, null, 2));
    // Could add a toast notification here
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
          <FiEdit3 className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Drawing
          </span>
          {features.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
            }`}>
              {features.length}
            </span>
          )}
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
          {/* Draw Mode Buttons */}
          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
              Draw Mode
            </label>
            <div className="flex gap-1">
              {DRAW_MODES.map(({ mode: m, icon, label }) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                    mode === m
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      : 'bg-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-300'
                  }`}
                  title={label}
                >
                  {icon}
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Features List */}
          {features.length > 0 && (
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2 block`}>
                Features ({features.length})
              </label>
              <div className={`rounded-lg overflow-hidden max-h-40 overflow-y-auto ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-100'
              }`}>
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className={`px-3 py-2 flex items-center justify-between ${
                      selectedIds.includes(feature.id)
                        ? isDark
                          ? 'bg-emerald-600/20'
                          : 'bg-emerald-100'
                        : ''
                    } ${isDark ? 'border-b border-zinc-700 last:border-0' : 'border-b border-zinc-200 last:border-0'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        {feature.geometry.type}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {feature.id.slice(0, 8)}...
                      </span>
                    </div>
                    <button
                      onClick={() => deleteFeatures([feature.id])}
                      className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
                    >
                      <FiTrash2 size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyGeoJSON}
              disabled={features.length === 0}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
                features.length > 0
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  : isDark
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <FiCopy size={14} />
              Copy
            </button>
            <button
              onClick={handleExport}
              disabled={features.length === 0}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
                features.length > 0
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  : isDark
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <FiDownload size={14} />
              Export
            </button>
            <button
              onClick={clearAll}
              disabled={features.length === 0}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                features.length > 0
                  ? isDark
                    ? 'text-red-400 hover:bg-red-500/20'
                    : 'text-red-600 hover:bg-red-100'
                  : isDark
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-400 cursor-not-allowed'
              }`}
            >
              <FiTrash2 size={14} />
            </button>
          </div>

          {/* Tip */}
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Click on the map to draw. Double-click to finish lines and polygons.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
