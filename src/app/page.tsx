"use client";

import dynamic from "next/dynamic";

const LeafletMapBox = dynamic(() => import("@/components/LeafletMapBox"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-screen">
      <div className="flex-1 rounded-b-lg shadow-lg w-full gap-2 flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">
          Завантаження карти. Завантаження панелі керування...
        </div>
      </div>
    </div>
  ),
});

export default function LeafletPage() {
  return (
    <LeafletMapBox
      initialLng={22.3006}
      initialLat={48.6208}
      initialZoom={12}
      useVectorTiles={true}
      markerAnimateWhileZooming={true}
    />
  );
}
