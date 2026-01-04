import { useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCamera,
  FiLayers,
  FiPlay,
  FiEdit3,
  FiCode,
  FiInfo,
  FiSun,
  FiMoon,
  FiGrid,
  FiCrosshair,
  FiActivity,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
  FiMapPin,
  FiTrendingUp,
} from 'react-icons/fi';

import { MapContainer } from './components/map/MapContainer';
import { CameraPanel } from './components/panels/CameraPanel';
import { TimelinePanel } from './components/panels/TimelinePanel';
import { LayersPanel } from './components/panels/LayersPanel';
import { DrawingPanel } from './components/panels/DrawingPanel';
import { CodePanel } from './components/panels/CodePanel';
import { PhysicsPanel } from './components/panels/PhysicsPanel';
import { MarkerGallery } from './components/panels/MarkerGallery';
import { LineAnimator } from './components/panels/LineAnimator';
import { CoordinateDisplay } from './components/shared/CoordinateDisplay';
import { FPSDisplay } from './components/shared/FPSDisplay';
import { MapStyleSelector } from './components/shared/MapStyleSelector';

import { useUIStore, useMapStore } from './stores';
import { useKeyboardShortcuts, useMousePosition, useFPS } from './hooks/useMap';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem('mapbox-token') || ''
  );
  const [showTokenInput, setShowTokenInput] = useState(!accessToken);

  // UI State
  const { panels, theme, showCoordinates, showFPS, togglePanel, setTheme, toggleFPS, toggleCoordinates } = useUIStore();
  const camera = useMapStore((s) => s.camera);
  const mousePosition = useMousePosition();
  const fps = useFPS();

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Panel icons config
  const panelConfig = [
    { key: 'camera', icon: FiCamera, label: 'Camera' },
    { key: 'physics', icon: FiZap, label: 'Physics' },
    { key: 'timeline', icon: FiPlay, label: 'Timeline' },
    { key: 'layers', icon: FiLayers, label: 'Layers' },
    { key: 'markers', icon: FiMapPin, label: 'Markers' },
    { key: 'lines', icon: FiTrendingUp, label: 'Lines' },
    { key: 'drawing', icon: FiEdit3, label: 'Drawing' },
    { key: 'code', icon: FiCode, label: 'Code' },
  ] as const;

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken.trim()) {
      localStorage.setItem('mapbox-token', accessToken.trim());
      setShowTokenInput(false);
    }
  };

  if (showTokenInput) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Mapbox Proto
            </h1>
            <p className="text-zinc-400 text-sm">
              Enter your Mapbox access token to get started. You can get one from{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <form onSubmit={handleTokenSubmit}>
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="pk.eyJ1Ijo..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
            />
            <button
              type="submit"
              className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Continue
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      {/* Top Toolbar */}
      <div className={`h-12 border-b flex items-center justify-between px-4 ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        {/* Left: Logo, map style, and panel toggles */}
        <div className="flex items-center gap-4">
          <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            Proto
          </span>
          <div className={`h-6 w-px ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
          <MapStyleSelector />
          <div className={`h-6 w-px ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
          <div className="flex items-center gap-1">
            {panelConfig.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => togglePanel(key)}
                className={`p-2 rounded-lg transition-colors ${
                  panels[key]
                    ? theme === 'dark'
                      ? 'bg-violet-600 text-white'
                      : 'bg-violet-100 text-violet-700'
                    : theme === 'dark'
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                }`}
                title={`${label} (Ctrl+${panelConfig.findIndex(p => p.key === key) + 1})`}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: View options */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCoordinates}
            className={`p-2 rounded-lg transition-colors ${
              showCoordinates
                ? theme === 'dark'
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : theme === 'dark'
                ? 'text-zinc-500 hover:text-white'
                : 'text-zinc-400 hover:text-zinc-900'
            }`}
            title="Toggle coordinates"
          >
            <FiCrosshair size={18} />
          </button>
          <button
            onClick={toggleFPS}
            className={`p-2 rounded-lg transition-colors ${
              showFPS
                ? theme === 'dark'
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : theme === 'dark'
                ? 'text-zinc-500 hover:text-white'
                : 'text-zinc-400 hover:text-zinc-900'
            }`}
            title="Toggle FPS"
          >
            <FiActivity size={18} />
          </button>
          <div className="h-6 w-px bg-zinc-700 mx-1" />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Toggle theme"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-48px)] flex">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Panels */}
          <AnimatePresence>
            {(panels.camera || panels.physics || panels.layers || panels.markers || panels.lines || panels.drawing) && (
              <>
                <Panel
                  defaultSize={20}
                  minSize={15}
                  maxSize={40}
                  className={`${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}
                >
                  <div className="h-full overflow-y-auto">
                    {panels.camera && <CameraPanel />}
                    {panels.physics && <PhysicsPanel />}
                    {panels.layers && <LayersPanel />}
                    {panels.markers && <MarkerGallery />}
                    {panels.lines && <LineAnimator />}
                    {panels.drawing && <DrawingPanel />}
                  </div>
                </Panel>
                <PanelResizeHandle className={`w-1 ${theme === 'dark' ? 'bg-zinc-800 hover:bg-violet-600' : 'bg-zinc-200 hover:bg-violet-400'} transition-colors`} />
              </>
            )}
          </AnimatePresence>

          {/* Map */}
          <Panel defaultSize={60} minSize={30}>
            <div className="relative h-full">
              <MapContainer ref={containerRef} accessToken={accessToken} />
              
              {/* Overlays */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-2">
                {showCoordinates && mousePosition && (
                  <CoordinateDisplay 
                    lng={mousePosition.lng} 
                    lat={mousePosition.lat} 
                    theme={theme}
                  />
                )}
                {showFPS && <FPSDisplay fps={fps} theme={theme} />}
              </div>

              {/* Camera info */}
              <div className={`absolute top-4 left-4 px-3 py-2 rounded-lg text-xs font-mono ${
                theme === 'dark' ? 'bg-zinc-900/80 text-zinc-300' : 'bg-white/80 text-zinc-700'
              } backdrop-blur`}>
                <div>Zoom: {camera.zoom.toFixed(2)}</div>
                <div>Pitch: {camera.pitch.toFixed(1)}°</div>
                <div>Bearing: {camera.bearing.toFixed(1)}°</div>
              </div>
            </div>
          </Panel>

          {/* Right Panel - Code */}
          <AnimatePresence>
            {panels.code && (
              <>
                <PanelResizeHandle className={`w-1 ${theme === 'dark' ? 'bg-zinc-800 hover:bg-violet-600' : 'bg-zinc-200 hover:bg-violet-400'} transition-colors`} />
                <Panel
                  defaultSize={25}
                  minSize={15}
                  maxSize={50}
                  className={`${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}
                >
                  <CodePanel />
                </Panel>
              </>
            )}
          </AnimatePresence>
        </PanelGroup>
      </div>

      {/* Bottom Timeline */}
      <AnimatePresence>
        {panels.timeline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-t ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
          >
            <TimelinePanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
