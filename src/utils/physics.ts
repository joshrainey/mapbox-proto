/**
 * Physics-based animation engine for Mapbox camera control
 * Bypasses flyTo/easeTo entirely for terrain-immune animations
 */

// ============================================
// Core Types
// ============================================

export interface SpringConfig {
  stiffness: number;    // Spring tension (default: 100)
  damping: number;      // Friction (default: 10)
  mass: number;         // Weight (default: 1)
  velocity?: number;    // Initial velocity
  restSpeed?: number;   // Speed threshold to consider "at rest"
  restDelta?: number;   // Distance threshold to consider "at rest"
}

export interface DecayConfig {
  velocity: number;     // Initial velocity
  deceleration?: number; // Rate of slowdown (default: 0.998)
  modifyTarget?: (target: number) => number; // Snap to grid, etc.
}

export interface BounceConfig {
  stiffness: number;
  damping: number;
  bounces: number;      // Number of bounces
  bounceFactor: number; // Energy retained per bounce (0-1)
}

export interface InertiaConfig {
  velocity: number;
  min?: number;
  max?: number;
  bounceDamping?: number;
  bounceStiffness?: number;
  timeConstant?: number;
}

export interface PhysicsState {
  value: number;
  velocity: number;
  timestamp: number;
}

export type PhysicsType = 'spring' | 'decay' | 'bounce' | 'inertia' | 'magnetic' | 'gravity';

// ============================================
// Spring Physics
// ============================================

export class SpringSimulator {
  private stiffness: number;
  private damping: number;
  private mass: number;
  private restSpeed: number;
  private restDelta: number;
  
  constructor(config: SpringConfig) {
    this.stiffness = config.stiffness ?? 100;
    this.damping = config.damping ?? 10;
    this.mass = config.mass ?? 1;
    this.restSpeed = config.restSpeed ?? 0.01;
    this.restDelta = config.restDelta ?? 0.01;
  }
  
  /**
   * Calculate spring position at time t
   * Uses analytical solution for damped harmonic oscillator
   */
  solve(from: number, to: number, velocity: number, t: number): PhysicsState {
    const displacement = from - to;
    const dampingRatio = this.damping / (2 * Math.sqrt(this.stiffness * this.mass));
    const angularFreq = Math.sqrt(this.stiffness / this.mass);
    
    let position: number;
    let newVelocity: number;
    
    if (dampingRatio < 1) {
      // Underdamped - oscillates
      const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
      const decay = Math.exp(-dampingRatio * angularFreq * t);
      const A = displacement;
      const B = (dampingRatio * angularFreq * displacement + velocity) / dampedFreq;
      
      position = to + decay * (A * Math.cos(dampedFreq * t) + B * Math.sin(dampedFreq * t));
      newVelocity = decay * (
        (B * dampedFreq - A * dampingRatio * angularFreq) * Math.cos(dampedFreq * t) -
        (A * dampedFreq + B * dampingRatio * angularFreq) * Math.sin(dampedFreq * t)
      );
    } else if (dampingRatio === 1) {
      // Critically damped - fastest without oscillation
      const decay = Math.exp(-angularFreq * t);
      position = to + decay * (displacement + (velocity + angularFreq * displacement) * t);
      newVelocity = decay * (velocity * (1 - angularFreq * t) - angularFreq * angularFreq * displacement * t);
    } else {
      // Overdamped - slow return
      const s1 = -angularFreq * (dampingRatio - Math.sqrt(dampingRatio * dampingRatio - 1));
      const s2 = -angularFreq * (dampingRatio + Math.sqrt(dampingRatio * dampingRatio - 1));
      const A = (velocity - s2 * displacement) / (s1 - s2);
      const B = displacement - A;
      
      position = to + A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
      newVelocity = A * s1 * Math.exp(s1 * t) + B * s2 * Math.exp(s2 * t);
    }
    
    return {
      value: position,
      velocity: newVelocity,
      timestamp: t
    };
  }
  
