// Хеш-таблиця для відповідності ID точок та їх MD файлів
export const pointContentMap: Record<string, string> = {
  "1": "/content/points/uzhhorod.md",
  "2": "/content/points/nevytske-castle.md",
  "3": "/content/points/botanical-garden.md",
  "4": "/content/points/uzhnu-rectorat.md",
  "5": "/content/points/uzhnu-bam.md",
  "6": "/content/points/fizfac-uzhnu.md",
};

// Хеш-таблиця для відповідності ID точок та їх зображень
export const pointImageMap: Record<string, string> = {
  "4": "/rectorat.svg",
  "5": "/bam.svg",
  "6": "/fizfac.svg",
};

// Функція для отримання шляху до MD файлу за ID точки
export const getContentPath = (pointId: string): string | null => {
  return pointContentMap[pointId] || null;
};

// Функція для отримання шляху до зображення за ID точки
export const getImagePath = (pointId: string): string | null => {
  return pointImageMap[pointId] || null;
};

// Функція для перевірки чи існує контент для точки
export const hasContent = (pointId: string): boolean => {
  return pointId in pointContentMap;
};

// Функція для перевірки чи існує зображення для точки
export const hasImage = (pointId: string): boolean => {
  return pointId in pointImageMap;
};
