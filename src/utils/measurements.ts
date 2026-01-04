import * as turf from '@turf/turf';

export type MeasurementUnit = 'meters' | 'kilometers' | 'miles' | 'feet' | 'yards';
export type AreaUnit = 'square-meters' | 'square-kilometers' | 'square-miles' | 'acres' | 'hectares';

// Distance between two points
export const measureDistance = (
  point1: [number, number],
  point2: [number, number],
  unit: MeasurementUnit = 'kilometers'
): number => {
  const from = turf.point(point1);
  const to = turf.point(point2);
  return turf.distance(from, to, { units: unit as any });
};

// Length of a line
export const measureLineLength = (
  coordinates: [number, number][],
  unit: MeasurementUnit = 'kilometers'
): number => {
  if (coordinates.length < 2) return 0;
  const line = turf.lineString(coordinates);
  return turf.length(line, { units: unit as any });
};

// Area of a polygon
export const measureArea = (
  coordinates: [number, number][],
  unit: AreaUnit = 'square-kilometers'
): number => {
  if (coordinates.length < 3) return 0;
  
  // Ensure polygon is closed
  const closed = [...coordinates];
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    closed.push(coordinates[0]);
  }
  
  const polygon = turf.polygon([closed]);
  const areaM2 = turf.area(polygon);
  
  return convertArea(areaM2, unit);
};

// Convert area units
const convertArea = (squareMeters: number, unit: AreaUnit): number => {
  switch (unit) {
    case 'square-meters':
      return squareMeters;
    case 'square-kilometers':
      return squareMeters / 1000000;
    case 'square-miles':
      return squareMeters / 2589988.11;
    case 'acres':
      return squareMeters / 4046.86;
    case 'hectares':
      return squareMeters / 10000;
    default:
      return squareMeters;
  }
};

// Bearing between two points
export const measureBearing = (
  point1: [number, number],
  point2: [number, number]
): number => {
  const from = turf.point(point1);
  const to = turf.point(point2);
  return turf.bearing(from, to);
};

// Midpoint between two points
export const getMidpoint = (
  point1: [number, number],
  point2: [number, number]
): [number, number] => {
  const from = turf.point(point1);
  const to = turf.point(point2);
  const mid = turf.midpoint(from, to);
  return mid.geometry.coordinates as [number, number];
};

// Centroid of a polygon
export const getCentroid = (
  coordinates: [number, number][]
): [number, number] => {
  if (coordinates.length < 3) {
    return coordinates[0] ?? [0, 0];
  }
  
  const closed = [...coordinates];
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    closed.push(coordinates[0]);
  }
  
  const polygon = turf.polygon([closed]);
  const centroid = turf.centroid(polygon);
  return centroid.geometry.coordinates as [number, number];
};

// Bounding box
export const getBoundingBox = (
  coordinates: [number, number][]
): { sw: [number, number]; ne: [number, number] } => {
  if (coordinates.length === 0) {
    return { sw: [0, 0], ne: [0, 0] };
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return {
    sw: [minLng, minLat],
    ne: [maxLng, maxLat],
  };
};

// Format distance for display
export const formatDistance = (
  value: number,
  unit: MeasurementUnit = 'kilometers'
): string => {
  const unitLabels: Record<MeasurementUnit, string> = {
    meters: 'm',
    kilometers: 'km',
    miles: 'mi',
    feet: 'ft',
    yards: 'yd',
  };

  if (unit === 'meters' && value >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  if (unit === 'feet' && value >= 5280) {
    return `${(value / 5280).toFixed(2)} mi`;
  }

  const decimals = value < 1 ? 3 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unitLabels[unit]}`;
};

// Format area for display
export const formatArea = (
  value: number,
  unit: AreaUnit = 'square-kilometers'
): string => {
  const unitLabels: Record<AreaUnit, string> = {
    'square-meters': 'm²',
    'square-kilometers': 'km²',
    'square-miles': 'mi²',
    'acres': 'ac',
    'hectares': 'ha',
  };

  const decimals = value < 1 ? 4 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unitLabels[unit]}`;
};

// Format bearing for display
export const formatBearing = (bearing: number): string => {
  // Normalize to 0-360
  let normalized = bearing % 360;
  if (normalized < 0) normalized += 360;

  // Cardinal directions
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(normalized / 22.5) % 16;
  
  return `${normalized.toFixed(1)}° ${directions[index]}`;
};

// Calculate elevation profile along a line (placeholder - would need elevation API)
export interface ElevationPoint {
  distance: number;
  elevation: number;
  coordinates: [number, number];
}

export const getElevationProfile = async (
  coordinates: [number, number][],
  _samples?: number
): Promise<ElevationPoint[]> => {
  // This would typically call an elevation API like Mapbox Terrain
  // For now, return placeholder data
  const line = turf.lineString(coordinates);
  const length = turf.length(line, { units: 'meters' });
  const samples = _samples ?? Math.min(100, Math.max(10, Math.floor(length / 100)));
  
  const points: ElevationPoint[] = [];
  
  for (let i = 0; i <= samples; i++) {
    const distance = (length * i) / samples;
    const point = turf.along(line, distance, { units: 'meters' });
    
    points.push({
      distance,
      elevation: Math.random() * 500, // Placeholder elevation
      coordinates: point.geometry.coordinates as [number, number],
    });
  }
  
  return points;
};

// Check if point is inside polygon
export const isPointInPolygon = (
  point: [number, number],
  polygonCoords: [number, number][]
): boolean => {
  if (polygonCoords.length < 3) return false;
  
  const closed = [...polygonCoords];
  if (
    polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
    polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]
  ) {
    closed.push(polygonCoords[0]);
  }
  
  const polygon = turf.polygon([closed]);
  const pt = turf.point(point);
  return turf.booleanPointInPolygon(pt, polygon);
};

// Find nearest point on line
export const nearestPointOnLine = (
  point: [number, number],
  lineCoords: [number, number][]
): {
  point: [number, number];
  distance: number;
  index: number;
} => {
  if (lineCoords.length < 2) {
    return {
      point: lineCoords[0] ?? point,
      distance: 0,
      index: 0,
    };
  }
  
  const line = turf.lineString(lineCoords);
  const pt = turf.point(point);
  const nearest = turf.nearestPointOnLine(line, pt);
  
  return {
    point: nearest.geometry.coordinates as [number, number],
    distance: nearest.properties.dist ?? 0,
    index: nearest.properties.index ?? 0,
  };
};

// Buffer geometry
export const bufferGeometry = (
  geometry: GeoJSON.Geometry,
  distance: number,
  unit: MeasurementUnit = 'meters'
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null => {
  try {
    const feature = turf.feature(geometry);
    const buffered = turf.buffer(feature, distance, { units: unit as any });
    return buffered?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  } catch {
    return null;
  }
};

// Simplify geometry
export const simplifyGeometry = (
  geometry: GeoJSON.Geometry,
  tolerance: number = 0.001
): GeoJSON.Geometry => {
  const feature = turf.feature(geometry);
  const simplified = turf.simplify(feature, { tolerance, highQuality: true });
  return simplified.geometry;
};
