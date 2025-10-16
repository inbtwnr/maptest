"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { loadPointContent } from "@/lib/contentLoader";
import { loadPointsData, type MapPoint } from "@/lib/contentMapping";
// Видаляємо імпорт drawer, створимо власну бокову панель

// Отримуємо токен із змінних середовища
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface MapBoxProps {
  initialLng?: number;
  initialLat?: number;
  initialZoom?: number;
  className?: string;
  points?: MapPoint[];
}

const MapBox: React.FC<MapBoxProps> = ({
  initialLng = 22.2908, // Центр Ужгорода
  initialLat = 48.6208,
  initialZoom = 13,
  className = "",
  points: propsPoints,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [points, setPoints] = useState<MapPoint[]>(propsPoints || []);
  const [lng, setLng] = useState(initialLng);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(initialZoom);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pointContent, setPointContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);

  // Завантаження точок з JSON якщо вони не передані через пропси
  useEffect(() => {
    const fetchPoints = async () => {
      if (!propsPoints || propsPoints.length === 0) {
        const data = await loadPointsData();
        setPoints(data.points);
      }
    };
    fetchPoints();
  }, [propsPoints]);

  useEffect(() => {
    if (map.current) return; // Ініціалізувати карту тільки один раз

    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_access_token_here") {
      console.error(
        "Mapbox access token не встановлено. Додайте токен у файл .env.local"
      );
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: zoom,
      dragPan: dragEnabled, // Додаємо контроль перетягування
      dragRotate: false, // Вимикаємо обертання
      pitchWithRotate: false, // Вимикаємо нахил
      touchZoomRotate: false, // Вимикаємо обертання на дотик
    });

    // Додаємо контроли навігації
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Центруємо карту при завантаженні
    map.current.on("load", () => {
      if (map.current) {
        // Центруємо карту з анімацією
        map.current.flyTo({
          center: [lng, lat],
          zoom: zoom,
          duration: 1000,
        });
      }
    });

    // Додаємо обробники для drag events
    map.current.on("dragstart", () => {
      setIsDragging(true);
    });

    map.current.on("dragend", () => {
      setIsDragging(false);
    });

    // Оновлюємо координати при переміщенні карти
    map.current.on("move", () => {
      if (map.current) {
        setLng(parseFloat(map.current.getCenter().lng.toFixed(4)));
        setLat(parseFloat(map.current.getCenter().lat.toFixed(4)));
        setZoom(parseFloat(map.current.getZoom().toFixed(2)));
      }
    });

    // Додаємо маркери для всіх точок
    points.forEach((point) => {
      let marker;

      if (point.image) {
        // Створюємо кастомний маркер з зображенням будівлі
        const container = document.createElement("div");
        container.style.width = "160px";
        container.style.height = "160px";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";

        const el = document.createElement("div");
        el.style.width = "180px";
        el.style.height = "180px";
        el.style.backgroundImage = `url(${point.image})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundRepeat = "no-repeat";
        el.style.backgroundPosition = "center";
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
        el.style.transformOrigin = "center center";

        // Додаємо ефект збільшення при наведенні
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.1)";
          el.style.zIndex = "1000";
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
          el.style.zIndex = "auto";
        });

        container.appendChild(el);

        marker = new mapboxgl.Marker({
          element: container,
          anchor: "center",
        })
          .setLngLat([point.lng, point.lat])
          .addTo(map.current!);
      } else {
        // Стандартний маркер для точок без зображення
        marker = new mapboxgl.Marker({ color: "#3B82F6" })
          .setLngLat([point.lng, point.lat])
          .addTo(map.current!);
      }

      // Додаємо обробку кліку на маркер
      marker.getElement().addEventListener("click", async () => {
        setSelectedPoint(point);
        setIsDrawerOpen(true);

        // Завантажуємо контент для точки якщо він є
        if (point.contentFile) {
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
      });

      // Додаємо курсор pointer при наведенні
      marker.getElement().style.cursor = "pointer";
    });
  }, [lng, lat, zoom, points, dragEnabled]);

  // Додаємо обробку клавіші Escape для закриття панелі
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDrawerOpen]);

  // Функції для керування картою
  const centerMap = () => {
    if (map.current) {
      map.current.flyTo({
        center: [initialLng, initialLat],
        zoom: initialZoom,
        duration: 1000,
      });
    }
  };

  const toggleDrag = () => {
    if (map.current) {
      const newDragEnabled = !dragEnabled;
      setDragEnabled(newDragEnabled);

      if (newDragEnabled) {
        map.current.dragPan.enable();
      } else {
        map.current.dragPan.disable();
      }
    }
  };

  return (
    <>
      <div className={className}>
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Довгота: {lng} | Широта: {lat} | Масштаб: {zoom}
              {isDragging && (
                <span className="ml-2 text-blue-600">• Перетягування</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleDrag}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  dragEnabled
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                title="Центрувати карту"
              >
                🎯 Центр
              </button>
            </div>
          </div>
        </div>
        <div
          ref={mapContainer}
          className="rounded-lg shadow-lg w-full h-[calc(100vh-250px)] min-h-[500px]"
        />
      </div>

      {/* Бокова панель (sidebar) */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
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
          {/* Галерея зображень */}
          {selectedPoint?.gallery && selectedPoint.gallery.length > 0 && (
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
                Галерея зображень
              </h3>
              <div className="rounded-lg overflow-hidden shadow-md">
                <ImageGallery
                  items={selectedPoint.gallery.map((img: string) => ({
                    original: img,
                    thumbnail: img,
                    originalAlt: selectedPoint.title,
                    thumbnailAlt: selectedPoint.title,
                  }))}
                  showPlayButton={false}
                  showFullscreenButton={true}
                  showThumbnails={true}
                  showNav={true}
                  slideDuration={450}
                  slideInterval={3000}
                />
              </div>
            </div>
          )}

          {/* Fallback to single image if no gallery */}
          {!selectedPoint?.gallery && selectedPoint?.image && (
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
                    selectedPoint?.contentFile
                      ? "text-green-600"
                      : "text-gray-400"
                  }
                >
                  {selectedPoint?.contentFile ? "Так" : "Ні"}
                </span>
              </div>
            </div>
          </div>

          {/* Секція з MD контентом */}
          {selectedPoint?.contentFile && (
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
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </>
  );
};

export default MapBox;