  /**
   * Check if spring is at rest
   */
  isAtRest(state: PhysicsState, target: number): boolean {
    return Math.abs(state.velocity) < this.restSpeed && 
           Math.abs(state.value - target) < this.restDelta;
  }
}

// ============================================
// Decay Physics (momentum)
// ============================================

export class DecaySimulator {
  private deceleration: number;
  private modifyTarget?: (target: number) => number;
  
  constructor(config: Partial<DecayConfig> = {}) {
    this.deceleration = config.deceleration ?? 0.998;
    this.modifyTarget = config.modifyTarget;
  }
  
  /**
   * Calculate position with exponential decay
   */
  solve(from: number, velocity: number, t: number): PhysicsState {
    // v(t) = v0 * deceleration^t
    // x(t) = x0 + v0 * (1 - deceleration^t) / -ln(deceleration)
    const logDecel = Math.log(this.deceleration);
    const decayFactor = Math.pow(this.deceleration, t * 1000); // t in seconds, decay per ms
    
    const position = from + (velocity * (1 - decayFactor)) / -logDecel / 1000;
    const newVelocity = velocity * decayFactor;
    
    return {
      value: position,
      velocity: newVelocity,
      timestamp: t
    };
  }
  
  /**
   * Calculate where the decay will naturally end
   */
  predictTarget(from: number, velocity: number): number {
    const logDecel = Math.log(this.deceleration);
    const target = from + velocity / -logDecel / 1000;
    return this.modifyTarget ? this.modifyTarget(target) : target;
  }
}

// ============================================
// Bounce Physics
// ============================================

export class BounceSimulator {
  private gravity: number;
  private bounceFactor: number;
  private floor: number;
  
  constructor(config: { gravity?: number; bounceFactor?: number; floor?: number } = {}) {
    this.gravity = config.gravity ?? 9.8;
    this.bounceFactor = config.bounceFactor ?? 0.7;
    this.floor = config.floor ?? 0;
  }
  
  /**
   * Simulate bouncing with energy loss
   */
  solve(from: number, velocity: number, t: number): PhysicsState {
    let position = from;
    let vel = velocity;
    let time = 0;
    const dt = 0.016; // 60fps timestep
    
    while (time < t) {
      vel += this.gravity * dt;
      position += vel * dt;
      
      // Bounce off floor
      if (position <= this.floor) {
        position = this.floor;
        vel = -vel * this.bounceFactor;
        
        // Stop if velocity too low
        if (Math.abs(vel) < 0.1) {
          vel = 0;
          break;
        }
      }
      
      time += dt;
    }
    
    return {
      value: position,
      velocity: vel,
      timestamp: t
    };
  }
}

// ============================================
// Magnetic / Snap Physics
// ============================================

export class MagneticSimulator {
  private snapPoints: number[];
  private strength: number;
  private range: number;
  
  constructor(config: { snapPoints: number[]; strength?: number; range?: number }) {
    this.snapPoints = config.snapPoints;
    this.strength = config.strength ?? 0.5;
    this.range = config.range ?? 50;
  }
  
  /**
   * Calculate magnetic pull toward nearest snap point
   */
  getForce(position: number): number {
    let totalForce = 0;
    
    for (const snap of this.snapPoints) {
      const distance = snap - position;
      if (Math.abs(distance) < this.range) {
        // Inverse square attraction
        const force = this.strength * distance / (Math.abs(distance) + 1);
        totalForce += force;
      }
    }
    
    return totalForce;
  }
  
  /**
   * Find nearest snap point
   */
  getNearestSnap(position: number): number {
    let nearest = this.snapPoints[0];
    let minDist = Math.abs(position - nearest);
    
    for (const snap of this.snapPoints) {
      const dist = Math.abs(position - snap);
      if (dist < minDist) {
        minDist = dist;
        nearest = snap;
      }
    }
    
    return nearest;
  }
}

