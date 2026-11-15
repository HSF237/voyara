import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { env } from '@/lib/env';
import { RouteSketch, type RoutePoint } from './RouteSketch';

type RouteMapProps = {
  points: RoutePoint[];
  activeId?: string;
  theme: 'light' | 'dark';
  onSelect?: (id: string) => void;
};

const read = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * The day's route on a real map (MapLibre + MapTiler tiles): numbered stops in
 * visiting order, joined by a dashed line. This file is its own download, so
 * the map library never slows the rest of the app.
 */
export default function RouteMap({ points, activeId, theme, onSelect }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; element: HTMLElement }>());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = env.raw.VITE_MAPTILER_KEY;

  // Create the map once per theme (the style is different for dark).
  useEffect(() => {
    const node = container.current;
    if (!node || !key) return;
    const made = markers.current;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: node,
        style: `https://api.maptiler.com/maps/${theme === 'dark' ? 'streets-v2-dark' : 'streets-v2'}/style.json?key=${key}`,
        center: [points[0]?.lng ?? 0, points[0]?.lat ?? 0],
        zoom: 12,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
    } catch {
      queueMicrotask(() => setFailed(true)); // no WebGL on this device
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': read('--primary'), 'line-width': 3, 'line-dasharray': [0.2, 2] },
      });
      setReady(true);
    });
    map.on('error', (event) => {
      // A style that cannot be fetched (bad key, offline) leaves an empty map: show the sketch.
      if (
        !map.isStyleLoaded() &&
        /style|401|403|Failed to fetch/i.test(String(event.error?.message))
      ) {
        setFailed(true);
      }
    });
    return () => {
      made.forEach(({ marker }) => marker.remove());
      made.clear();
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
    // The first point only seeds the starting view; later changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, theme]);

  // Keep the line, the numbered markers and the view in step with the day shown.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: points.map((point) => [point.lng, point.lat]) },
    });

    markers.current.forEach(({ marker }) => marker.remove());
    markers.current.clear();
    for (const point of points) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'vy-map-pin';
      element.textContent = point.label;
      element.setAttribute('aria-label', `${point.label}. ${point.name}`);
      element.addEventListener('click', () => onSelect?.(point.id));
      const marker = new maplibregl.Marker({ element })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markers.current.set(point.id, { marker, element });
    }

    if (points.length === 1 && points[0]) {
      map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 14, duration: 600 });
    } else if (points.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((point) => bounds.extend([point.lng, point.lat]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 700 });
    }
    // onSelect is stable enough: re-pinning on every render would make the map flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, ready]);

  useEffect(() => {
    markers.current.forEach(({ element }, id) => {
      element.classList.toggle('vy-map-pin-active', id === activeId);
    });
  }, [activeId, points, ready]);

  if (!key || failed) return <RouteSketch points={points} activeId={activeId} />;
  return (
    <div className="relative size-full">
      <div ref={container} className="size-full" />
      {!ready && <RouteSketch points={points} activeId={activeId} className="absolute inset-0" />}
    </div>
  );
}
