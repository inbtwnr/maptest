import SvgMapBox from "@/components/SvgMapBox";

export default function SvgMapPage() {
  return (
    <div className="min-h-screen w-full flex flex-col">
      <h1 className="text-3xl font-bold py-6 text-center">
        SVG Карта Ужгорода
      </h1>

      <div className="flex-1 w-full px-4">
        <SvgMapBox className="w-full h-full" />
      </div>
    </div>
  );
}
