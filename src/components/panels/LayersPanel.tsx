import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiLayers,
  FiChevronDown,
  FiPlus,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiUpload,
  FiMove,
} from 'react-icons/fi';
import { useLayerStore, useUIStore, addGeoJSONLayer, DEFAULT_PAINT } from '../../stores';
import type { LayerType, ProtoLayer } from '../../types';

export const LayersPanel = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const {
    sources,
    layers,
    selectedLayerId,
    addSource,
    addLayer,
    updateLayer,
    removeLayer,
    toggleLayerVisibility,
    setSelectedLayer,
    reorderLayers,
  } = useLayerStore();

  const [expanded, setExpanded] = useState(true);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [geojsonInput, setGeojsonInput] = useState('');
  const [newLayerType, setNewLayerType] = useState<LayerType>('line');

  // Handle GeoJSON paste/import
  const handleImportGeoJSON = () => {
    try {
      const geojson = JSON.parse(geojsonInput);
      addGeoJSONLayer(geojson, newLayerType, `${newLayerType} layer`);
      setGeojsonInput('');
      setShowAddLayer(false);
    } catch (e) {
      console.error('Invalid GeoJSON:', e);
      alert('Invalid GeoJSON format');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        addGeoJSONLayer(geojson, newLayerType, file.name.replace('.geojson', ''));
      } catch (err) {
        console.error('Error parsing file:', err);
        alert('Invalid GeoJSON file');
      }
    };
    reader.readAsText(file);
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

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
          <FiLayers className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Layers
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
          }`}>
            {layers.length}
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
        <div className="px-4 pb-4">
          {/* Layer List */}
          <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            {layers.length === 0 ? (
              <div className={`px-3 py-4 text-center text-sm ${
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                No layers yet. Add GeoJSON below.
              </div>
            ) : (
              layers.map((layer, index) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayer(layer.id)}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                    selectedLayerId === layer.id
                      ? isDark
                        ? 'bg-violet-600/20'
                        : 'bg-violet-100'
                      : isDark
                      ? 'hover:bg-zinc-700'
                      : 'hover:bg-zinc-200'
                  } ${index > 0 ? (isDark ? 'border-t border-zinc-700' : 'border-t border-zinc-200') : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {/* Layer type indicator */}
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor:
                          layer.paint['fill-color'] ||
                          layer.paint['line-color'] ||
                          layer.paint['circle-color'] ||
                          '#888',
                      }}
                    />
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {layer.name}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {layer.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layer.id);
                      }}
                      className={`p-1 rounded ${isDark ? 'hover:bg-zinc-600' : 'hover:bg-zinc-300'}`}
                    >
                      {layer.visible ? (
                        <FiEye size={14} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
                      ) : (
                        <FiEyeOff size={14} className={isDark ? 'text-zinc-600' : 'text-zinc-300'} />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      className={`p-1 rounded ${isDark ? 'hover:bg-zinc-600' : 'hover:bg-zinc-300'}`}
                    >
                      <FiTrash2 size={14} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Layer Editor */}
          {selectedLayer && (
            <LayerEditor layer={selectedLayer} onUpdate={updateLayer} isDark={isDark} />
          )}

          {/* Add Layer Section */}
          <div className="mt-4">
            {!showAddLayer ? (
              <button
                onClick={() => setShowAddLayer(true)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                }`}
              >
                <FiPlus size={14} />
                Add Layer
              </button>
            ) : (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <select
                    value={newLayerType}
                    onChange={(e) => setNewLayerType(e.target.value as LayerType)}
                    className={`flex-1 px-2 py-1.5 text-sm rounded ${
                      isDark
                        ? 'bg-zinc-700 text-white border-zinc-600'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    } border`}
                  >
                    <option value="line">Line</option>
                    <option value="fill">Fill</option>
                    <option value="circle">Circle</option>
                    <option value="symbol">Symbol</option>
                    <option value="fill-extrusion">3D Extrusion</option>
                  </select>
                  <label className={`p-1.5 rounded cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-white hover:bg-zinc-200'
                  }`}>
                    <FiUpload size={16} className={isDark ? 'text-zinc-300' : 'text-zinc-600'} />
                    <input
                      type="file"
                      accept=".geojson,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={geojsonInput}
                  onChange={(e) => setGeojsonInput(e.target.value)}
                  placeholder="Paste GeoJSON here..."
                  className={`w-full h-24 px-2 py-1.5 text-xs font-mono rounded resize-none ${
                    isDark
                      ? 'bg-zinc-700 text-white border-zinc-600 placeholder-zinc-500'
                      : 'bg-white text-zinc-900 border-zinc-300 placeholder-zinc-400'
                  } border`}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleImportGeoJSON}
                    disabled={!geojsonInput.trim()}
                    className={`flex-1 py-1.5 text-sm rounded transition-colors ${
                      geojsonInput.trim()
                        ? 'bg-violet-600 text-white hover:bg-violet-500'
                        : isDark
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-300 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    Import
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLayer(false);
                      setGeojsonInput('');
                    }}
                    className={`px-3 py-1.5 text-sm rounded ${
                      isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Layer Editor Component
const LayerEditor = ({
  layer,
  onUpdate,
  isDark,
}: {
  layer: ProtoLayer;
  onUpdate: (id: string, updates: Partial<ProtoLayer>) => void;
  isDark: boolean;
}) => {
  const paintProps = Object.entries(layer.paint);

  return (
    <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
      <h4 className={`text-xs font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        Paint Properties
      </h4>
      <div className="space-y-2">
        {paintProps.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <label className={`text-xs flex-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {key}
            </label>
            {typeof value === 'string' && value.startsWith('#') ? (
              <input
                type="color"
                value={value}
                onChange={(e) =>
                  onUpdate(layer.id, {
                    paint: { ...layer.paint, [key]: e.target.value },
                  })
                }
                className="w-8 h-6 rounded cursor-pointer"
              />
            ) : typeof value === 'number' ? (
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  onUpdate(layer.id, {
                    paint: { ...layer.paint, [key]: parseFloat(e.target.value) || 0 },
                  })
                }
                step={key.includes('opacity') ? 0.1 : 1}
                min={0}
                max={key.includes('opacity') ? 1 : undefined}
                className={`w-20 px-2 py-0.5 text-xs rounded ${
                  isDark
                    ? 'bg-zinc-700 text-white border-zinc-600'
                    : 'bg-white text-zinc-900 border-zinc-300'
                } border`}
              />
            ) : (
              <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {JSON.stringify(value)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