// ============================================
// Multi-property Animator
// ============================================

export interface AnimationTarget {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface PhysicsAnimationConfig {
  type: PhysicsType;
  spring?: SpringConfig;
  decay?: DecayConfig;
  bounce?: BounceConfig;
  duration?: number; // Max duration fallback
}

export class CameraAnimator {
  private map: mapboxgl.Map;
  private frameId: number | null = null;
  private onUpdate?: (state: AnimationTarget) => void;
  private onComplete?: () => void;
  
  constructor(map: mapboxgl.Map) {
    this.map = map;
  }
  
  /**
   * Animate camera with physics
   */
  animate(
    from: AnimationTarget,
    to: AnimationTarget,
    config: PhysicsAnimationConfig,
    callbacks?: { onUpdate?: (state: AnimationTarget) => void; onComplete?: () => void }
  ) {
    this.stop();
    this.onUpdate = callbacks?.onUpdate;
    this.onComplete = callbacks?.onComplete;
    
    const startTime = performance.now();
    const maxDuration = config.duration ?? 10000;
    
    // Create simulators for each property
    const springs: Record<string, SpringSimulator> = {};
    const initialVelocities: Record<string, number> = {
      lng: 0, lat: 0, zoom: 0, bearing: 0, pitch: 0
    };
    
    if (config.type === 'spring' && config.spring) {
      const springConfig = config.spring;
      springs.lng = new SpringSimulator(springConfig);
      springs.lat = new SpringSimulator(springConfig);
      springs.zoom = new SpringSimulator({ ...springConfig, stiffness: springConfig.stiffness * 0.5 });
      springs.bearing = new SpringSimulator(springConfig);
      springs.pitch = new SpringSimulator({ ...springConfig, stiffness: springConfig.stiffness * 0.7 });
    }
    
    const frame = () => {
      const elapsed = (performance.now() - startTime) / 1000; // seconds
      
      if (elapsed >= maxDuration / 1000) {
        this.map.jumpTo({
          center: to.center,
          zoom: to.zoom,
          bearing: to.bearing,
          pitch: to.pitch
        });
        this.onComplete?.();
        return;
      }
      
      let current: AnimationTarget;
      let allAtRest = true;
      
      if (config.type === 'spring' && config.spring) {
        const lngState = springs.lng.solve(from.center[0], to.center[0], initialVelocities.lng, elapsed);
        const latState = springs.lat.solve(from.center[1], to.center[1], initialVelocities.lat, elapsed);
        const zoomState = springs.zoom.solve(from.zoom, to.zoom, initialVelocities.zoom, elapsed);
        const bearingState = springs.bearing.solve(from.bearing, to.bearing, initialVelocities.bearing, elapsed);
        const pitchState = springs.pitch.solve(from.pitch, to.pitch, initialVelocities.pitch, elapsed);
        
        current = {
          center: [lngState.value, latState.value],
          zoom: zoomState.value,
          bearing: bearingState.value,
          pitch: pitchState.value
        };
        
        // Check if all springs are at rest
        allAtRest = 
          springs.lng.isAtRest(lngState, to.center[0]) &&
          springs.lat.isAtRest(latState, to.center[1]) &&
          springs.zoom.isAtRest(zoomState, to.zoom) &&
          springs.bearing.isAtRest(bearingState, to.bearing) &&
          springs.pitch.isAtRest(pitchState, to.pitch);
      } else {
        // Fallback to simple lerp
        const t = Math.min(elapsed / (maxDuration / 1000), 1);
        current = {
          center: [
            lerp(from.center[0], to.center[0], t),
            lerp(from.center[1], to.center[1], t)
          ],
          zoom: lerp(from.zoom, to.zoom, t),
          bearing: lerpAngle(from.bearing, to.bearing, t),
          pitch: lerp(from.pitch, to.pitch, t)
        };
        allAtRest = t >= 1;
      }
      
      // Use jumpTo to bypass terrain interpolation
      this.map.jumpTo({
        center: current.center,
        zoom: current.zoom,
        bearing: current.bearing,
        pitch: current.pitch
      });
      
      this.onUpdate?.(current);
      
      if (allAtRest) {
        // Snap to final position
        this.map.jumpTo({
          center: to.center,
          zoom: to.zoom,
          bearing: to.bearing,
          pitch: to.pitch
        });
        this.onComplete?.();
      } else {
        this.frameId = requestAnimationFrame(frame);
      }
    };
    
    this.frameId = requestAnimationFrame(frame);
  }
  
