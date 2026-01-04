import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMap, FiChevronDown, FiCheck } from 'react-icons/fi';
import { useUIStore, MAP_STYLES } from '../../stores';
import type { MapStyleId } from '../../types';

export const MapStyleSelector = () => {
  const { theme, mapStyle, setMapStyle } = useUIStore();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStyle = MAP_STYLES.find((s) => s.id === mapStyle);

  const handleSelectStyle = (styleId: MapStyleId) => {
    setMapStyle(styleId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          isOpen
            ? isDark
              ? 'bg-violet-600 text-white'
              : 'bg-violet-100 text-violet-700'
            : isDark
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
        }`}
        title="Map Style"
      >
        <FiMap size={16} />
        <span className="text-sm font-medium">{currentStyle?.name || 'Style'}</span>
        <FiChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 mt-2 w-52 rounded-lg shadow-xl z-50 overflow-hidden ${
              isDark
                ? 'bg-zinc-900 border border-zinc-800'
                : 'bg-white border border-zinc-200'
            }`}
          >
            <div className="py-1">
              {MAP_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleSelectStyle(style.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                    mapStyle === style.id
                      ? isDark
                        ? 'bg-violet-600/20 text-violet-400'
                        : 'bg-violet-50 text-violet-700'
                      : isDark
                      ? 'text-zinc-300 hover:bg-zinc-800'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>{style.name}</span>
                  {mapStyle === style.id && (
                    <FiCheck size={16} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
