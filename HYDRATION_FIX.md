# Hydration and Duplicate Key Fixes

## Issues Fixed

### 1. **Duplicate Key Error**

**Error:** `Encountered two children with the same key, '6'. Keys should be unique...`

**Root Cause:** React components were using only the `point.id` as the key, which could cause issues if:

- Points were loaded multiple times
- There were actual duplicate IDs in the data
- React Strict Mode caused double rendering in development

**Solution:**

- Added duplicate detection and filtering using `Map` to ensure unique points
- Changed keys from `key={point.id}` to `key={marker-${point.id}-${index}}` for markers
- Changed keys from `key={point.id}` to `key={building-${point.id}-${index}}` for building list items
- Added console warnings when duplicates are detected

### 2. **Hydration Mismatch**

**Error:** `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties...`

**Root Cause:** The component was using `ssr: false` with `dynamic` import, but still had potential server/client mismatches due to:

- State initialization that could differ between server and client
- Immediate rendering before client-side JavaScript loaded
- Leaflet map initialization happening before proper client detection

**Solution:**

- Added `isClient` state to track when component is running on the client
- Component now waits for client-side hydration before rendering the map
- Shows a loading state until client-side JavaScript is ready
- Points are only loaded after confirming client-side execution

## Changes Made

### In `LeafletMapBox.tsx`:

1. **Added Client-Side Detection:**

```typescript
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);
```

2. **Added Loading State:**

```typescript
if (!isClient) {
  return (
    <div className="...">
      <div className="text-gray-500">Завантаження карти...</div>
    </div>
  );
}
```

3. **Improved Point Loading:**

```typescript
useEffect(() => {
  const fetchPoints = async () => {
    if (propsPoints && propsPoints.length > 0) {
      // Remove duplicates
      const uniquePoints = Array.from(
        new Map(propsPoints.map((p) => [p.id, p])).values()
      );
      if (uniquePoints.length !== propsPoints.length) {
        console.warn("Виявлено дублікати ID в точках:", propsPoints);
      }
      setPoints(uniquePoints);
    } else {
      const data = await loadPointsData();
      // Remove duplicates
      const uniquePoints = Array.from(
        new Map(data.points.map((p) => [p.id, p])).values()
      );
      if (uniquePoints.length !== data.points.length) {
        console.warn("Виявлено дублікати ID в точках:", data.points);
      }
      setPoints(uniquePoints);
    }
  };

  if (isClient) {
    fetchPoints();
  }
}, [propsPoints, isClient]);
```

4. **Updated Keys for Uniqueness:**

```typescript
// For markers
{points.map((point, index) => (
  <DynamicMarker
    key={`marker-${point.id}-${index}`}
    ...
  />
))}

// For building list
{points.map((point, index) => (
  <button
    key={`building-${point.id}-${index}`}
    ...
  />
))}
```

5. **Cleaned Up Unused Code:**

- Removed unused state setters
- Simplified animation settings to use props directly
- Removed unused `isDragging` state and related handlers

## Benefits

✅ **No More Hydration Errors:** Component properly waits for client-side before rendering  
✅ **No More Duplicate Key Warnings:** Unique keys using both ID and index  
✅ **Better Error Detection:** Warns if duplicate IDs are detected in data  
✅ **Cleaner Code:** Removed unused variables and simplified state management  
✅ **Successful Build:** `npm run build` completes without errors or warnings

## Testing

Build the project:

```bash
npm run build
```

Run in development:

```bash
npm run dev
```

The application should now:

- Load without hydration warnings in the console
- Display all markers correctly without duplicate key errors
- Work properly in both development and production builds
- Handle static export correctly with `output: "export"`
