/**
 * Утиліта для роботи з шляхами в проєкті
 * Підтримує basePath для статичного експорту
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Отримує повний шлях до публічного ресурсу
 * @param path - відносний шлях до файлу (починається без /)
 * @returns повний шлях з урахуванням basePath
 *
 * @example
 * getPublicPath("data/points.json") // "/data/points.json" або "/maptest/data/points.json"
 */
export function getPublicPath(path: string): string {
  // Видаляємо початковий слеш якщо є
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_PATH}/${cleanPath}`;
}

/**
 * Отримує повний шлях до сторінки
 * @param path - відносний шлях до сторінки
 * @returns повний шлях з урахуванням basePath
 *
 * @example
 * getPagePath("/") // "/" або "/maptest/"
 * getPagePath("/leaflet") // "/leaflet" або "/maptest/leaflet"
 */
export function getPagePath(path: string): string {
  if (path === "/") {
    return BASE_PATH || "/";
  }
  return `${BASE_PATH}${path}`;
}

/**
 * Експортуємо BASE_PATH для використання в компонентах
 */
export { BASE_PATH };
