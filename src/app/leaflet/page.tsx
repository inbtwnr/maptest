"use client";

import dynamic from "next/dynamic";

const LeafletMapBox = dynamic(() => import("@/components/LeafletMapBox"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-screen">
      <div className="flex-none p-4 bg-gray-100 rounded-t-lg">
        <div className="text-gray-500">Завантаження панелі керування...</div>
      </div>
      <div className="flex-1 rounded-b-lg shadow-lg w-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Завантаження карти...</div>
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
    />
  );
}
