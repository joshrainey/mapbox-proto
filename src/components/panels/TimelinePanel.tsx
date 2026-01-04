import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlay,
  FiPause,
  FiSquare,
  FiPlus,
  FiTrash2,
  FiRepeat,
  FiChevronLeft,
  FiChevronRight,
  FiMoreHorizontal,
} from 'react-icons/fi';
import { useAnimationStore, useMapStore, captureKeyframe, useUIStore } from '../../stores';
import type { Keyframe } from '../../types';

export const TimelinePanel = () => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const {
    sequences,
    activeSequenceId,
    playback,
    createSequence,
    deleteSequence,
    setActiveSequence,
    addKeyframe,
    updateKeyframe,
    deleteKeyframe,
    reorderKeyframes,
    play,
    pause,
    stop,
    seekTo,
    setLoop,
  } = useAnimationStore();

  const jumpTo = useMapStore((s) => s.jumpTo);

  const [newSequenceName, setNewSequenceName] = useState('');
  const [editingKeyframeId, setEditingKeyframeId] = useState<string | null>(null);

  const activeSequence = sequences.find((s) => s.id === activeSequenceId);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate keyframe positions on timeline
  const getKeyframePositions = () => {
    if (!activeSequence) return [];
    
    const total = playback.totalDuration;
    if (total === 0) return activeSequence.keyframes.map((kf) => ({ start: 0, end: 0, kf }));

    let accumulated = 0;
    return activeSequence.keyframes.map((kf) => {
      const start = accumulated / total;
      accumulated += kf.delay + kf.duration;
      const end = accumulated / total;
      return { start, end, kf };
    });
  };

  const keyframePositions = getKeyframePositions();

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !activeSequence) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const time = progress * playback.totalDuration;
    
    seekTo(Math.max(0, Math.min(time, playback.totalDuration)));
  };

  // Handle keyframe click
  const handleKeyframeClick = (kf: Keyframe, e: React.MouseEvent) => {
    e.stopPropagation();
    jumpTo(kf.camera);
    setEditingKeyframeId(kf.id);
  };

  // Create new sequence
  const handleCreateSequence = () => {
    const name = newSequenceName.trim() || `Sequence ${sequences.length + 1}`;
    createSequence(name);
    setNewSequenceName('');
  };

  // Capture current view as keyframe
  const handleCaptureKeyframe = () => {
    if (!activeSequenceId) return;
    const kf = captureKeyframe(`Keyframe ${(activeSequence?.keyframes.length ?? 0) + 1}`);
    addKeyframe(activeSequenceId, kf);
  };

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className={`h-10 flex items-center justify-between px-4 border-b ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-3">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => (playback.isPlaying ? pause() : play())}
              disabled={!activeSequence || activeSequence.keyframes.length === 0}
              className={`p-1.5 rounded-md transition-colors ${
                !activeSequence || activeSequence.keyframes.length === 0
                  ? 'text-zinc-600 cursor-not-allowed'
                  : isDark
                  ? 'text-white hover:bg-zinc-800'
                  : 'text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              {playback.isPlaying ? <FiPause size={18} /> : <FiPlay size={18} />}
            </button>
            <button
              onClick={stop}
              disabled={!activeSequence}
              className={`p-1.5 rounded-md transition-colors ${
                !activeSequence
                  ? 'text-zinc-600 cursor-not-allowed'
                  : isDark
                  ? 'text-white hover:bg-zinc-800'
                  : 'text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              <FiSquare size={16} />
            </button>
          </div>

          {/* Time Display */}
          <span className={`font-mono text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {formatTime(playback.currentTime)} / {formatTime(playback.totalDuration)}
          </span>

          {/* Loop Toggle */}
          {activeSequence && (
            <button
              onClick={() => setLoop(activeSequence.id, !activeSequence.loop)}
              className={`p-1.5 rounded-md transition-colors ${
                activeSequence.loop
                  ? 'text-violet-400 bg-violet-500/20'
                  : isDark
                  ? 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
              title="Toggle loop"
            >
              <FiRepeat size={16} />
            </button>
          )}
        </div>

        {/* Sequence Selector */}
        <div className="flex items-center gap-2">
          <select
            value={activeSequenceId ?? ''}
            onChange={(e) => setActiveSequence(e.target.value || null)}
            className={`px-2 py-1 text-sm rounded-md ${
              isDark
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'bg-zinc-100 text-zinc-900 border-zinc-300'
            } border focus:outline-none focus:ring-1 focus:ring-violet-500`}
          >
            <option value="">Select sequence...</option>
            {sequences.map((seq) => (
              <option key={seq.id} value={seq.id}>
                {seq.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateSequence}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="New sequence"
          >
            <FiPlus size={18} />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex">
        {/* Keyframe List (Left) */}
        <div className={`w-48 border-r ${isDark ? 'border-zinc-800' : 'border-zinc-200'} overflow-y-auto`}>
          {activeSequence?.keyframes.map((kf, index) => (
            <div
              key={kf.id}
              onClick={() => {
                jumpTo(kf.camera);
                setEditingKeyframeId(kf.id);
              }}
              className={`px-3 py-2 cursor-pointer border-b transition-colors ${
                editingKeyframeId === kf.id
                  ? isDark
                    ? 'bg-violet-600/20 border-violet-600'
                    : 'bg-violet-100 border-violet-300'
                  : isDark
                  ? 'border-zinc-800 hover:bg-zinc-800'
                  : 'border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium truncate ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  {kf.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteKeyframe(activeSequence.id, kf.id);
                  }}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                  }`}
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {kf.animationType} · {kf.duration}ms
              </div>
            </div>
          ))}

          {/* Add Keyframe Button */}
          {activeSequence && (
            <button
              onClick={handleCaptureKeyframe}
              className={`w-full px-3 py-3 flex items-center justify-center gap-2 text-sm transition-colors ${
                isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <FiPlus size={14} />
              Capture Keyframe
            </button>
          )}
        </div>

        {/* Timeline Track (Right) */}
        <div className="flex-1 p-4">
          {activeSequence ? (
            <div
              ref={timelineRef}
              onClick={handleTimelineClick}
              className={`relative h-16 rounded-lg cursor-pointer ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              }`}
            >
              {/* Progress indicator */}
              {playback.totalDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 left-0 bg-violet-600/30 rounded-l-lg"
                  style={{
                    width: `${(playback.currentTime / playback.totalDuration) * 100}%`,
                  }}
                />
              )}

              {/* Keyframe markers */}
              {keyframePositions.map(({ start, end, kf }, index) => (
                <div
                  key={kf.id}
                  onClick={(e) => handleKeyframeClick(kf, e)}
                  className={`absolute top-2 bottom-2 rounded cursor-pointer transition-all ${
                    editingKeyframeId === kf.id
                      ? 'bg-violet-500 ring-2 ring-violet-300'
                      : isDark
                      ? 'bg-zinc-600 hover:bg-zinc-500'
                      : 'bg-zinc-400 hover:bg-zinc-500'
                  }`}
                  style={{
                    left: `${start * 100}%`,
                    width: `${Math.max((end - start) * 100, 2)}%`,
                  }}
                  title={`${kf.name} (${kf.duration}ms)`}
                >
                  <div className={`absolute -top-5 left-0 text-xs whitespace-nowrap ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>
                    {index + 1}
                  </div>
                </div>
              ))}

              {/* Playhead */}
              {playback.totalDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                  style={{
                    left: `${(playback.currentTime / playback.totalDuration) * 100}%`,
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center ${
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            }`}>
              Select or create a sequence to get started
            </div>
          )}

          {/* Keyframe Editor */}
          {editingKeyframeId && activeSequence && (
            <KeyframeEditor
              keyframe={activeSequence.keyframes.find((k) => k.id === editingKeyframeId)!}
              onUpdate={(updates) =>
                updateKeyframe(activeSequence.id, editingKeyframeId, updates)
              }
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Keyframe Editor Component
const KeyframeEditor = ({
  keyframe,
  onUpdate,
  isDark,
}: {
  keyframe: Keyframe;
  onUpdate: (updates: Partial<Keyframe>) => void;
  isDark: boolean;
}) => {
  if (!keyframe) return null;

  return (
    <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
            Name
          </label>
          <input
            type="text"
            value={keyframe.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className={`w-full px-2 py-1 text-sm rounded ${
              isDark
                ? 'bg-zinc-700 text-white border-zinc-600'
                : 'bg-white text-zinc-900 border-zinc-300'
            } border`}
          />
        </div>
        <div>
          <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
            Type
          </label>
          <select
            value={keyframe.animationType}
            onChange={(e) => onUpdate({ animationType: e.target.value as any })}
            className={`w-full px-2 py-1 text-sm rounded ${
              isDark
                ? 'bg-zinc-700 text-white border-zinc-600'
                : 'bg-white text-zinc-900 border-zinc-300'
            } border`}
          >
            <option value="flyTo">flyTo</option>
            <option value="easeTo">easeTo</option>
            <option value="jumpTo">jumpTo</option>
          </select>
        </div>
        <div>
          <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
            Duration (ms)
          </label>
          <input
            type="number"
            value={keyframe.duration}
            onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 0 })}
            className={`w-full px-2 py-1 text-sm rounded ${
              isDark
                ? 'bg-zinc-700 text-white border-zinc-600'
                : 'bg-white text-zinc-900 border-zinc-300'
            } border`}
          />
        </div>
        <div>
          <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
            Delay (ms)
          </label>
          <input
            type="number"
            value={keyframe.delay}
            onChange={(e) => onUpdate({ delay: parseInt(e.target.value) || 0 })}
            className={`w-full px-2 py-1 text-sm rounded ${
              isDark
                ? 'bg-zinc-700 text-white border-zinc-600'
                : 'bg-white text-zinc-900 border-zinc-300'
            } border`}
          />
        </div>
      </div>
    </div>
  );
};