  stop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

// ============================================
// Easing Functions (for hybrid approaches)
// ============================================

export const easings = {
  // Standard
  linear: (t: number) => t,
  
  // Quadratic
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quartic
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Quintic
  easeInQuint: (t: number) => t * t * t * t * t,
  easeOutQuint: (t: number) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  // Exponential
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Circular
  easeInCirc: (t: number) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t: number) => t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  
  // Back (overshoot)
  easeInBack: (t: number) => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
  easeOutBack: (t: number) => {
    const c = 1.70158;
    return 1 + (--t) * t * ((c + 1) * t + c);
  },
  easeInOutBack: (t: number) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (4 * t * t * ((c + 1) * 2 * t - c)) / 2
      : ((2 * t - 2) * (2 * t - 2) * ((c + 1) * (2 * t - 2) + c) + 2) / 2;
  },
  
  // Elastic
  easeInElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  easeInOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 + 1;
  },
  
  // Bounce
  easeInBounce: (t: number) => 1 - easings.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBounce: (t: number) => t < 0.5
    ? (1 - easings.easeOutBounce(1 - 2 * t)) / 2
    : (1 + easings.easeOutBounce(2 * t - 1)) / 2,
  
  // Custom spring approximation (for export)
  springApprox: (stiffness: number, damping: number) => (t: number) => {
    const dampingRatio = damping / (2 * Math.sqrt(stiffness));
    if (dampingRatio >= 1) {
      // Critically/over damped - no oscillation
      return 1 - Math.exp(-stiffness * t / damping) * (1 + stiffness * t / damping);
    }
    // Underdamped - oscillates
    const freq = Math.sqrt(stiffness) * Math.sqrt(1 - dampingRatio * dampingRatio);
    return 1 - Math.exp(-dampingRatio * Math.sqrt(stiffness) * t) * 
      Math.cos(freq * t + Math.asin(dampingRatio));
  }
};

// ============================================
// Utility Functions
// ============================================

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  // Handle angle wrapping
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================
// Bezier Curves for Custom Easing
// ============================================

export class CubicBezier {
  private cx: number;
  private bx: number;
  private ax: number;
  private cy: number;
  private by: number;
  private ay: number;
  
  constructor(p1x: number, p1y: number, p2x: number, p2y: number) {
    this.cx = 3 * p1x;
    this.bx = 3 * (p2x - p1x) - this.cx;
    this.ax = 1 - this.cx - this.bx;
    
    this.cy = 3 * p1y;
    this.by = 3 * (p2y - p1y) - this.cy;
    this.ay = 1 - this.cy - this.by;
  }
  
  private sampleX(t: number): number {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  }
  
  private sampleY(t: number): number {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  }
  
  private sampleDerivX(t: number): number {
    return (3 * this.ax * t + 2 * this.bx) * t + this.cx;
  }
  
  /**
   * Given an x value, find the corresponding y value on the curve
   */
  solve(x: number): number {
    // Newton-Raphson iteration
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = this.sampleX(t) - x;
      if (Math.abs(currentX) < 1e-6) break;
      const deriv = this.sampleDerivX(t);
      if (Math.abs(deriv) < 1e-6) break;
      t -= currentX / deriv;
    }
    return this.sampleY(t);
  }
  
  /**
   * Get easing function
   */
  getEasing(): (t: number) => number {
    return (t: number) => this.solve(t);
  }
}

