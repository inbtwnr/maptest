"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  MapContainer,
  TileLayer,
  Marker,
  ZoomControl,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { loadPointContent } from "@/lib/contentLoader";
import { hasContent } from "@/lib/contentMapping";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import L from "leaflet";
import "@maplibre/maplibre-gl-leaflet";

interface MapPoint {
  id: string;
  lng: number;
  lat: number;
  title: string;
  description?: string;
  address?: string;
  image?: string;
}

interface LeafletMapBoxProps {
  initialLng?: number;
  initialLat?: number;
  initialZoom?: number;
  className?: string;
  points?: MapPoint[];
  useVectorTiles?: boolean; // Використовувати векторні тайли MapLibre замість растрових
  // Налаштування анімації міток
  markerAnimationDuration?: number; // Тривалість анімації в секундах (за замовчуванням 0.2)
  markerAnimateWhileZooming?: boolean; // Анімувати під час зуму (за замовчуванням false)
  markerMinSize?: number; // Мінімальний розмір маркера (за замовчуванням 20)
  markerMaxSize?: number; // Максимальний розмір маркера (за замовчуванням 300)
  markerScaleFactor?: number; // Коефіцієнт масштабування (за замовчуванням 0.5)
}

// Компонент для відстеження подій карти
const MapEventHandler: React.FC<{
  onMove: (lat: number, lng: number, zoom: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}> = ({ onMove, onDragStart, onDragEnd }) => {
  useMapEvents({
    move: (e) => {
      const center = e.target.getCenter();
      const zoom = e.target.getZoom();
      onMove(center.lat, center.lng, zoom);
    },
    dragstart: () => {
      onDragStart();
    },
    dragend: () => {
      onDragEnd();
    },
  });
  return null;
};

// Компонент для управління картою (центрування, перетягування)
const MapController: React.FC<{
  dragEnabled: boolean;
  centerLat: number;
  centerLng: number;
  centerZoom: number;
  shouldCenter: boolean;
  onCenterComplete: () => void;
}> = ({
  dragEnabled,
  centerLat,
  centerLng,
  centerZoom,
  shouldCenter,
  onCenterComplete,
}) => {
  const map = useMap();

  useEffect(() => {
    if (dragEnabled) {
      map.dragging.enable();
    } else {
      map.dragging.disable();
    }
  }, [dragEnabled, map]);

  useEffect(() => {
    if (shouldCenter) {
      map.flyTo([centerLat, centerLng], centerZoom, { duration: 1 });
      onCenterComplete();
    }
  }, [shouldCenter, centerLat, centerLng, centerZoom, map, onCenterComplete]);

  return null;
};

// Компонент для динамічного масштабування маркерів залежно від зуму
const DynamicMarker: React.FC<{
  point: MapPoint;
  baseZoom: number;
  onClick: (point: MapPoint) => void;
  animationDuration?: number; // Тривалість анімації в секундах
  animateWhileZooming?: boolean; // Анімувати під час зуму чи тільки після
  minSize?: number; // Мінімальний розмір маркера
  maxSize?: number; // Максимальний розмір маркера
  scaleFactor?: number; // Коефіцієнт масштабування (швидкість зміни розміру)
}> = ({
  point,
  baseZoom,
  onClick,
  animationDuration = 0.2,
  animateWhileZooming = true,
  minSize = 20,
  maxSize = 300,
  scaleFactor = 0.5,
}) => {
  const map = useMap();
  const markerRef = React.useRef<L.Marker | null>(null);

  // Функція для обчислення розміру маркера
  const calculateIconSize = React.useCallback(
    (currentZoom: number): number => {
      // Базовий розмір маркера
      const baseSize = 64;
      // Базовий зум (той, на якому маркер має стандартний розмір)
      const referenceZoom = baseZoom;

      // Обчислюємо масштаб експоненційно - при збільшенні зуму маркери збільшуються
      // Використовуємо степінь для плавного масштабування
      const zoomDifference = currentZoom - referenceZoom;
      const scale = Math.pow(2, zoomDifference * scaleFactor); // Використовуємо налаштований scaleFactor

      // Обмежуємо мінімальний та максимальний розмір (використовуємо пропси)
      const calculatedSize = baseSize * scale;
      return Math.max(minSize, Math.min(maxSize, calculatedSize));
    },
    [baseZoom, scaleFactor, minSize, maxSize]
  );

  // Створюємо початкову іконку
  const createIcon = React.useCallback(
    (zoom: number): L.DivIcon => {
      const iconSize = calculateIconSize(zoom);

      if (point.image) {
        // Додаємо CSS змінну для тривалості анімації
        return L.divIcon({
          html: `<div class="custom-marker" style="background-image: url(${point.image}); width: ${iconSize}px; height: ${iconSize}px; transition: width ${animationDuration}s ease, height ${animationDuration}s ease, transform 0.2s ease;"></div>`,
          className: "",
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2],
        });
      }
      // Повертаємо простий div icon як fallback
      return L.divIcon({
        html: `<div style="width: ${iconSize}px; height: ${iconSize}px; background: #3B82F6; border-radius: 50%; border: 2px solid white;"></div>`,
        className: "",
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      });
    },
    [point.image, calculateIconSize, animationDuration]
  );

  const [markerIcon, setMarkerIcon] = useState<L.DivIcon>(() =>
    createIcon(map.getZoom())
  );

  // Оновлюємо іконку при зміні зуму
  useEffect(() => {
    const updateIcon = () => {
      const currentZoom = map.getZoom();
      const newIcon = createIcon(currentZoom);
      setMarkerIcon(newIcon);
    };

    // Вибираємо подію залежно від налаштувань
    // 'zoom' - анімація під час зуму (більш плавно, але може впливати на продуктивність)
    // 'zoomend' - анімація після завершення зуму (більш оптимально)
    const zoomEvent = animateWhileZooming ? "zoom" : "zoomend";

    map.on(zoomEvent, updateIcon);

    return () => {
      map.off(zoomEvent, updateIcon);
    };
  }, [map, createIcon, animateWhileZooming]);

  return (
    <Marker
      ref={markerRef}
      position={[point.lat, point.lng]}
      icon={markerIcon}
      eventHandlers={{
        click: () => onClick(point),
      }}
    />
  );
};

