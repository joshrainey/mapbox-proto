import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMap, FiChevronDown, FiCheck, FiPlus, FiX, FiTrash2 } from 'react-icons/fi';
import { useUIStore, MAP_STYLES, getAllStyles } from '../../stores';
import type { MapStyleId } from '../../types';

export const MapStyleSelector = () => {
  const { theme, mapStyle, customStyles, setMapStyle, addCustomStyle, removeCustomStyle } = useUIStore();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleUrl, setNewStyleUrl] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allStyles = getAllStyles(customStyles);
  const currentStyle = allStyles.find((s) => s.id === mapStyle);

  const handleSelectStyle = (styleId: MapStyleId) => {
    setMapStyle(styleId);
    setIsOpen(false);
  };

  const handleAddCustomStyle = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStyleName.trim() && newStyleUrl.trim()) {
      addCustomStyle(newStyleName.trim(), newStyleUrl.trim());
      setNewStyleName('');
      setNewStyleUrl('');
      setShowAddForm(false);
      setIsOpen(false);
    }
  };

  const handleRemoveCustomStyle = (e: React.MouseEvent, styleId: MapStyleId) => {
    e.stopPropagation();
    removeCustomStyle(styleId);
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
        <span className="text-sm font-medium max-w-[120px] truncate">
          {currentStyle?.name || 'Style'}
        </span>
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
            className={`absolute top-full left-0 mt-2 w-64 rounded-lg shadow-xl z-50 overflow-hidden ${
              isDark
                ? 'bg-zinc-900 border border-zinc-800'
                : 'bg-white border border-zinc-200'
            }`}
          >
            <div className="max-h-80 overflow-y-auto">
              {/* Built-in styles */}
              <div className={`px-3 py-1.5 text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Built-in Styles
              </div>
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

              {/* Custom styles */}
              {customStyles.length > 0 && (
                <>
                  <div className={`px-3 py-1.5 text-xs font-medium mt-2 border-t ${
                    isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-200'
                  }`}>
                    Custom Styles
                  </div>
                  {customStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleSelectStyle(style.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors group ${
                        mapStyle === style.id
                          ? isDark
                            ? 'bg-violet-600/20 text-violet-400'
                            : 'bg-violet-50 text-violet-700'
                          : isDark
                          ? 'text-zinc-300 hover:bg-zinc-800'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="truncate flex-1 text-left">{style.name}</span>
                      <div className="flex items-center gap-1">
                        {mapStyle === style.id && (
                          <FiCheck size={16} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                        )}
                        <button
                          onClick={(e) => handleRemoveCustomStyle(e, style.id)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400' : 'hover:bg-zinc-200 text-zinc-400 hover:text-red-500'
                          }`}
                          title="Remove style"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Add custom style section */}
            <div className={`border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {showAddForm ? (
                <form onSubmit={handleAddCustomStyle} className="p-3 space-y-2">
                  <input
                    type="text"
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    placeholder="Style name"
                    className={`w-full px-2 py-1.5 text-sm rounded border ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                    } focus:outline-none focus:ring-1 focus:ring-violet-500`}
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newStyleUrl}
                    onChange={(e) => setNewStyleUrl(e.target.value)}
                    placeholder="mapbox://styles/username/style-id"
                    className={`w-full px-2 py-1.5 text-sm rounded border font-mono ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                    } focus:outline-none focus:ring-1 focus:ring-violet-500`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!newStyleName.trim() || !newStyleUrl.trim()}
                      className={`flex-1 py-1.5 text-sm rounded font-medium transition-colors ${
                        newStyleName.trim() && newStyleUrl.trim()
                          ? 'bg-violet-600 text-white hover:bg-violet-500'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      Add Style
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewStyleName('');
                        setNewStyleUrl('');
                      }}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        isDark
                          ? 'text-zinc-400 hover:bg-zinc-800'
                          : 'text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                    isDark
                      ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <FiPlus size={16} />
                  <span>Add Custom Style</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
