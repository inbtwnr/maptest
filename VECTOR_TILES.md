# MapLibre GL Векторні Тайли в Leaflet

## 📋 Огляд

Додано підтримку векторних тайлів MapLibre GL у компонент LeafletMapBox. Тепер карта може відображатися як у растровому (стандартні OSM тайли), так і у векторному форматі з кастомними стилями.

## 🎯 Основні переваги векторних тайлів

- ✅ **Швидкість**: Векторні тайли швидше завантажуються і відображаються
- ✅ **Якість**: Чітке відображення на будь-якій роздільній здатності (масштабування без втрати якості)
- ✅ **Кастомізація**: Повний контроль над стилями через JSON конфігурацію
- ✅ **Розмір**: Менший розмір даних порівняно з растровими зображеннями
- ✅ **Інтерактивність**: Можливість додавати події на окремі елементи карти

## 🛠️ Технічний стек

- **Leaflet**: Основна бібліотека для карт
- **MapLibre GL**: Рендерінг векторних тайлів
- **@maplibre/maplibre-gl-leaflet**: Інтеграція MapLibre в Leaflet
- **OpenStreetMap**: Джерело даних

## 📦 Встановлені пакети

```bash
npm install maplibre-gl @maplibre/maplibre-gl-leaflet
```

## 🗂️ Структура файлів

```
public/
  styles/
    osm-styles.json     # Стилі для векторної карти

src/
  components/
    LeafletMapBox.tsx   # Основний компонент з підтримкою векторних тайлів
  app/
    leaflet/
      page.tsx          # Сторінка з прикладом використання
```

## 🎨 Конфігурація стилів (osm-styles.json)

Файл містить MapLibre GL Style Specification:

- **version**: 8 (версія специфікації)
- **sources**: Джерела векторних тайлів (OpenMapTiles)
- **layers**: Шари карти (фон, вода, парки, будівлі, дороги, підписи)

### Приклад шару води:

```json
{
  "id": "water",
  "type": "fill",
  "source": "osm",
  "source-layer": "water",
  "paint": {
    "fill-color": "#a8c9ff",
    "fill-outline-color": "#7fa8e5"
  }
}
```

## 🚀 Використання

### Базове використання

```tsx
import LeafletMapBox from "@/components/LeafletMapBox";

export default function Page() {
  return (
    <LeafletMapBox
      initialLng={22.3006}
      initialLat={48.6208}
      initialZoom={12}
      useVectorTiles={true} // Увімкнути векторні тайли
    />
  );
}
```

### Проп `useVectorTiles`

- `true` - використовувати векторні тайли з MapLibre GL
- `false` (за замовчуванням) - використовувати растрові тайли OSM

### Перемикання в runtime

Компонент має вбудовану кнопку "🗺️ Вектор / 🖼️ Растр" для перемикання між режимами без перезавантаження сторінки.

## 🎛️ Компонент MapLibreLayer

Внутрішній компонент, який додає векторний шар до Leaflet карти:

```tsx
const MapLibreLayer: React.FC<{ useVectorTiles: boolean }> = ({
  useVectorTiles,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!useVectorTiles) return;

    const maplibreLayer = (L as any).maplibreGL({
      style: "/styles/osm-styles.json",
      attribution: "© OpenStreetMap contributors",
    });

    maplibreLayer.addTo(map);

    return () => {
      if (map.hasLayer(maplibreLayer)) {
        map.removeLayer(maplibreLayer);
      }
    };
  }, [map, useVectorTiles]);

  return null;
};
```

## 🎨 Налаштування стилів

Для зміни вигляду карти відредагуйте `/public/styles/osm-styles.json`:

### Зміна кольору води:

```json
{
  "id": "water",
  "paint": {
    "fill-color": "#YOUR_COLOR"
  }
}
```

### Додавання нового шару:

```json
{
  "id": "custom-layer",
  "type": "fill",
  "source": "osm",
  "source-layer": "landcover",
  "filter": ["==", "class", "forest"],
  "paint": {
    "fill-color": "#green"
  }
}
```

## 📊 Доступні типи шарів

- `background` - фоновий колір
- `fill` - заповнення полігонів
- `line` - лінії (дороги, кордони)
- `symbol` - текст та іконки
- `raster` - растрові зображення
- `circle` - кола (точки інтересу)

## 🔗 Корисні посилання

- [MapLibre GL Style Specification](https://maplibre.org/maplibre-style-spec/)
- [OpenMapTiles Schema](https://openmaptiles.org/schema/)
- [Leaflet Documentation](https://leafletjs.com/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)

## 🐛 Відомі обмеження

1. **TypeScript**: `maplibreGL` не має офіційних типів, тому використовується `any`
2. **SSR**: Компонент потребує `ssr: false` в Next.js dynamic import
3. **Перезавантаження**: При зміні стилю потрібно перезавантажити карту (компонент це робить автоматично)

## 🎯 Наступні кроки

- [ ] Додати більше попередньо налаштованих стилів
- [ ] Реалізувати збереження вибору користувача (localStorage)
- [ ] Додати 3D будівлі (extrusion)
- [ ] Інтеграція з Mapbox API для додаткових можливостей
- [ ] Оптимізація продуктивності для мобільних пристроїв
