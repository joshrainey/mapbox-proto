import type { 
  CameraState, 
  Keyframe, 
  AnimationSequence, 
  ProtoLayer, 
  ProtoSource,
  AnimatedLine,
  ExportOptions 
} from '../types';

// Generate camera animation code
export const generateCameraCode = (keyframe: Keyframe): string => {
  const { camera, animationType, duration, easing, essential } = keyframe;

  switch (animationType) {
    case 'flyTo':
      return `map.flyTo({
  center: [${camera.center[0].toFixed(6)}, ${camera.center[1].toFixed(6)}],
  zoom: ${camera.zoom.toFixed(2)},
  pitch: ${camera.pitch.toFixed(1)},
  bearing: ${camera.bearing.toFixed(1)},
  duration: ${duration},
  essential: ${essential}${easing !== 'linear' ? `,
  easing: ${generateEasingCode(easing)}` : ''}
});`;

    case 'easeTo':
      return `map.easeTo({
  center: [${camera.center[0].toFixed(6)}, ${camera.center[1].toFixed(6)}],
  zoom: ${camera.zoom.toFixed(2)},
  pitch: ${camera.pitch.toFixed(1)},
  bearing: ${camera.bearing.toFixed(1)},
  duration: ${duration},
  essential: ${essential}${easing !== 'linear' ? `,
  easing: ${generateEasingCode(easing)}` : ''}
});`;

    case 'jumpTo':
      return `map.jumpTo({
  center: [${camera.center[0].toFixed(6)}, ${camera.center[1].toFixed(6)}],
  zoom: ${camera.zoom.toFixed(2)},
  pitch: ${camera.pitch.toFixed(1)},
  bearing: ${camera.bearing.toFixed(1)}
});`;

    case 'rotateTo':
      return `map.rotateTo(${camera.bearing.toFixed(1)}, {
  duration: ${duration}${easing !== 'linear' ? `,
  easing: ${generateEasingCode(easing)}` : ''}
});`;

    default:
      return '';
  }
};

// Generate easing function code
const generateEasingCode = (easing: string): string => {
  const easingMap: Record<string, string> = {
    linear: '(t) => t',
    easeIn: '(t) => t * t',
    easeOut: '(t) => t * (2 - t)',
    easeInOut: '(t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t',
    easeInQuad: '(t) => t * t',
    easeOutQuad: '(t) => t * (2 - t)',
    easeInCubic: '(t) => t * t * t',
    easeOutCubic: '(t) => (--t) * t * t + 1',
    easeInQuart: '(t) => t * t * t * t',
    easeOutQuart: '(t) => 1 - (--t) * t * t * t',
    bounce: `(t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }`,
    elastic: `(t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }`,
  };

  return easingMap[easing] || '(t) => t';
};

// Generate sequence code
export const generateSequenceCode = (sequence: AnimationSequence): string => {
  const { keyframes, loop, loopDelay } = sequence;

  const animationFunctions = keyframes.map((kf, i) => {
    const delay = kf.delay > 0 ? `await delay(${kf.delay});\n  ` : '';
    const duration = kf.animationType === 'jumpTo' ? 50 : kf.duration;
    
    return `// ${kf.name}
  ${delay}${generateCameraCode(kf)}
  await delay(${duration});`;
  }).join('\n\n  ');

  return `// Animation Sequence: ${sequence.name}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function playSequence() {
  ${animationFunctions}${loop ? `

  // Loop
  await delay(${loopDelay});
  playSequence();` : ''}
}

playSequence();`;
};

// Generate source code
export const generateSourceCode = (source: ProtoSource): string => {
  if (source.type === 'geojson') {
    return `map.addSource('${source.id}', {
  type: 'geojson',
  data: ${JSON.stringify(source.data, null, 2)}
});`;
  }

  return `map.addSource('${source.id}', {
  type: '${source.type}',
  // Add source configuration here
});`;
};

