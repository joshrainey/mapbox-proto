import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { AnimationStore, AnimationSequence, Keyframe, PlaybackState } from '../types';
import { useMapStore, getEasing } from './mapStore';

const DEFAULT_PLAYBACK: PlaybackState = {
  isPlaying: false,
  currentKeyframeIndex: 0,
  currentTime: 0,
  totalDuration: 0,
};

// Animation loop management
let animationFrameId: number | null = null;
let sequenceTimeoutId: ReturnType<typeof setTimeout> | null = null;

const calculateTotalDuration = (keyframes: Keyframe[]): number => {
  return keyframes.reduce((total, kf) => total + kf.delay + kf.duration, 0);
};

export const useAnimationStore = create<AnimationStore>()(
  immer((set, get) => ({
    sequences: [],
    activeSequenceId: null,
    playback: DEFAULT_PLAYBACK,

    // ========================
    // Sequence CRUD
    // ========================
    
    createSequence: (name: string) => {
      const id = nanoid();
      set((state) => {
        state.sequences.push({
          id,
          name,
          keyframes: [],
          loop: false,
          loopDelay: 1000,
        });
        state.activeSequenceId = id;
      });
      return id;
    },

    deleteSequence: (id: string) => {
      set((state) => {
        const index = state.sequences.findIndex((s) => s.id === id);
        if (index !== -1) {
          state.sequences.splice(index, 1);
          if (state.activeSequenceId === id) {
            state.activeSequenceId = state.sequences[0]?.id ?? null;
          }
        }
      });
    },

    setActiveSequence: (id: string | null) => {
      set((state) => {
        state.activeSequenceId = id;
        state.playback = { ...DEFAULT_PLAYBACK };
        if (id) {
          const seq = state.sequences.find((s) => s.id === id);
          if (seq) {
            state.playback.totalDuration = calculateTotalDuration(seq.keyframes);
          }
        }
      });
    },

    // ========================
    // Keyframe CRUD
    // ========================

    addKeyframe: (sequenceId: string, keyframe: Omit<Keyframe, 'id'>) => {
      const id = nanoid();
      set((state) => {
        const seq = state.sequences.find((s) => s.id === sequenceId);
        if (seq) {
          seq.keyframes.push({ ...keyframe, id });
          state.playback.totalDuration = calculateTotalDuration(seq.keyframes);
        }
      });
      return id;
    },

    updateKeyframe: (sequenceId: string, keyframeId: string, updates: Partial<Keyframe>) => {
      set((state) => {
        const seq = state.sequences.find((s) => s.id === sequenceId);
        if (seq) {
          const kf = seq.keyframes.find((k) => k.id === keyframeId);
          if (kf) {
            Object.assign(kf, updates);
            state.playback.totalDuration = calculateTotalDuration(seq.keyframes);
          }
        }
      });
    },

    deleteKeyframe: (sequenceId: string, keyframeId: string) => {
      set((state) => {
        const seq = state.sequences.find((s) => s.id === sequenceId);
        if (seq) {
          const index = seq.keyframes.findIndex((k) => k.id === keyframeId);
          if (index !== -1) {
            seq.keyframes.splice(index, 1);
            state.playback.totalDuration = calculateTotalDuration(seq.keyframes);
          }
        }
      });
    },

    reorderKeyframes: (sequenceId: string, fromIndex: number, toIndex: number) => {
      set((state) => {
        const seq = state.sequences.find((s) => s.id === sequenceId);
        if (seq && fromIndex >= 0 && toIndex >= 0 && fromIndex < seq.keyframes.length) {
          const [removed] = seq.keyframes.splice(fromIndex, 1);
          seq.keyframes.splice(toIndex, 0, removed);
        }
      });
    },

    // ========================
    // Playback Controls
    // ========================

    play: () => {
      const state = get();
      const seq = state.sequences.find((s) => s.id === state.activeSequenceId);
      if (!seq || seq.keyframes.length === 0) return;

      set((s) => {
        s.playback.isPlaying = true;
      });

      const playKeyframe = (index: number) => {
        const currentState = get();
        if (!currentState.playback.isPlaying) return;

        const sequence = currentState.sequences.find((s) => s.id === currentState.activeSequenceId);
        if (!sequence) return;

        if (index >= sequence.keyframes.length) {
          // End of sequence
          if (sequence.loop) {
            sequenceTimeoutId = setTimeout(() => {
              set((s) => {
                s.playback.currentKeyframeIndex = 0;
                s.playback.currentTime = 0;
              });
              playKeyframe(0);
            }, sequence.loopDelay);
          } else {
            get().stop();
          }
          return;
        }

        const keyframe = sequence.keyframes[index];
        const mapStore = useMapStore.getState();

        set((s) => {
          s.playback.currentKeyframeIndex = index;
        });

        // Apply delay first
        sequenceTimeoutId = setTimeout(() => {
          const stillPlaying = get().playback.isPlaying;
          if (!stillPlaying) return;

          // Execute the animation
          switch (keyframe.animationType) {
            case 'flyTo':
              mapStore.flyTo(keyframe.camera, keyframe);
              break;
            case 'easeTo':
              mapStore.easeTo(keyframe.camera, keyframe);
              break;
            case 'jumpTo':
              mapStore.jumpTo(keyframe.camera);
              break;
            case 'rotateTo':
              mapStore.easeTo(
                { ...mapStore.camera, bearing: keyframe.camera.bearing },
                { ...keyframe, duration: keyframe.duration }
              );
              break;
          }

          // Schedule next keyframe
          const duration = keyframe.animationType === 'jumpTo' ? 50 : keyframe.duration;
          sequenceTimeoutId = setTimeout(() => {
            playKeyframe(index + 1);
          }, duration);
        }, keyframe.delay);
      };

      playKeyframe(state.playback.currentKeyframeIndex);
    },

    pause: () => {
      if (sequenceTimeoutId) clearTimeout(sequenceTimeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      set((state) => {
        state.playback.isPlaying = false;
      });
    },

    stop: () => {
      if (sequenceTimeoutId) clearTimeout(sequenceTimeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      set((state) => {
        state.playback = { ...DEFAULT_PLAYBACK };
        const seq = state.sequences.find((s) => s.id === state.activeSequenceId);
        if (seq) {
          state.playback.totalDuration = calculateTotalDuration(seq.keyframes);
        }
      });
    },

    seekTo: (time: number) => {
      const state = get();
      const seq = state.sequences.find((s) => s.id === state.activeSequenceId);
      if (!seq) return;

      // Find which keyframe this time falls into
      let accumulated = 0;
      let targetIndex = 0;
      
      for (let i = 0; i < seq.keyframes.length; i++) {
        const kf = seq.keyframes[i];
        const kfDuration = kf.delay + kf.duration;
        
        if (accumulated + kfDuration > time) {
          targetIndex = i;
          break;
        }
        accumulated += kfDuration;
        targetIndex = i + 1;
      }

      // Jump to that keyframe's camera position
      if (targetIndex < seq.keyframes.length) {
        const targetKf = seq.keyframes[targetIndex];
        useMapStore.getState().jumpTo(targetKf.camera);
      }

      set((s) => {
        s.playback.currentKeyframeIndex = Math.min(targetIndex, seq.keyframes.length - 1);
        s.playback.currentTime = time;
      });
    },

    setLoop: (sequenceId: string, loop: boolean) => {
      set((state) => {
        const seq = state.sequences.find((s) => s.id === sequenceId);
        if (seq) {
          seq.loop = loop;
        }
      });
    },
  }))
);

// Helper to capture current camera as keyframe
export const captureKeyframe = (name?: string): Omit<Keyframe, 'id'> => {
  const camera = useMapStore.getState().camera;
  return {
    name: name ?? `Keyframe ${Date.now()}`,
    camera: { ...camera },
    animationType: 'flyTo',
    duration: 2000,
    easing: 'easeInOut',
    delay: 0,
    essential: true,
  };
};