// Компонент для додавання MapLibre GL векторного шару
const MapLibreLayer: React.FC<{ useVectorTiles: boolean }> = ({
  useVectorTiles,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!useVectorTiles) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

    // Додаємо MapLibre GL як векторний шар
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maplibreLayer = (L as any).maplibreGL({
      style: {
        version: 8,
        name: "Uzhhorod Custom",
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "vector",
            url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${apiKey}`,
            minzoom: 0,
            maxzoom: 14,
          },
        },
        layers: [
          // background
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#EDEDED" },
          },
          // water
          {
            id: "water",
            type: "fill",
            source: "osm",
            "source-layer": "water",
            paint: { "fill-color": "#29626B" },
          },
          // park
          {
            id: "landuse-park",
            type: "fill",
            source: "osm",
            "source-layer": "landuse",
            filter: ["==", "class", "park"],
            paint: { "fill-color": "#d6eadf" },
          },
          // buildings
          {
            id: "building",
            type: "fill",
            source: "osm",
            "source-layer": "building",
            paint: {
              "fill-color": "#ffffff",
              "fill-outline-color": "#d3d3d3",
            },
          },

          // ---- ROADS ----
          {
            id: "road-motorway",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "motorway"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 6],
            },
          },
          {
            id: "road-primary",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "primary"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 6],
            },
          },
          {
            id: "road-secondary",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "secondary"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                0.8,
                16,
                4,
              ],
            },
          },
          {
            id: "road-tertiary",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "tertiary"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                0.8,
                16,
                4,
              ],
            },
          },
          {
            id: "road-residential",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "residential"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                0.5,
                16,
                2.5,
              ],
            },
          },
          {
            id: "road-service",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "service"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                0.4,
                16,
                1.5,
              ],
            },
          },
          {
            id: "road-track",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "track"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0.4,
                16,
                1.5,
              ],
            },
          },
          {
            id: "road-path",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "path"],
            paint: {
              "line-color": "#B5B5B5",
              "line-dasharray": [1, 1],
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0.3,
                16,
                1.2,
              ],
            },
          },
          {
            id: "road-living-street",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "living_street"],
            paint: {
              "line-color": "#B5B5B5",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0.6,
                16,
                2.5,
              ],
            },
          },
          {
            id: "road-pedestrian",
            type: "line",
            source: "osm",
            "source-layer": "transportation",
            filter: ["==", "class", "pedestrian"],
            paint: {
              "line-color": "#B5B5B5",
              "line-dasharray": [2, 1],
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0.5,
                16,
                2,
              ],
            },
          },

          // labels
          {
            id: "place-labels",
            type: "symbol",
            source: "osm",
            "source-layer": "place",
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#333333",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      attribution:
        '© <a href="https://www.maptiler.com/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    maplibreLayer.addTo(map);

    // Очищення при демонтажі
    return () => {
      if (map.hasLayer(maplibreLayer)) {
        map.removeLayer(maplibreLayer);
      }
    };
  }, [map, useVectorTiles]);

  return null;
};

const LeafletMapBox: React.FC<LeafletMapBoxProps> = ({
  initialLng = 22.2908,
  initialLat = 48.6208,
  initialZoom = 13,
  className = "",
  useVectorTiles = false,
  markerAnimationDuration = 0.2,
  markerAnimateWhileZooming = false,
  markerMinSize = 20,
  markerMaxSize = 300,
  markerScaleFactor = 0.5,
  points = [
    {
      id: "4",
      lng: 22.287,
      lat: 48.6257,
      title: "Ректорат УжНУ",
      description:
        "Центральна будівля Ужгородського національного університету",
      address: "пл. Народна, 3, Ужгород",
      image: "/rectorat.svg",
    },
    {
      id: "5",
      lng: 22.290587451062997,
      lat: 48.6355801634869,
      title: "Головна будівля УжНУ на Бамі",
      description: "Навчальний корпус УжНУ на Бульварі Академіка Мірослава",
      address: "бул. Академіка Мірослава, Ужгород",
      image: "/bam.svg",
    },
    {
      id: "6",
      lng: 22.30318262328638,
      lat: 48.620723761307296,
      title: "Фізичний факультет УжНУ",
      description:
        "Фізичний факультет Ужгородського національного університету",
      address: "вул. Волошина, 54, Ужгород",
      image: "/fizfac.svg",
    },
  ],
}) => {
  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(initialZoom);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pointContent, setPointContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [shouldCenter, setShouldCenter] = useState(false);
  const [vectorTilesEnabled, setVectorTilesEnabled] = useState(useVectorTiles);

  // Стани для контролю анімації міток
  const [animationDuration, setAnimationDuration] = useState(
    markerAnimationDuration
  );
  const [animateWhileZooming, setAnimateWhileZooming] = useState(
    markerAnimateWhileZooming
  );
  const [minSize, setMinSize] = useState(markerMinSize);
  const [maxSize, setMaxSize] = useState(markerMaxSize);
  const [scaleFactor, setScaleFactor] = useState(markerScaleFactor);

  // Додаємо CSS для анімації маркера та сірої карти
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .custom-marker {
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .custom-marker:hover {
        transform: scale(1.1);
        z-index: 1000 !important;
      }
      /* Стилі для сірої карти */
      .grayscale-map .leaflet-tile-pane {
        filter: grayscale(100%);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Обробка клавіші Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDrawerOpen]);

  const handleMapMove = (newLat: number, newLng: number, newZoom: number) => {
    setLng(parseFloat(newLng.toFixed(4)));
    setLat(parseFloat(newLat.toFixed(4)));
    setZoom(parseFloat(newZoom.toFixed(2)));
  };

  const handleMarkerClick = async (point: MapPoint) => {
    setSelectedPoint(point);
    setIsDrawerOpen(true);

    if (hasContent(point.id)) {
      setIsContentLoading(true);
      setPointContent(null);

      try {
        const content = await loadPointContent(point.id);
        setPointContent(content);
      } catch (error) {
        console.error("Помилка завантаження контенту:", error);
        setPointContent(null);
      } finally {
        setIsContentLoading(false);
      }
    } else {
      setPointContent(null);
      setIsContentLoading(false);
    }
  };

  const centerMap = () => {
    setShouldCenter(true);
  };

  const toggleDrag = () => {
    setDragEnabled(!dragEnabled);
  };

  const toggleVectorTiles = () => {
    setVectorTilesEnabled(!vectorTilesEnabled);
  };

  const toggleAnimateWhileZooming = () => {
    setAnimateWhileZooming(!animateWhileZooming);
  };

  const [showAnimationSettings, setShowAnimationSettings] = useState(false);

  return (
    <>
      <div
        className={`relative flex flex-col h-[calc(100vh-4rem)] ${className}`}
      >
        {/* macOS-style Action Bar - floating with backdrop blur */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-5xl">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-3">
            <div className="flex justify-between items-center gap-4">
              {/* Координати та статус */}
              <div className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                <span className="hidden sm:inline">
                  Довгота: {lng} | Широта: {lat} |{" "}
                </span>
                <span>Масштаб: {zoom}</span>
                {isDragging && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    • Перетягування
                  </span>
                )}
              </div>

              {/* Кнопки керування */}
              <div className="flex gap-2">
                <button
                  onClick={toggleVectorTiles}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                    vectorTilesEnabled
                      ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/30"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                  title={
                    vectorTilesEnabled
                      ? "Перемкнутись на растрові тайли"
                      : "Перемкнутись на векторні тайли"
                  }
                >
                  {vectorTilesEnabled ? "🗺️ Вектор" : "🖼️ Растр"}
                </button>
                <button
                  onClick={toggleDrag}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                    dragEnabled
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                  title={
                    dragEnabled
                      ? "Вимкнути перетягування"
                      : "Увімкнути перетягування"
                  }
                >
                  {dragEnabled ? "🖱️ Перетягування" : "🔒 Заблоковано"}
                </button>
                <button
                  onClick={centerMap}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-all shadow-sm shadow-green-500/30"
                  title="Центрувати карту"
                >
                  🎯 Центр
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Панель налаштувань анімації */}
        {showAnimationSettings && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] w-[calc(100%-2rem)] max-w-2xl">
            <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  ⚙️ Налаштування анімації міток
                </h3>
                <button
                  onClick={() => setShowAnimationSettings(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {/* Перемикач анімації під час зуму */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-900 dark:text-white block mb-1">
                      🎬 Плавна анімація під час зуму
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {animateWhileZooming
                        ? "Мітки масштабуються під час зуму (більш плавно)"
                        : "Мітки змінюються після завершення зуму"}
                    </p>
                  </div>
                  <button
                    onClick={toggleAnimateWhileZooming}
                    aria-label="Перемкнути анімацію під час зуму"
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      animateWhileZooming
                        ? "bg-blue-600"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        animateWhileZooming ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Тривалість анімації */}
                <div>
                  <label className="flex justify-between items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span>
                      Тривалість анімації: {animationDuration.toFixed(2)}с
                    </span>
                    <button
                      onClick={() => setAnimationDuration(0.2)}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Скинути
                    </button>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={animationDuration}
                    onChange={(e) =>
                      setAnimationDuration(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    aria-label="Тривалість анімації"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Миттєво (0с)</span>
                    <span>Повільно (1с)</span>
                  </div>
                </div>

                {/* Коефіцієнт масштабування */}
                <div>
                  <label className="flex justify-between items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span>
                      Швидкість зміни розміру: {scaleFactor.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setScaleFactor(0.5)}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Скинути
                    </button>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    aria-label="Швидкість зміни розміру"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Повільно (0.1)</span>
                    <span>Швидко (1.0)</span>
                  </div>
                </div>

                {/* Мінімальний розмір */}
                <div>
                  <label className="flex justify-between items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span>Мінімальний розмір: {minSize}px</span>
                    <button
                      onClick={() => setMinSize(20)}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Скинути
                    </button>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={minSize}
                    onChange={(e) => setMinSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    aria-label="Мінімальний розмір маркера"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span>100px</span>
                  </div>
                </div>

                {/* Максимальний розмір */}
                <div>
                  <label className="flex justify-between items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span>Максимальний розмір: {maxSize}px</span>
                    <button
                      onClick={() => setMaxSize(300)}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Скинути
                    </button>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="500"
                    step="10"
                    value={maxSize}
                    onChange={(e) => setMaxSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    aria-label="Максимальний розмір маркера"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>100px</span>
                    <span>500px</span>
                  </div>
                </div>

                {/* Пресети */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Швидкі пресети:
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setAnimationDuration(0);
                        setScaleFactor(0.5);
                        setAnimateWhileZooming(false);
                      }}
                      className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                    >
                      Без анімації
                    </button>
                    <button
                      onClick={() => {
                        setAnimationDuration(0.15);
                        setScaleFactor(0.5);
                        setAnimateWhileZooming(true);
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Швидка
                    </button>
                    <button
                      onClick={() => {
                        setAnimationDuration(0.3);
                        setScaleFactor(0.4);
                        setAnimateWhileZooming(true);
                      }}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      Плавна
                    </button>
                    <button
                      onClick={() => {
                        setAnimationDuration(0.5);
                        setScaleFactor(0.3);
                        setAnimateWhileZooming(true);
                      }}
                      className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                    >
                      Повільна
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={[initialLat, initialLng]}
          zoom={initialZoom}
          scrollWheelZoom={true}
          className={`flex-1 rounded-b-lg shadow-lg w-full ${
            !vectorTilesEnabled ? "grayscale-map" : ""
          }`}
          zoomControl={false}
        >
          {/* Умовне відображення: векторні тайли або растрові */}
          {vectorTilesEnabled ? (
            <MapLibreLayer useVectorTiles={vectorTilesEnabled} />
          ) : (
            <>
              {/* Варіант 1: Чорно-білі тайли від Stamen */}
              {/* <TileLayer
                  attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
                  url="https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png"
                  maxZoom={20}
                /> */}

              {/* Варіант 2: Стандартні тайли з CSS фільтром grayscale */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                className="grayscale-tiles"
              />
            </>
          )}

          <ZoomControl position="topright" />

          {points.map((point) => (
            <DynamicMarker
              key={point.id}
              point={point}
              baseZoom={initialZoom}
              onClick={handleMarkerClick}
              animationDuration={animationDuration}
              animateWhileZooming={animateWhileZooming}
              minSize={minSize}
              maxSize={maxSize}
              scaleFactor={scaleFactor}
            />
          ))}

          <MapEventHandler
            onMove={handleMapMove}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          />

          <MapController
            dragEnabled={dragEnabled}
            centerLat={initialLat}
            centerLng={initialLng}
            centerZoom={initialZoom}
            shouldCenter={shouldCenter}
            onCenterComplete={() => setShouldCenter(false)}
          />
        </MapContainer>
      </div>
      {/* Бокова панель (sidebar) */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[10000] ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Заголовок панелі */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedPoint?.title}
            </h2>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Закрити панель"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {selectedPoint?.description && (
            <p className="text-gray-600 mt-2">{selectedPoint.description}</p>
          )}
        </div>

        {/* Контент панелі */}
        <div className="p-6 overflow-y-auto h-full pb-24">
          {/* Зображення будівлі */}
          {selectedPoint?.image && (
            <div className="mb-6">
              <div className="flex justify-center">
                <div className="relative w-full h-100 bg-gray-50 rounded-lg shadow-sm transition-all group cursor-pointer">
                  <Image
                    src={selectedPoint.image}
                    alt={selectedPoint.title}
                    fill
                    className="object-contain p-6 transition-transform duration-300 group-hover:scale-115"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedPoint?.address && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Адреса
              </h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                {selectedPoint.address}
              </p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-3 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              Координати
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-800">Довгота</div>
                <div className="text-lg font-mono text-blue-900">
                  {selectedPoint?.lng.toFixed(6)}°
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-800">Широта</div>
                <div className="text-lg font-mono text-green-900">
                  {selectedPoint?.lat.toFixed(6)}°
                </div>
              </div>
            </div>
          </div>

          {/* Додаткова інформація */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-3">
              Додаткова інформація
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>ID точки:</span>
                <span className="font-mono">{selectedPoint?.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Поточний масштаб:</span>
                <span>{zoom}x</span>
              </div>
              <div className="flex justify-between">
                <span>Має контент:</span>
                <span
                  className={
                    hasContent(selectedPoint?.id || "")
                      ? "text-green-600"
                      : "text-gray-400"
                  }
                >
                  {hasContent(selectedPoint?.id || "") ? "Так" : "Ні"}
                </span>
              </div>
            </div>
          </div>

          {/* Секція з MD контентом */}
          {hasContent(selectedPoint?.id || "") && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Детальний опис
              </h3>

              {isContentLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Завантаження...</span>
                </div>
              ) : pointContent ? (
                <div
                  className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: pointContent }}
                />
              ) : (
                <div className="text-gray-500 bg-gray-50 p-4 rounded-lg">
                  Контент не вдалося завантажити
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Overlay для закриття панелі */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999]"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </>
  );
};

export default LeafletMapBox;
