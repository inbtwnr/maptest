"use client";

import dynamic from "next/dynamic";

const LeafletMapBox = dynamic(() => import("@/components/LeafletMapBox"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg shadow-lg w-full h-[calc(100vh-250px)] min-h-[500px] flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Завантаження карти...</div>
    </div>
  ),
});

export default function LeafletPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Карта України (OpenStreetMap + Leaflet)
      </h1>

      <LeafletMapBox
        initialLng={22.3006}
        initialLat={48.6208}
        initialZoom={12}
        className="w-full"
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">🗺️ OpenStreetMap</h3>
          <p className="text-sm text-gray-600">
            Відкрита карта світу, яка створюється спільнотою волонтерів.
            Використовуйте мишу для переміщення.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">📍 Маркери</h3>
          <p className="text-sm text-gray-600">
            Клікніть на будь-який маркер на карті, щоб відкрити детальну
            інформацію про місце з можливістю перегляду контенту.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">⚙️ Керування</h3>
          <p className="text-sm text-gray-600">
            Використовуйте кнопки керування для центрування карти та управління
            перетягуванням. Натисніть ESC для закриття панелі.
          </p>
        </div>
      </div>
    </div>
  );
}
