import type { Map } from 'mapbox-gl';

// Screenshot capture
export const captureScreenshot = async (
  map: Map,
  options?: {
    width?: number;
    height?: number;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    includeAttribution?: boolean;
  }
): Promise<Blob> => {
  const {
    format = 'png',
    quality = 0.92,
    includeAttribution = true,
  } = options ?? {};

  return new Promise((resolve, reject) => {
    try {
      const canvas = map.getCanvas();
      
      // Get the map's current canvas as blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture screenshot'));
          }
        },
        `image/${format}`,
        quality
      );
    } catch (error) {
      reject(error);
    }
  });
};

// Download screenshot
export const downloadScreenshot = async (
  map: Map,
  filename: string = 'mapbox-screenshot',
  options?: Parameters<typeof captureScreenshot>[1]
): Promise<void> => {
  const blob = await captureScreenshot(map, options);
  const url = URL.createObjectURL(blob);
  const format = options?.format ?? 'png';
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// GIF Recording
interface GifRecorderOptions {
  fps?: number;
  width?: number;
  height?: number;
  quality?: number;
  workers?: number;
}

interface GifFrame {
  imageData: ImageData;
  delay: number;
}

export class GifRecorder {
  private map: Map;
  private frames: GifFrame[] = [];
  private isRecording = false;
  private lastFrameTime = 0;
  private frameInterval: number;
  private animationFrameId: number | null = null;
  private options: Required<GifRecorderOptions>;

  constructor(map: Map, options?: GifRecorderOptions) {
    this.map = map;
    this.options = {
      fps: options?.fps ?? 15,
      width: options?.width ?? 480,
      height: options?.height ?? 360,
      quality: options?.quality ?? 10,
      workers: options?.workers ?? 4,
    };
    this.frameInterval = 1000 / this.options.fps;
  }

  start(): void {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.frames = [];
    this.lastFrameTime = performance.now();
    this.captureFrame();
  }

  stop(): GifFrame[] {
    this.isRecording = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    return this.frames;
  }

  private captureFrame(): void {
    if (!this.isRecording) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      const canvas = this.map.getCanvas();
      
      // Create a scaled canvas for the frame
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = this.options.width;
      scaledCanvas.height = this.options.height;
      
      const ctx = scaledCanvas.getContext('2d');
      if (ctx) {
        // Draw scaled version of map canvas
        ctx.drawImage(
          canvas,
          0, 0, canvas.width, canvas.height,
          0, 0, this.options.width, this.options.height
        );

        const imageData = ctx.getImageData(0, 0, this.options.width, this.options.height);
        
        this.frames.push({
          imageData,
          delay: Math.round(elapsed),
        });
      }

      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.captureFrame());
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  // Export to GIF using gif.js library (would need to be loaded separately)
  async exportGif(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // This would use gif.js or similar library
      // For now, return a placeholder
      const canvas = document.createElement('canvas');
      canvas.width = this.options.width;
      canvas.height = this.options.height;
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create GIF'));
      });
    });
  }
}

// Video Recording using MediaRecorder
export class VideoRecorder {
  private map: Map;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(map: Map) {
    this.map = map;
  }

  async start(options?: { mimeType?: string; videoBitsPerSecond?: number }): Promise<void> {
    const canvas = this.map.getCanvas();
    this.stream = canvas.captureStream(30); // 30 FPS

    const mimeType = options?.mimeType ?? this.getSupportedMimeType();
    
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: options?.videoBitsPerSecond ?? 5000000,
    });

    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType });
        resolve(blob);
      };

      this.mediaRecorder.stop();
      
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'video/webm';
  }
}

// Download video
export const downloadVideo = async (
  blob: Blob,
  filename: string = 'mapbox-recording'
): Promise<void> => {
  const url = URL.createObjectURL(blob);
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Timelapse capture
export interface TimelapseOptions {
  duration: number; // Total capture duration in ms
  frameInterval: number; // Time between frames in ms
  outputFps?: number;
}

export const captureTimelapse = async (
  map: Map,
  animation: () => Promise<void>,
  options: TimelapseOptions
): Promise<GifFrame[]> => {
  const frames: GifFrame[] = [];
  const { duration, frameInterval } = options;
  const frameCount = Math.floor(duration / frameInterval);

  // Start animation
  animation();

  for (let i = 0; i < frameCount; i++) {
    await new Promise((resolve) => setTimeout(resolve, frameInterval));
    
    const canvas = map.getCanvas();
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push({
        imageData,
        delay: frameInterval,
      });
    }
  }

  return frames;
};

// Utility to create animated PNG (APNG) - simplified version
export const createAPNG = async (frames: GifFrame[]): Promise<Blob> => {
  // APNG creation would require a library like UPNG.js
  // This is a placeholder that creates a simple PNG of the first frame
  return new Promise((resolve, reject) => {
    if (frames.length === 0) {
      reject(new Error('No frames to convert'));
      return;
    }

    const firstFrame = frames[0];
    const canvas = document.createElement('canvas');
    canvas.width = firstFrame.imageData.width;
    canvas.height = firstFrame.imageData.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    ctx.putImageData(firstFrame.imageData, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG'));
    }, 'image/png');
  });
};
