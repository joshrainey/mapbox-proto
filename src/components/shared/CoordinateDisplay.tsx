import { motion } from 'framer-motion';

interface CoordinateDisplayProps {
  lng: number;
  lat: number;
  theme: 'dark' | 'light';
}

export const CoordinateDisplay = ({ lng, lat, theme }: CoordinateDisplayProps) => {
  const isDark = theme === 'dark';
  
  const formatDMS = (decimal: number, isLat: boolean) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    const direction = isLat
      ? decimal >= 0 ? 'N' : 'S'
      : decimal >= 0 ? 'E' : 'W';
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-3 py-2 rounded-lg font-mono text-xs backdrop-blur ${
        isDark ? 'bg-zinc-900/80 text-zinc-300' : 'bg-white/80 text-zinc-700'
      }`}
    >
      <div className="flex gap-4">
        <div>
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Lng:</span>{' '}
          <span>{lng.toFixed(6)}</span>
        </div>
        <div>
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Lat:</span>{' '}
          <span>{lat.toFixed(6)}</span>
        </div>
      </div>
      <div className={`mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {formatDMS(lng, false)} · {formatDMS(lat, true)}
      </div>
    </motion.div>
  );
};
