# H&S Frontend Architecture & Design System

Este documento define las reglas de oro y la biblioteca de componentes para asegurar la consistencia del proyecto.

## 📂 Estructura de Carpetas
- `src/api`: Servicios (`services.ts`), utilidades de error (`errorUtils.ts`) y cliente Axios.
- `src/components/ui`: Componentes atómicos reutilizables (Botones, Inputs, etc.).
- `src/components/layout`: Componentes de estructura global (`AppLayout`).
- `src/hooks`: Lógica de negocio reutilizable (ej: `useCatalogs`).
- `src/pages`: Vistas completas que ensamblan componentes.
- `src/store`: Estado global con Zustand.

## 🛠 Biblioteca de Componentes UI

### 1. Button (`src/components/ui/Button.tsx`)
- **Variantes**: `primary` (azul), `secondary` (oscuro), `outline`, `danger` (rojo), `emerald` (verde).
- **Props**: `isLoading` (spinner automático), `icon` (LucideIcon), `disabled`.

### 2. Input (`src/components/ui/Input.tsx`)
- **Estilo**: Fondo `slate-50/50`, bordes redondeados `3xl`, focus con anillo azul suave.
- **Props**: `label`, `icon`, `error` (mensaje en rojo), `...rest`.

### 3. Select (`src/components/ui/Select.tsx`)
- **Estilo**: Consistente con Input, flecha personalizada.
- **Props**: `label`, `icon`, `options` (array de `{value, label}`), `error`.

### 4. PageHeader (`src/components/ui/PageHeader.tsx`)
- **Uso**: Siempre al inicio de cada página.
- **Props**: `title`, `description`, `icon`, `showBack` (botón volver automático).

### 5. StatCard (`src/components/StatCard.tsx`)
- **Uso**: Dashboard. Muestra métricas con icono y valor.
- **Props**: `title`, `value`, `icon`, `color`, `onClick`.

## 📜 Reglas de Oro para Desarrollo
1. **Type Safety**: Prohibido usar `any`. Usar `unknown` y validación de tipos en bloques catch.
2. **Type-Only Imports**: Usar `import { type ... }` para tipos TS debido a `verbatimModuleSyntax`.
3. **Async Cleanup**: En `useEffect`, usar siempre el patrón de `let ignore = false` para evitar race conditions.
4. **Error Handling**: Usar siempre la utilidad `getErrorMessage(err, default)` en formularios.
5. **Aesthetics**: Usar bordes `rounded-2xl` o `rounded-3xl`, sombras suaves `shadow-slate-200/50` y fuentes `tracking-tight`.
