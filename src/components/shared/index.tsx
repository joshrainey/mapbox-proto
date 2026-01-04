import { motion } from 'framer-motion';

// Coordinate Display
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

// FPS Display
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

// Slider with value display
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  isDark?: boolean;
  className?: string;
}

export const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
  isDark = true,
  className = '',
}: SliderProps) => (
  <div className={className}>
    <div className="flex justify-between mb-1">
      <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {label}
      </label>
      <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {typeof value === 'number' ? value.toFixed(step < 1 ? Math.abs(Math.log10(step)) : 0) : value}
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
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500"
      style={{
        background: isDark
          ? `linear-gradient(to right, #8b5cf6 ${((value - min) / (max - min)) * 100}%, #3f3f46 ${((value - min) / (max - min)) * 100}%)`
          : `linear-gradient(to right, #8b5cf6 ${((value - min) / (max - min)) * 100}%, #e4e4e7 ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
  </div>
);

// Color Picker
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  isDark?: boolean;
  showAlpha?: boolean;
}

export const ColorPicker = ({
  label,
  value,
  onChange,
  isDark = true,
  showAlpha = false,
}: ColorPickerProps) => (
  <div className="flex items-center gap-2">
    <label className={`text-xs flex-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
      {label}
    </label>
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 rounded cursor-pointer border-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-20 px-1.5 py-0.5 text-xs font-mono rounded ${
          isDark
            ? 'bg-zinc-700 text-white border-zinc-600'
            : 'bg-white text-zinc-900 border-zinc-300'
        } border`}
      />
    </div>
  </div>
);

// Toggle Switch
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isDark?: boolean;
}

export const Toggle = ({ label, checked, onChange, isDark = true }: ToggleProps) => (
  <label className="flex items-center justify-between cursor-pointer">
    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{label}</span>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-violet-600' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </label>
);

// Tooltip
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = ({ content, children, position = 'top' }: TooltipProps) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute ${positionClasses[position]} px-2 py-1 text-xs bg-zinc-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50`}
      >
        {content}
      </div>
    </div>
  );
};

// Button Group
interface ButtonGroupProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  isDark?: boolean;
}

export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  isDark = true,
}: ButtonGroupProps<T>) {
  return (
    <div className="flex gap-0.5">
      {options.map((option, i) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
            i === 0 ? 'rounded-l-lg' : ''
          } ${i === options.length - 1 ? 'rounded-r-lg' : ''} ${
            value === option.value
              ? 'bg-violet-600 text-white'
              : isDark
              ? 'bg-zinc-800 text-zinc-400 hover:text-white'
              : 'bg-zinc-200 text-zinc-500 hover:text-zinc-900'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Dropdown Menu
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export const Dropdown = ({ trigger, children, align = 'left' }: DropdownProps) => {
  return (
    <div className="relative group">
      {trigger}
      <div
        className={`absolute top-full ${
          align === 'left' ? 'left-0' : 'right-0'
        } mt-1 min-w-[160px] py-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}
      >
        {children}
      </div>
    </div>
  );
};

export const DropdownItem = ({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
      danger
        ? 'text-red-400 hover:bg-red-500/20'
        : 'text-zinc-300 hover:bg-zinc-800'
    }`}
  >
    {children}
  </button>
);

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="font-medium text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </motion.div>
  );
};

// Kbd (keyboard shortcut display)
export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-400">
    {children}
  </kbd>
);
