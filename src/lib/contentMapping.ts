// Інтерфейс для точки на карті
export interface MapPoint {
  id: string;
  lng: number;
  lat: number;
  title: string;
  description?: string;
  address?: string;
  image?: string;
  contentFile?: string;
}

// Інтерфейс для JSON файлу з точками
interface PointsData {
  points: MapPoint[];
}

// Кеш для збереження завантажених даних
let pointsDataCache: PointsData | null = null;

/**
 * Завантажує дані про точки з JSON файлу
 */
export async function loadPointsData(): Promise<PointsData> {
  if (pointsDataCache) {
    return pointsDataCache;
  }

  try {
    const response = await fetch("/data/points.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    pointsDataCache = await response.json();
    return pointsDataCache!;
  } catch (error) {
    console.error("Помилка завантаження даних про точки:", error);
    return { points: [] };
  }
}

/**
 * Очищує кеш даних про точки
 */
export function clearPointsDataCache(): void {
  pointsDataCache = null;
}

// Функція для отримання шляху до MD файлу за ID точки
export const getContentPath = async (
  pointId: string
): Promise<string | null> => {
  const data = await loadPointsData();
  const point = data.points.find((p) => p.id === pointId);
  return point?.contentFile || null;
};

// Функція для отримання шляху до зображення за ID точки
export const getImagePath = async (pointId: string): Promise<string | null> => {
  const data = await loadPointsData();
  const point = data.points.find((p) => p.id === pointId);
  return point?.image || null;
};

// Функція для перевірки чи існує контент для точки
export const hasContent = async (pointId: string): Promise<boolean> => {
  const data = await loadPointsData();
  const point = data.points.find((p) => p.id === pointId);
  return !!point?.contentFile;
};

// Функція для перевірки чи існує зображення для точки
export const hasImage = async (pointId: string): Promise<boolean> => {
  const data = await loadPointsData();
  const point = data.points.find((p) => p.id === pointId);
  return !!point?.image;
};
