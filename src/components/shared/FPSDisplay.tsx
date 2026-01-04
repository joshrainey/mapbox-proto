import { motion } from 'framer-motion';

interface FPSDisplayProps {
  fps: number;
  theme: 'dark' | 'light';
}

export const FPSDisplay = ({ fps, theme }: FPSDisplayProps) => {
  const isDark = theme === 'dark';
  const color = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-3 py-1.5 rounded-lg font-mono text-xs backdrop-blur ${
        isDark ? 'bg-zinc-900/80' : 'bg-white/80'
      }`}
    >
      <span className={color}>{fps}</span>
      <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}> FPS</span>
    </motion.div>
  );
};
