# MapTest - Додаток з Mapbox картою

Це демонстраційний Next.js додаток, який показує, як інтегрувати інтерактивну карту Mapbox у ваш проект.

## 🚀 Швидкий старт

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Налаштування Mapbox Access Token

1. Зареєструйтеся або увійдіть на [mapbox.com](https://www.mapbox.com/)
2. Створіть новий проект і отримайте безкоштовний Access Token
3. Створіть файл `.env.local` в корені проекту (якщо його ще немає)
4. Додайте ваш токен:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=ваш_токен_тут
```

### 3. Запуск додатку

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) у вашому браузері.

## 📁 Структура проекту

```
src/
├── app/
│   ├── layout.tsx          # Головний layout з навігацією
│   ├── page.tsx            # Головна сторінка
│   └── map/
│       └── page.tsx        # Сторінка з картою
└── components/
    ├── MapBox.tsx          # Компонент Mapbox карти
    └── Navigation.tsx      # Навігаційне меню
```

## 🗺️ Функціональність

- **Інтерактивна карта**: Повноцінна Mapbox карта з можливістю навігації
- **Responsive дизайн**: Адаптивний інтерфейс для різних пристроїв
- **Контроли навігації**: Кнопки масштабування та обертання
- **Відображення координат**: Реальний час координат та масштабу
- **Маркер**: Маркер на початковій позиції (Київ)

## 🛠️ Технології

- **Next.js 15** - React framework
- **TypeScript** - Статична типізація
- **Tailwind CSS** - Стилізація
- **Mapbox GL JS** - Інтерактивні карти
- **React Map GL** - React wrapper для Mapbox

## 📝 Кастомізація

### Зміна початкової позиції карти

Відредагуйте файл `src/app/map/page.tsx`:

```tsx
<MapBox
  initialLng={30.5234} // Довгота
  initialLat={50.4501} // Широта
  initialZoom={6} // Масштаб
  style={{ width: "100%", height: "600px" }}
/>
```

### Зміна стилю карти

У файлі `src/components/MapBox.tsx` змініть параметр `style`:

```tsx
style: 'mapbox://styles/mapbox/satellite-v9', // Супутниковий вигляд
// або
style: 'mapbox://styles/mapbox/dark-v10',     // Темна тема
```

## 🔧 Розробка

Проект створено з використанням:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

## 📄 Ліцензія

MIT License