// Common bezier presets
export const bezierPresets = {
  ease: new CubicBezier(0.25, 0.1, 0.25, 1),
  easeIn: new CubicBezier(0.42, 0, 1, 1),
  easeOut: new CubicBezier(0, 0, 0.58, 1),
  easeInOut: new CubicBezier(0.42, 0, 0.58, 1),
  // More dramatic
  snappy: new CubicBezier(0.5, 0, 0.1, 1),
  smooth: new CubicBezier(0.4, 0, 0.2, 1),
  // For cameras
  cinematic: new CubicBezier(0.7, 0, 0.3, 1),
  dramatic: new CubicBezier(0.9, 0, 0.1, 1),
};

// ============================================
// Code Generation for Export
// ============================================

export function generatePhysicsAnimationCode(
  config: PhysicsAnimationConfig,
  from: AnimationTarget,
  to: AnimationTarget
): string {
  if (config.type === 'spring' && config.spring) {
    return `// Spring Animation (terrain-immune)
const springConfig = {
  stiffness: ${config.spring.stiffness},
  damping: ${config.spring.damping},
  mass: ${config.spring.mass}
};

function springAnimate(from, to) {
  const startTime = performance.now();
  const { stiffness, damping, mass } = springConfig;
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  const angularFreq = Math.sqrt(stiffness / mass);
  
  function solveSpring(start, end, t) {
    const displacement = start - end;
    if (dampingRatio < 1) {
      // Underdamped - oscillates
      const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
      const decay = Math.exp(-dampingRatio * angularFreq * t);
      return end + decay * displacement * Math.cos(dampedFreq * t);
    } else {
      // Critically/over damped
      const decay = Math.exp(-angularFreq * t);
      return end + decay * (displacement + angularFreq * displacement * t);
    }
  }
  
  function frame() {
    const t = (performance.now() - startTime) / 1000;
    
    const current = {
      center: [
        solveSpring(from.center[0], to.center[0], t),
        solveSpring(from.center[1], to.center[1], t)
      ],
      zoom: solveSpring(from.zoom, to.zoom, t),
      bearing: solveSpring(from.bearing, to.bearing, t),
      pitch: solveSpring(from.pitch, to.pitch, t)
    };
    
    // jumpTo bypasses terrain interpolation
    map.jumpTo(current);
    
    // Check if settled (velocity near zero)
    const settled = t > 0.1 && 
      Math.abs(current.zoom - to.zoom) < 0.01 &&
      Math.abs(current.bearing - to.bearing) < 0.1 &&
      Math.abs(current.pitch - to.pitch) < 0.1;
    
    if (!settled && t < 10) {
      requestAnimationFrame(frame);
    } else {
      map.jumpTo(to);
    }
  }
  
  requestAnimationFrame(frame);
}

// Usage
springAnimate(
  ${JSON.stringify(from, null, 2)},
  ${JSON.stringify(to, null, 2)}
);`;
  }
  
  // Fallback to manual easing
  return `// Manual Animation (terrain-immune)
function animateCamera(from, to, duration, easingFn) {
  const startTime = performance.now();
  
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  function frame() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easingFn(progress);
    
    map.jumpTo({
      center: [
        lerp(from.center[0], to.center[0], eased),
        lerp(from.center[1], to.center[1], eased)
      ],
      zoom: lerp(from.zoom, to.zoom, eased),
      bearing: lerp(from.bearing, to.bearing, eased),
      pitch: lerp(from.pitch, to.pitch, eased)
    });
    
    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }
  
  requestAnimationFrame(frame);
}

// Usage
animateCamera(
  ${JSON.stringify(from, null, 2)},
  ${JSON.stringify(to, null, 2)},
  ${config.duration ?? 2000},
  ${config.type === 'decay' ? 't => 1 - Math.pow(0.998, t * 1000)' : 't => t * (2 - t)'}
);`;
}
