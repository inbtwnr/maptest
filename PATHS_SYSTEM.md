# Зміни системи шляхів (Paths System)

## Проблема

Раніше в проєкті використовувалися абсолютні шляхи (що починаються з `/`), що унеможливлювало деплой на subpath (наприклад, GitHub Pages з `/repository-name/`).

## Рішення

Створено систему динамічних шляхів, яка підтримує як деплой у корінь домену, так і на subpath.

### Що змінено:

#### 1. **next.config.ts**

Додано підтримку `assetPrefix`:

```typescript
assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
```

#### 2. **Новий файл: src/lib/paths.ts**

Створено утиліти для роботи зі шляхами:

- `getPublicPath(path)` - для статичних ресурсів (зображення, JSON, SVG)
- `getPagePath(path)` - для навігації між сторінками
- `BASE_PATH` - експорт базового шляху

#### 3. **Оновлені файли:**

**src/components/Navigation.tsx**

- Додано імпорт `getPagePath`
- Змінено `href="/"` на `href={getPagePath("/")}`

**src/lib/contentMapping.ts**

- Додано імпорт `getPublicPath`
- Змінено `fetch("/data/points.json")` на `fetch(getPublicPath("data/points.json"))`

**src/components/SvgMapBox.tsx**

- Додано імпорт `getPublicPath`
- Змінено `href="/uzhhorod-map.svg"` на `href={getPublicPath("uzhhorod-map.svg")}`
- Оновлено рендеринг маркерів для використання `getPublicPath`
- Оновлено компонент Image для використання `getPublicPath`

#### 4. **Створено .env.local.example**

Приклад конфігурації для різних випадків деплою.

## Як використовувати

### Деплой у корінь домену (domain.com)

Створіть `.env.local`:

```bash
NEXT_PUBLIC_BASE_PATH=
```

або просто не створюйте файл - порожнє значення за замовчуванням.

### Деплой на subpath (domain.com/maptest)

Створіть `.env.local`:

```bash
NEXT_PUBLIC_BASE_PATH=/maptest
```

### Використання в коді

**Для статичних ресурсів (public/):**

```typescript
import { getPublicPath } from "@/lib/paths";

// Замість: src="/data/file.json"
src={getPublicPath("data/file.json")}

// Замість: href="/image.svg"
href={getPublicPath("image.svg")}
```

**Для навігації:**

```typescript
import { getPagePath } from "@/lib/paths";

// Замість: href="/about"
<Link href={getPagePath("/about")}>
```

## Переваги

- ✅ Підтримка деплою на будь-який subpath
- ✅ Сумісність з GitHub Pages, Vercel, Netlify
- ✅ Єдина точка конфігурації
- ✅ Легко перемикатися між різними середовищами
- ✅ Всі шляхи відносні до BASE_PATH

## Важливо

У файлі `public/data/points.json` всі шляхи до зображень та контенту вже є відносними (без `/` на початку), що правильно працює з новою системою.
