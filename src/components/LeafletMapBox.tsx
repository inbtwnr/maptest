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
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { loadPointContent } from "@/lib/contentLoader";
import { loadPointsData, type MapPoint } from "@/lib/contentMapping";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import L from "leaflet";
import "@maplibre/maplibre-gl-leaflet";
import * as LucideIcons from "lucide-react";

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
  points: propsPoints,
}) => {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(initialZoom);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pointContent, setPointContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const dragEnabled = true; // Завжди дозволяємо перетягування
  const [shouldCenter, setShouldCenter] = useState(false);
  const [vectorTilesEnabled, setVectorTilesEnabled] = useState(useVectorTiles);
  const [isBuildingsMenuOpen, setIsBuildingsMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Стани для контролю анімації міток
  const animationDuration = markerAnimationDuration;
  const animateWhileZooming = markerAnimateWhileZooming;
  const minSize = markerMinSize;
  const maxSize = markerMaxSize;
  const scaleFactor = markerScaleFactor;

  // Перевірка що код виконується на клієнті
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Завантаження точок з JSON якщо вони не передані через пропси
  useEffect(() => {
    const fetchPoints = async () => {
      if (propsPoints && propsPoints.length > 0) {
        // Перевіряємо унікальність ID
        const uniquePoints = Array.from(
          new Map(propsPoints.map((p) => [p.id, p])).values()
        );
        if (uniquePoints.length !== propsPoints.length) {
          console.warn("Виявлено дублікати ID в точках:", propsPoints);
        }
        setPoints(uniquePoints);
      } else {
        const data = await loadPointsData();
        // Перевіряємо унікальність ID
        const uniquePoints = Array.from(
          new Map(data.points.map((p) => [p.id, p])).values()
        );
        if (uniquePoints.length !== data.points.length) {
          console.warn("Виявлено дублікати ID в точках:", data.points);
        }
        setPoints(uniquePoints);
      }
    };

    if (isClient) {
      fetchPoints();
    }
  }, [propsPoints, isClient]); // Додаємо CSS для анімації маркера та сірої карти
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
      /* Swiper custom styles */
      .gallery-swiper {
        padding: 0 24px 50px 24px !important;
      }
      .gallery-swiper .swiper-slide {
        padding: 4px;
      }
      .gallery-swiper .swiper-button-next,
      .gallery-swiper .swiper-button-prev {
        color: #fff;
        background: rgba(107, 114, 128, 0.85);
        backdrop-filter: blur(8px);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }
      .gallery-swiper .swiper-button-next:hover,
      .gallery-swiper .swiper-button-prev:hover {
        background: rgba(75, 85, 99, 0.95);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: scale(1.05);
      }
      .gallery-swiper .swiper-button-next:after,
      .gallery-swiper .swiper-button-prev:after {
        font-size: 12px;
        font-weight: bold;
      }
      .gallery-swiper .swiper-button-next svg,
      .gallery-swiper .swiper-button-prev svg {
        width: 16px;
        height: 16px;
      }
      .gallery-swiper .swiper-button-disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .gallery-swiper .swiper-pagination {
        bottom: 20px !important;
      }
      .gallery-swiper .swiper-pagination-bullet {
        background: #94A3B8;
        opacity: 0.6;
        width: 8px;
        height: 8px;
        transition: all 0.3s ease;
      }
      .gallery-swiper .swiper-pagination-bullet-active {
        background: #3B82F6;
        opacity: 1;
        width: 24px;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Обробка клавіш Escape та стрілок
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }

      if (lightboxOpen && selectedPoint?.gallery) {
        if (event.key === "ArrowLeft" && lightboxIndex > 0) {
          setLightboxIndex(lightboxIndex - 1);
        }
        if (
          event.key === "ArrowRight" &&
          lightboxIndex < selectedPoint.gallery.length - 1
        ) {
          setLightboxIndex(lightboxIndex + 1);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, lightboxOpen, lightboxIndex, selectedPoint]);

  const handleMapMove = (newLat: number, newLng: number, newZoom: number) => {
    setLng(parseFloat(newLng.toFixed(4)));
    setLat(parseFloat(newLat.toFixed(4)));
    setZoom(parseFloat(newZoom.toFixed(2)));
  };

  const handleMarkerClick = async (point: MapPoint) => {
    setSelectedPoint(point);
    setIsDrawerOpen(true);

    if (point.article) {
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

  const toggleVectorTiles = () => {
    setVectorTilesEnabled(!vectorTilesEnabled);
  };

  const focusOnBuilding = (point: MapPoint) => {
    setLng(point.lng);
    setLat(point.lat);
    setZoom(17); // Збільшуємо масштаб для детального перегляду
    setShouldCenter(true);
    handleMarkerClick(point); // Відкриваємо бокову панель з інформацією
    setIsBuildingsMenuOpen(false); // Закриваємо меню будівель на мобільних
  };

  // Не рендеримо карту до завантаження на клієнті
  if (!isClient) {
    return (
      <div
        className={`relative flex flex-col content-height ${className} items-center justify-center bg-gray-100`}
      >
        <div className="text-gray-500">Завантаження карти...</div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative flex flex-col content-height ${className}`}>
        {/* Кнопка бургер-меню для мобільних пристроїв */}
        <button
          onClick={() => setIsBuildingsMenuOpen(!isBuildingsMenuOpen)}
          className="md:hidden fixed below-header left-4 z-[1002] p-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Відкрити меню будівель"
        >
          <svg
            className="w-6 h-6 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isBuildingsMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Панель швидкого доступу до будівель */}
        <div
          className={`fixed left-0 w-80 sidebar-panel bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-r border-gray-200 dark:border-gray-700 z-[1001] transform transition-transform duration-300 ease-in-out overflow-hidden ${
            isBuildingsMenuOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Заголовок панелі */}
            <div className="p-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Будівлі
              </h2>
            </div>

            {/* Список будівель з прокруткою */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {points.map((point, index) => (
                <button
                  key={`building-${point.id}-${index}`}
                  onClick={() => focusOnBuilding(point)}
                  className="w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-200 overflow-hidden group hover:border-blue-500 dark:hover:border-blue-400"
                >
                  {/* Зображення будівлі */}
                  {point.image && (
                    <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <Image
                        src={point.image}
                        alt={point.title}
                        fill
                        className="bject-scale-down transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  )}

                  {/* Інформація про будівлю */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {point.title}
                    </h3>
                    {point.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {point.description}
                      </p>
                    )}
                    {point.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="line-clamp-1">{point.address}</span>
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay для закриття меню на мобільних */}
        {isBuildingsMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-[1000]"
            onClick={() => setIsBuildingsMenuOpen(false)}
          />
        )}

        {/* macOS-style Action Bar - floating with backdrop blur */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-5xl">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-4">
            <div className="flex justify-between items-center gap-6">
              {/* Координати та статус */}
              <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                <span className="hidden sm:inline">
                  Довгота: {lng} | Широта: {lat} |{" "}
                </span>
                <span>Масштаб: {zoom}</span>
              </div>

              {/* Кнопки керування */}
              <div className="flex gap-3">
                <button
                  onClick={toggleVectorTiles}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                    vectorTilesEnabled
                      ? "bg-black text-white hover:bg-slate-700 shadow-purple-500/30"
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
              </div>
            </div>
          </div>
        </div>
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

          {points.map((point, index) => (
            <DynamicMarker
              key={`marker-${point.id}-${index}`}
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
            onDragStart={() => {}}
            onDragEnd={() => {}}
          />

          <MapController
            dragEnabled={dragEnabled}
            centerLat={lat}
            centerLng={lng}
            centerZoom={zoom}
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
          {/* Основне зображення об'єкту */}
          {selectedPoint?.image && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Головне зображення
              </h3>
              <div className="flex justify-center">
                <div className="relative w-full h-100 bg-gray-50 rounded-lg shadow-sm transition-all group cursor-pointer">
                  <Image
                    src={selectedPoint.image}
                    alt={selectedPoint.title}
                    fill
                    className="object-contain p-6 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Галерея додаткових зображень - Swiper */}
          {selectedPoint?.gallery && selectedPoint.gallery.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Галерея зображень
                </div>
                <span className="text-sm text-gray-500 font-normal">
                  {selectedPoint.gallery.length} фото
                </span>
              </h3>

              {/* Swiper слайдер */}
              <div className="-mx-6">
                <Swiper
                  modules={[Navigation, Pagination]}
                  spaceBetween={12}
                  slidesPerView="auto"
                  navigation
                  pagination={{ clickable: true }}
                  mousewheel={{ forceToAxis: true }}
                  freeMode={true}
                  className="gallery-swiper"
                >
                  {selectedPoint.gallery.map((img: string, index: number) => (
                    <SwiperSlide key={`gallery-${index}`} className="!w-64">
                      <button
                        onClick={() => {
                          setLightboxOpen(true);
                          setLightboxIndex(index);
                        }}
                        className="relative w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden group cursor-pointer hover:ring-4 hover:ring-blue-400/50 hover:shadow-xl transition-all duration-300 block"
                        aria-label={`Відкрити зображення ${index + 1} з ${
                          selectedPoint.gallery?.length || 0
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${selectedPoint.title} - фото ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Номер фото */}
                        <div className="absolute top-3 right-3 bg-gradient-to-br from-black/80 to-black/70 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                          {index + 1}/{selectedPoint.gallery?.length || 0}
                        </div>
                        {/* Overlay при hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                              />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </SwiperSlide>
                  ))}
                </Swiper>
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
            <div className="grid grid-cols-2 gap-3">
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

          {/* Секція з посиланнями */}
          {selectedPoint?.links && selectedPoint.links.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                    clipRule="evenodd"
                  />
                </svg>
                Посилання
              </h3>
              <div className="space-y-2">
                {selectedPoint.links.map((link, index) => {
                  // Отримуємо компонент іконки з lucide-react
                  const iconName =
                    link.icon.charAt(0).toUpperCase() + link.icon.slice(1);
                  const IconComponent = (
                    LucideIcons as unknown as Record<
                      string,
                      React.ComponentType<{ className?: string }>
                    >
                  )[iconName];

                  return (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                      {IconComponent ? (
                        <IconComponent className="w-5 h-5 text-gray-600 group-hover:text-blue-600 flex-shrink-0" />
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-600 group-hover:text-blue-600 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span className="text-gray-700 group-hover:text-blue-700 flex-1">
                        {link.text}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Секція з MD контентом */}
          {selectedPoint?.article && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-3 flex items-center">
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

      {/* Lightbox для галереї */}
      {lightboxOpen && selectedPoint?.gallery && (
        <div
          className="fixed inset-0 bg-black/98 backdrop-blur-sm z-[20000] flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Кнопка закрити */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all duration-300 z-10 group hover:scale-110"
            aria-label="Закрити lightbox"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Кнопка "Попереднє" */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all duration-300 z-10 hover:scale-110"
              aria-label="Попереднє зображення"
            >
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Зображення */}
          <div
            className="relative w-full h-full flex items-center justify-center p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-7xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={selectedPoint.gallery[lightboxIndex]}
                alt={`${selectedPoint.title} - фото ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            {/* Лічильник + назва */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-base font-bold shadow-xl">
                {lightboxIndex + 1} / {selectedPoint.gallery.length}
              </div>
              <div className="bg-black/70 backdrop-blur-md text-white px-5 py-2 rounded-full text-sm font-medium shadow-lg max-w-md text-center">
                {selectedPoint.title}
              </div>
            </div>
          </div>

          {/* Кнопка "Наступне" */}
          {lightboxIndex < selectedPoint.gallery.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all duration-300 z-10 hover:scale-110"
              aria-label="Наступне зображення"
            >
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default LeafletMapBox;
