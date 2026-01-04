import { useState, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCode,
  FiCopy,
  FiDownload,
  FiCheck,
  FiSettings,
  FiFileText,
  FiPackage,
  FiTerminal,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  useMapStore,
  useAnimationStore,
  useLayerStore,
  useAnimatedLineStore,
  useUIStore,
} from '../../stores';
import {
  generateFullExport,
  generateCameraCode,
  generateSequenceCode,
  generateLayerCode,
  generateSourceCode,
  copyToClipboard,
} from '../../utils/codeGenerator';
import type { ExportFormat, ExportOptions } from '../../types';

type CodeTab = 'live' | 'animation' | 'layers' | 'full';

const TABS: { id: CodeTab; label: string; icon: React.ReactNode }[] = [
  { id: 'live', label: 'Live', icon: <FiTerminal size={14} /> },
  { id: 'animation', label: 'Animation', icon: <FiRefreshCw size={14} /> },
  { id: 'layers', label: 'Layers', icon: <FiPackage size={14} /> },
  { id: 'full', label: 'Export', icon: <FiFileText size={14} /> },
];

export const CodePanel = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const camera = useMapStore((s) => s.camera);
  const sequences = useAnimationStore((s) => s.sequences);
  const activeSequenceId = useAnimationStore((s) => s.activeSequenceId);
  const sources = useLayerStore((s) => s.sources);
  const layers = useLayerStore((s) => s.layers);
  const animatedLines = useAnimatedLineStore((s) => s.lines);

  const [activeTab, setActiveTab] = useState<CodeTab>('live');
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'standalone',
    includeMapInit: true,
    includeStyles: true,
    includeAnimations: true,
    includeDrawing: true,
    minify: false,
  });

  // Generate code based on active tab
  const generatedCode = useMemo(() => {
    switch (activeTab) {
      case 'live':
        return generateLiveCode(camera);
      case 'animation':
        const activeSeq = sequences.find((s) => s.id === activeSequenceId);
        return activeSeq
          ? generateSequenceCode(activeSeq)
          : '// Select or create a sequence to see animation code';
      case 'layers':
        return generateLayersCode(sources, layers);
      case 'full':
        return generateFullExport(exportOptions, {
          camera,
          sequences,
          sources,
          layers,
          animatedLines,
        });
      default:
        return '';
    }
  }, [activeTab, camera, sequences, activeSequenceId, sources, layers, animatedLines, exportOptions]);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCode]);

  const handleDownload = useCallback(() => {
    const extension = exportOptions.format === 'standalone' ? 'html' : 'js';
    const filename = `mapbox-animation.${extension}`;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedCode, exportOptions.format]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'full' && (
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-1.5 rounded-md transition-colors ${
                showOptions
                  ? 'bg-violet-600 text-white'
                  : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              <FiSettings size={14} />
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            {copied ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
          </button>
          <button
            onClick={handleDownload}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            <FiDownload size={14} />
          </button>
        </div>
      </div>

      {/* Export Options */}
      <AnimatePresence>
        {showOptions && activeTab === 'full' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-b overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}
          >
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                    Format
                  </label>
                  <select
                    value={exportOptions.format}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, format: e.target.value as ExportFormat })
                    }
                    className={`w-full px-2 py-1.5 text-sm rounded ${
                      isDark
                        ? 'bg-zinc-800 text-white border-zinc-700'
                        : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                    } border`}
                  >
                    <option value="standalone">Standalone HTML</option>
                    <option value="module">ES Module</option>
                    <option value="snippet">Code Snippet</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.minify}
                      onChange={(e) =>
                        setExportOptions({ ...exportOptions, minify: e.target.checked })
                      }
                      className="rounded border-zinc-600"
                    />
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Minify
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'includeMapInit', label: 'Map Init' },
                  { key: 'includeStyles', label: 'Styles' },
                  { key: 'includeAnimations', label: 'Animations' },
                  { key: 'includeDrawing', label: 'Drawing' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions[key as keyof ExportOptions] as boolean}
                      onChange={(e) =>
                        setExportOptions({ ...exportOptions, [key]: e.target.checked })
                      }
                      className="rounded border-zinc-600"
                    />
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={exportOptions.format === 'standalone' ? 'html' : 'javascript'}
          value={generatedCode}
          theme={isDark ? 'vs-dark' : 'light'}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            folding: true,
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>

      {/* Footer Stats */}
      <div className={`px-3 py-2 border-t flex items-center justify-between text-xs ${
        isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
      }`}>
        <span>
          {generatedCode.split('\n').length} lines · {(generatedCode.length / 1024).toFixed(1)} KB
        </span>
        <span>
          {layers.length} layers · {sequences.length} sequences
        </span>
      </div>
    </div>
  );
};

// Generate live camera code
const generateLiveCode = (camera: { center: [number, number]; zoom: number; pitch: number; bearing: number }) => {
  return `// Current Camera State
const cameraState = {
  center: [${camera.center[0].toFixed(6)}, ${camera.center[1].toFixed(6)}],
  zoom: ${camera.zoom.toFixed(2)},
  pitch: ${camera.pitch.toFixed(1)},
  bearing: ${camera.bearing.toFixed(1)}
};

// Apply with flyTo
map.flyTo({
  ...cameraState,
  duration: 2000,
  essential: true
});

// Or easeTo for smoother transition
map.easeTo({
  ...cameraState,
  duration: 1500
});

// Or jumpTo for instant change
map.jumpTo(cameraState);`;
};

// Generate layers code
const generateLayersCode = (
  sources: { id: string; name: string; type: string; data: any }[],
  layers: { id: string; name: string; type: string; sourceId: string; paint: any; layout: any }[]
) => {
  if (sources.length === 0 && layers.length === 0) {
    return '// No layers added yet\n// Import GeoJSON or draw on the map to generate layer code';
  }

  const parts: string[] = ['// Sources'];
  sources.forEach((source) => {
    parts.push(generateSourceCode(source as any));
  });

  parts.push('\n// Layers');
  layers.forEach((layer) => {
    parts.push(generateLayerCode(layer as any));
  });

  return parts.join('\n\n');
};
