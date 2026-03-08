/**
 * MAP COMPONENT
 * =============
 * Professional map component using react-map-gl and MapLibre GL
 * Based on mapcn.dev documentation
 */

'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import ReactMapGL, { MapRef as ReactMapGLRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/app/contexts/ThemeContext';

export interface MapRef {
  easeTo: (options: { pitch?: number; duration?: number }) => void;
  getMap: () => ReactMapGLRef['getMap'] | undefined;
}

interface MapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  styles?: {
    light?: string | object;
    dark?: string | object;
  };
  children?: React.ReactNode;
  onLoad?: () => void;
  interactive?: boolean;
  onMove?: (viewState: { longitude: number; latitude: number; zoom: number }) => void;
}

const DEFAULT_STYLE = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

export const Map = forwardRef<MapRef, MapProps>(
  (
    {
      center = [0, 20],
      zoom = 2,
      styles,
      children,
      onLoad,
      interactive = true,
      onMove,
    },
    ref
  ) => {
    const mapRef = useRef<ReactMapGLRef>(null);
    const { theme } = useTheme();

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      easeTo: (options) => {
        mapRef.current?.easeTo(options);
      },
      getMap: () => mapRef.current?.getMap(),
    }));

    const preferredStyle = theme === 'light' ? styles?.light : styles?.dark;
    const fallbackStyle = theme === 'light' ? styles?.dark : styles?.light;
    const mapStyle = preferredStyle || fallbackStyle || DEFAULT_STYLE[theme];

    return (
      <ReactMapGL
        ref={mapRef}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom,
        }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        onLoad={onLoad}
        dragPan={interactive}
        dragRotate={interactive}
        scrollZoom={interactive}
        touchZoomRotate={interactive}
        doubleClickZoom={interactive}
        keyboard={interactive}
        attributionControl={false}
        onMove={onMove}
      >
        {children}
      </ReactMapGL>
    );
  }
);

Map.displayName = 'Map';
