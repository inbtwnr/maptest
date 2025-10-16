# Система динамічної висоти Header

## Опис

Замість хардкодних значень типу `calc(100vh - 4rem)` або `calc(100vh - 6rem)`, тепер використовується CSS змінна `--header-height`, яка визначає висоту header'а і автоматично застосовується до всіх залежних компонентів.

## CSS Змінна

```css
:root {
  --header-height: 4rem; /* 64px */
}
```

## CSS Класи

### `.header-height`

Висота header'а

```css
.header-height {
  height: var(--header-height);
}
```

### `.content-height`

Висота контенту (viewport мінус header)

```css
.content-height {
  height: calc(100vh - var(--header-height));
}
```

### `.sidebar-panel`

Бокова панель, що починається під header'ом і займає решту висоти

```css
.sidebar-panel {
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
}
```

### `.below-header`

Позиціонування елементів трохи нижче header'а (з відступом 1rem)

```css
.below-header {
  top: calc(var(--header-height) + 1rem);
}
```

## Використання

### Navigation Component

```tsx
<nav className="bg-white shadow-sm border-b header-height">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
    <div className="flex justify-between items-center h-full">
      {/* content */}
    </div>
  </div>
</nav>
```

### Map Container

```tsx
<div className={`relative flex flex-col content-height ${className}`}>
  {/* map content */}
</div>
```

### Sidebar Panel

```tsx
<div className={`fixed left-0 w-80 sidebar-panel ${/* other classes */}`}>
  {/* sidebar content */}
</div>
```

### Burger Menu Button

```tsx
<button className="md:hidden fixed below-header left-4 z-[1002] /* other classes */">
  {/* burger icon */}
</button>
```

## Переваги

1. **Єдине джерело правди**: Висота header'а визначається в одному місці
2. **Легка підтримка**: Зміна висоти header'а потребує редагування тільки одного значення
3. **Консистентність**: Всі компоненти автоматично адаптуються до зміни висоти
4. **Чистий код**: Без хардкодних значень та inline стилів
5. **Кращий DX**: Зрозумілі семантичні класи

## Зміна висоти Header

Якщо потрібно змінити висоту header'а, достатньо змінити значення в `globals.css`:

```css
:root {
  --header-height: 5rem; /* Новий розмір */
}
```

Всі компоненти автоматично адаптуються!
