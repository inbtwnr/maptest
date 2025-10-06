import MapBox from "@/components/MapBox";

export default function MapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Карта України</h1>

      <MapBox
        initialLng={22.3006}
        initialLat={48.6208}
        initialZoom={12}
        className="w-full"
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">🗺️ Навігація</h3>
          <p className="text-sm text-gray-600">
            Використовуйте мишу для переміщення карти. Прокручуйте для зміни
            масштабу.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">📍 Маркери</h3>
          <p className="text-sm text-gray-600">
            Клікніть на будь-який маркер на карті, щоб відкрити детальну
            інформацію про місце.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">⚙️ Налаштування</h3>
          <p className="text-sm text-gray-600">
            Використовуйте контроли навігації у правому верхньому куті карти.
          </p>
        </div>
      </div>
    </div>
  );
}