// Generate layer code
export const generateLayerCode = (layer: ProtoLayer): string => {
  const config: any = {
    id: layer.id,
    type: layer.type,
    source: layer.sourceId,
  };

  if (Object.keys(layer.paint).length > 0) {
    config.paint = layer.paint;
  }

  if (Object.keys(layer.layout).length > 0) {
    config.layout = layer.layout;
  }

  if (layer.filter) {
    config.filter = layer.filter;
  }

  if (layer.minzoom !== undefined) {
    config.minzoom = layer.minzoom;
  }

  if (layer.maxzoom !== undefined) {
    config.maxzoom = layer.maxzoom;
  }

  return `map.addLayer(${JSON.stringify(config, null, 2)});`;
};

// Generate animated line code
export const generateAnimatedLineCode = (line: AnimatedLine): string => {
  return `// Animated Line: ${line.id}
const lineCoordinates = ${JSON.stringify(line.coordinates)};

map.addSource('animated-line-${line.id}', {
  type: 'geojson',
  data: {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [] }
  }
});

map.addLayer({
  id: 'animated-line-${line.id}',
  type: 'line',
  source: 'animated-line-${line.id}',
  paint: {
    'line-color': '${line.style.color}',
    'line-width': ${line.style.width}
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round'
  }
});

// Animation loop
function animateLine() {
  const duration = ${line.animation.duration};
  const trailLength = ${line.animation.trailLength};
  const startTime = performance.now();
  
  function frame(currentTime) {
    const elapsed = currentTime - startTime;
    let progress = elapsed / duration;
    
    if (progress >= 1) {
      ${line.animation.loop ? 'animateLine(); return;' : 'progress = 1;'}
    }
    
    // Use turf.js to slice the line based on progress
    const fullLine = turf.lineString(lineCoordinates);
    const totalLength = turf.length(fullLine);
    const headDistance = totalLength * progress;
    const tailDistance = Math.max(0, headDistance - totalLength * trailLength);
    
    const sliced = turf.lineSliceAlong(fullLine, tailDistance, headDistance);
    map.getSource('animated-line-${line.id}').setData(sliced);
    
    ${line.animation.loop || 'if (progress < 1) '}requestAnimationFrame(frame);
  }
  
  requestAnimationFrame(frame);
}

animateLine();`;
};

// Generate full export
export const generateFullExport = (
  options: ExportOptions,
  data: {
    camera?: CameraState;
    sequences?: AnimationSequence[];
    sources?: ProtoSource[];
    layers?: ProtoLayer[];
    animatedLines?: AnimatedLine[];
  }
): string => {
  const sections: string[] = [];

  if (options.format === 'standalone') {
    sections.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mapbox Animation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <script src="https://unpkg.com/@turf/turf@7/turf.min.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
<div id="map"></div>
<script>`);
  }

  if (options.includeMapInit && data.camera) {
    sections.push(`
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [${data.camera.center[0].toFixed(6)}, ${data.camera.center[1].toFixed(6)}],
  zoom: ${data.camera.zoom.toFixed(2)},
  pitch: ${data.camera.pitch.toFixed(1)},
  bearing: ${data.camera.bearing.toFixed(1)}
});

map.on('load', () => {`);
  }

  if (options.includeStyles && data.sources && data.layers) {
    data.sources.forEach((source) => {
      sections.push('  ' + generateSourceCode(source).replace(/\n/g, '\n  '));
    });

    sections.push('');

    data.layers.forEach((layer) => {
      sections.push('  ' + generateLayerCode(layer).replace(/\n/g, '\n  '));
    });
  }

  if (options.includeDrawing && data.animatedLines) {
    data.animatedLines.forEach((line) => {
      sections.push('  ' + generateAnimatedLineCode(line).replace(/\n/g, '\n  '));
    });
  }

  if (options.includeAnimations && data.sequences) {
    data.sequences.forEach((seq) => {
      sections.push('  ' + generateSequenceCode(seq).replace(/\n/g, '\n  '));
    });
  }

  if (options.includeMapInit) {
    sections.push(`});`);
  }

  if (options.format === 'standalone') {
    sections.push(`</script>
</body>
</html>`);
  }

  let code = sections.join('\n');

  if (options.minify) {
    // Basic minification - remove extra whitespace and comments
    code = code
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s{2,}/g, ' ');
  }

  return code;
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};
