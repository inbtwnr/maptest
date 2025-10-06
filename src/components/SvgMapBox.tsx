"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  ReactSVGPanZoom,
  TOOL_NONE,
  TOOL_PAN,
  TOOL_ZOOM_IN,
  TOOL_ZOOM_OUT,
  Value,
  Tool,
} from "react-svg-pan-zoom";
import { loadPointContent } from "@/lib/contentLoader";
import { hasContent } from "@/lib/contentMapping";

interface SvgMarker {
  id: string;
  x: number;
  y: number;
  title: string;
  description?: string;
  address?: string;
  image?: string;
}

interface SvgMapBoxProps {
  className?: string;
  initialMarkers?: SvgMarker[];
}

const SvgMapBox: React.FC<SvgMapBoxProps> = ({
  className = "",
  initialMarkers = [
    {
      id: "4",
      x: 1330,
      y: 880,
      title: "Ректорат УжНУ",
      description: "Центральний навчальний корпус університету",
      address: "вул. Університетська, Ужгород",
      image: "/rectorat.svg",
    },
    {
      id: "5",
      x: 1400,
      y: 670,
      title: "УжНУ - Бам",
      description: "Корпус УжНУ на Бульварі Академіка Мірослава",
      address: "бул. Академіка Мірослава, Ужгород",
      image: "/bam.svg",
    },
    {
      id: "6",
      x: 1650,
      y: 1000,
      title: "Фізичний факультет УжНУ",
      description: "Фізико-математичний факультет університету",
      address: "вул. Підгірна, Ужгород",
      image: "/fizfac.svg",
    },
  ],
}) => {
  const viewerRef = useRef<ReactSVGPanZoom>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>(TOOL_NONE);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Початковий масштаб та центрування
  const initialScale = 0.5;
  const initialWidth = 800;
  const initialHeight = 600;
  const svgWidth = 3039;
  const svgHeight = 2179;

  const [value, setValue] = useState<Value>({
    version: 2,
    mode: "idle",
    focus: false,
    a: initialScale,
    b: 0,
    c: 0,
    d: initialScale,
    // Формула: e = -(svgWidth * scale / 2) + (viewerWidth / 2)
    e: -((svgWidth * initialScale) / 2) + initialWidth / 2,
    // Формула: f = -(svgHeight * scale / 2) + (viewerHeight / 2)
    f: -((svgHeight * initialScale) / 2) + initialHeight / 2,
    viewerWidth: initialWidth,
    viewerHeight: initialHeight,
    SVGWidth: svgWidth,
    SVGHeight: svgHeight,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
    miniatureOpen: false,
  });
  const [markers, setMarkers] = useState<SvgMarker[]>(initialMarkers);
  const [selectedMarker, setSelectedMarker] = useState<SvgMarker | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [markerContent, setMarkerContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);

  // Handle SVG click for adding markers
  const handleSvgClick = useCallback(
    (event: React.MouseEvent<SVGElement>) => {
      if (!isAddingMarker) return;

      // Get click coordinates relative to the SVG
      const svgElement = event.currentTarget as SVGSVGElement;
      const rect = svgElement.getBoundingClientRect();

      // Calculate relative position within the SVG
      const x = ((event.clientX - rect.left) / rect.width) * 3039;
      const y = ((event.clientY - rect.top) / rect.height) * 2179;

      const newMarker: SvgMarker = {
        id: Date.now().toString(),
        x: x,
        y: y,
        title: `Мітка ${markers.length + 1}`,
        description: "Нова мітка на карті",
        address: "Ужгород",
      };

      setMarkers([...markers, newMarker]);
      setIsAddingMarker(false);
    },
    [isAddingMarker, markers]
  );

  // Handle marker click
  const handleMarkerClick = useCallback(
    async (marker: SvgMarker, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedMarker(marker);
      setIsDrawerOpen(true);

      // Load content for marker if it exists
      if (hasContent(marker.id)) {
        setIsContentLoading(true);
        setMarkerContent(null);

        try {
          const content = await loadPointContent(marker.id);
          setMarkerContent(content);
        } catch (error) {
          console.error("Помилка завантаження контенту:", error);
          setMarkerContent(null);
        } finally {
          setIsContentLoading(false);
        }
      } else {
        setMarkerContent(null);
        setIsContentLoading(false);
      }
    },
    []
  );

  // Tool controls
  const enablePan = () => setTool(TOOL_PAN);
  const enableNone = () => setTool(TOOL_NONE);

  const zoomIn = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomOnViewerCenter(1.1);
    }
  };

  const zoomOut = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomOnViewerCenter(0.9);
    }
  };

  const resetView = () => {
    if (viewerRef.current) {
      // Початковий масштаб для скидання
      const resetScale = 0.5;

      // Центруємо карту з правильними формулами
      // e = -(svgWidth * scale / 2) + (viewerWidth / 2)
      const centerX = -((svgWidth * resetScale) / 2) + dimensions.width / 2;
      // f = -(svgHeight * scale / 2) + (viewerHeight / 2)
      const centerY = -((svgHeight * resetScale) / 2) + dimensions.height / 2;

      setValue({
        version: 2,
        mode: "idle",
        focus: false,
        a: resetScale,
        b: 0,
        c: 0,
        d: resetScale,
        e: centerX,
        f: centerY,
        viewerWidth: dimensions.width,
        viewerHeight: dimensions.height,
        SVGWidth: svgWidth,
        SVGHeight: svgHeight,
        startX: null,
        startY: null,
        endX: null,
        endY: null,
        miniatureOpen: false,
      });
    }
  };

  const centerView = () => {
    if (viewerRef.current) {
      viewerRef.current.fitToViewer();
    }
  };

  // Delete marker
  const deleteMarker = (markerId: string) => {
    setMarkers(markers.filter((m) => m.id !== markerId));
    setIsDrawerOpen(false);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else if (isAddingMarker) {
          setIsAddingMarker(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDrawerOpen, isAddingMarker]);

  // Handle responsive resizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(400, rect.width);
        const newHeight = Math.max(300, window.innerHeight - 200); // Account for header and controls

        setDimensions({ width: newWidth, height: newHeight });

        setValue((prev) => {
          // Пересчитуємо центрування при зміні розмірів
          const newE = -((svgWidth * prev.a) / 2) + newWidth / 2;
          const newF = -((svgHeight * prev.d) / 2) + newHeight / 2;

          return {
            ...prev,
            viewerWidth: newWidth,
            viewerHeight: newHeight,
            e: newE,
            f: newF,
          };
        });
      }
    };

    // Initial update
    updateDimensions();

    // Add resize listener
    window.addEventListener("resize", updateDimensions);

    // Use ResizeObserver if available for more precise container tracking
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className={`${className} flex flex-col h-full`}>
        {/* Info panel */}
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-600 flex justify-between items-center">
            <span>
              Поточний інструмент:{" "}
              {tool === TOOL_NONE
                ? "Вибір"
                : tool === TOOL_PAN
                ? "🖱️ Перетягування"
                : tool === TOOL_ZOOM_IN
                ? "🔍+ Приближення"
                : tool === TOOL_ZOOM_OUT
                ? "🔍- Віддалення"
                : "Невідомо"}
              {value.mode === "panning" && (
                <span className="ml-2 text-blue-600">
                  • Активне переміщення
                </span>
              )}
            </span>
            <span>Міток: {markers.length}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={enableNone}
            className={`px-3 py-1 rounded text-sm ${
              tool === TOOL_NONE
                ? "bg-blue-600 text-white"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          >
            Вибір
          </button>
          <button
            onClick={enablePan}
            className={`px-3 py-1 rounded text-sm ${
              tool === TOOL_PAN
                ? "bg-blue-600 text-white"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          >
            Перетягування
          </button>
          <button
            onClick={zoomIn}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            + Збільшити
          </button>
          <button
            onClick={zoomOut}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            - Зменшити
          </button>
          <button
            onClick={centerView}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            🎯 Центр
          </button>
          <button
            onClick={resetView}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            🔄 Скинути
          </button>
        </div>

        {/* SVG Pan Zoom Viewer */}
        <div className="flex-1 w-full border-2 border-gray-300 rounded-lg overflow-hidden">
          <ReactSVGPanZoom
            ref={viewerRef}
            width={dimensions.width}
            height={dimensions.height}
            tool={isAddingMarker ? TOOL_NONE : tool}
            onChangeTool={setTool}
            value={value}
            onChangeValue={setValue}
            background="#f8f9fa"
            miniatureProps={{
              position: "right",
              background: "#ffffff",
              width: 120,
              height: 90,
            }}
            toolbarProps={{ position: "none" }}
            detectAutoPan={false}
          >
            <svg width={3039} height={2179} viewBox="0 0 3039 2179">
              {/* Base SVG Map from file */}
              <image
                href="/uzhhorod-map.svg"
                x="0"
                y="0"
                width="3039"
                height="2179"
                preserveAspectRatio="none"
              />

              {/* Markers */}
              {markers.map((marker) => (
                <g key={marker.id}>
                  {/* Building image if available */}
                  {marker.image && (
                    <image
                      href={marker.image}
                      x={marker.x - 30}
                      y={marker.y - 70}
                      width="60"
                      height="60"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => handleMarkerClick(marker, e)}
                    />
                  )}
                  {/* Marker pin */}
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="8"
                    fill="#3B82F6"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:fill-blue-700 transition-colors"
                    onClick={(e) => handleMarkerClick(marker, e)}
                  />
                  {/* Marker label */}
                  <text
                    x={marker.x}
                    y={marker.y - 15}
                    textAnchor="middle"
                    className="fill-gray-800 text-xs font-medium pointer-events-none select-none"
                  >
                    {marker.title}
                  </text>
                </g>
              ))}

              {/* Click area for adding markers */}
              {isAddingMarker && (
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="transparent"
                  className="cursor-crosshair"
                  onClick={handleSvgClick}
                />
              )}
            </svg>
          </ReactSVGPanZoom>
        </div>
      </div>

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedMarker?.title}
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
          {selectedMarker?.description && (
            <p className="text-gray-600 mt-2">{selectedMarker.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full pb-24">
          {/* Image if available */}
          {selectedMarker?.image && (
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
                Зображення будівлі
              </h3>
              <div className="flex justify-center">
                <div className="relative w-full h-80 bg-white rounded-lg shadow-md border-2 border-gray-200">
                  <Image
                    src={selectedMarker.image}
                    alt={selectedMarker.title}
                    fill
                    className="object-contain p-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {selectedMarker?.address && (
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
                {selectedMarker.address}
              </p>
            </div>
          )}

          {/* Coordinates */}
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
              Координати на карті
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-800">X</div>
                <div className="text-lg font-mono text-blue-900">
                  {selectedMarker?.x.toFixed(1)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-800">Y</div>
                <div className="text-lg font-mono text-green-900">
                  {selectedMarker?.y.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-3">
              Додаткова інформація
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>ID мітки:</span>
                <span className="font-mono">{selectedMarker?.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Поточний інструмент:</span>
                <span>
                  {tool === TOOL_NONE
                    ? "Вибір"
                    : tool === TOOL_PAN
                    ? "Перетягування"
                    : tool === TOOL_ZOOM_IN
                    ? "Приближення"
                    : tool === TOOL_ZOOM_OUT
                    ? "Віддалення"
                    : "Невідомо"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Має контент:</span>
                <span
                  className={
                    hasContent(selectedMarker?.id || "")
                      ? "text-green-600"
                      : "text-gray-400"
                  }
                >
                  {hasContent(selectedMarker?.id || "") ? "Так" : "Ні"}
                </span>
              </div>
            </div>
          </div>

          {/* Content section */}
          {hasContent(selectedMarker?.id || "") && (
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
              ) : markerContent ? (
                <div
                  className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: markerContent }}
                />
              ) : (
                <div className="text-gray-500 bg-gray-50 p-4 rounded-lg">
                  Контент не вдалося завантажити
                </div>
              )}
            </div>
          )}

          {/* Delete button for custom markers */}
          {selectedMarker && !["1", "2"].includes(selectedMarker.id) && (
            <div className="mt-6">
              <button
                onClick={() => deleteMarker(selectedMarker.id)}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Видалити мітку
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </>
  );
};

export default SvgMapBox;
