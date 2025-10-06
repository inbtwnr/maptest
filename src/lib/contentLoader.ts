import { marked } from "marked";
import { getContentPath } from "./contentMapping";

// Кеш для збереження завантажених MD файлів
const contentCache = new Map<string, string>();

/**
 * Завантажує та парсить Markdown файл для конкретної точки
 * @param pointId - ID точки на карті
 * @returns Promise з HTML контентом або null якщо файл не знайдено
 */
export async function loadPointContent(
  pointId: string
): Promise<string | null> {
  const contentPath = getContentPath(pointId);

  if (!contentPath) {
    console.warn(`Контент для точки ${pointId} не знайдено`);
    return null;
  }

  // Перевіряємо кеш
  if (contentCache.has(pointId)) {
    return contentCache.get(pointId)!;
  }

  try {
    // Завантажуємо MD файл
    const response = await fetch(contentPath);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const markdownContent = await response.text();

    // Парсимо Markdown в HTML
    const htmlContent = await marked(markdownContent);

    // Зберігаємо в кеш
    contentCache.set(pointId, htmlContent);

    return htmlContent;
  } catch (error) {
    console.error(`Помилка завантаження контенту для точки ${pointId}:`, error);
    return null;
  }
}

/**
 * Очищає кеш контенту
 */
export function clearContentCache(): void {
  contentCache.clear();
}

/**
 * Перевіряє чи є контент в кеші
 * @param pointId - ID точки
 * @returns true якщо контент є в кеші
 */
export function isContentCached(pointId: string): boolean {
  return contentCache.has(pointId);
}
