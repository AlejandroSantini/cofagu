# CLAUDE.md

Frontend de **COFAGU** — app de gestión de transporte de la Cooperativa
Agrícola Ganadera de Urdinarrain (H&S). SPA React que consume un backend REST
en Railway. Web app + PWA con push notifications. Toda la UI está en **español
(es-AR)**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite dev server en `http://localhost:3000` (`strictPort`, no cambia de puerto) |
| `npm run build` | `tsc -b && vite build` — el typecheck corre primero y **frena el build** ante cualquier error |
| `npm run lint` | ESLint sobre todo el repo |
| `npm run preview` | Sirve el `dist/` ya compilado |
| `npx playwright test` | Tests E2E de `tests/` (levanta su propio Vite en el puerto 3001) |

Antes de dar por terminado cualquier cambio: **`npm run build` tiene que pasar limpio.**

## Stack

- **React 19** + **TypeScript** (strict), **Vite 8**, plugin `@vitejs/plugin-react`.
- **Tailwind CSS v4** vía `@tailwindcss/vite`. Sin `tailwind.config.js`: el tema
  se define en `src/index.css` con `@theme`.
- **react-router-dom v7** — todo el ruteo vive en `src/App.tsx`.
- **Zustand** (con `persist`) para estado global — `src/store/`.
- **react-hook-form** + **Zod** + `@hookform/resolvers` para formularios.
  Schemas en `src/schemas/`.
- **Axios** — cliente e interceptores en `src/api/axios.ts`, servicios en
  `src/api/services.ts`.
- **Firebase Cloud Messaging** para push (`src/firebase.ts`,
  `src/hooks/usePushNotifications.ts`, service worker en `public/`).
- **date-fns** para fechas.
- Deploy en **Vercel** (`vercel.json` reescribe todo a `index.html` para SPA).

## Arquitectura

### Ruteo y autorización (`src/App.tsx`)
- **Todas las rutas están en `App.tsx`**, no hay router anidado por feature.
- Patrón de cada ruta protegida:
  `token ? <AppLayout><RoleGate allowedRoles={[...]}><Page/></RoleGate></AppLayout> : <Navigate to="/login" />`.
- `AppLayout` (`src/components/layout/AppLayout.tsx`) es el chrome global:
  sidebar, header mobile, badge de notificaciones. El sidebar arma su menú
  según `user.role`.
- `RoleGate` (`src/components/RoleGate.tsx`) oculta contenido si el rol no está
  en `allowedRoles`; acepta `fallback`.
- La ruta `/` redirige según rol (PLAYERO→`/yard`, GAS_STATION→`/loads`,
  CONTROL_VIAJES→`/control-viajes`, TECHNICAL_CENTER→`/technical-center-search`,
  resto→Dashboard).
- Si `user.mustChangePassword`, `App` bloquea todo y renderiza
  `ChangePasswordPage`.

### Roles
`UserRole` (en `src/types/index.ts`):
`ADMIN | OPERATOR | EMPLOYEE | CARRIER | PLAYERO | GAS_STATION | LOGISTICS | TECHNICAL_CENTER | CONTROL_VIAJES`.
`useAuthStore` expone helpers: `isAdmin()`, `isStaff()`, `canWrite()`
(ADMIN/OPERATOR/LOGISTICS), etc. Usarlos en vez de comparar strings a mano.

### Auth y API
- `useAuthStore` persiste en `localStorage` bajo la clave **`auth-storage`**.
- El interceptor de request de Axios **lee `auth-storage` directo de
  `localStorage`** (no del store) para inyectar `Authorization: Bearer <token>`.
- El interceptor de response, ante un **401**, limpia `auth-storage` y redirige
  a `/login?error=...` con `window.location.href`.
- Todas las respuestas del backend vienen envueltas: `ApiResponse<T>` con la
  forma `{ data: T, message?: string }`. Los datos reales están en
  **`res.data.data`**.
- `src/api/services.ts` agrupa los endpoints por entidad: `authService`,
  `carrierService`, `driverService`, `truckService`, `loadService`,
  `carrierDocumentService`, `uploadService`, `groupService`, `invoiceService`,
  `notificationService`. Agregar endpoints nuevos al service correspondiente.

### Datos que se refrescan solos
`AUTO_REFRESH_INTERVAL_MS` en `src/config/constants.ts` + el hook
`useAutoRefresh` controlan el polling de fondo de las listas. Cambiar ese valor
único ajusta el intervalo en toda la app.

### Estructura de carpetas
```
src/
  api/         axios + services + getErrorMessage
  components/
    ui/        componentes atómicos reutilizables (Button, Input, Modal, Table, …)
    layout/    AppLayout
    carriers/  componentes de la feature transportistas
  config/      constantes globales
  hooks/       useAutoRefresh, useConfirm, useToast, usePushNotifications
  pages/       una vista por archivo; loads/ tiene su propio subárbol
  schemas/     schemas Zod de cada entidad
  store/       useAuthStore, useNotificationStore, useThemeStore
  types/       index.ts — todos los tipos del dominio
```

## Convenciones de código (obligatorias)

El `tsconfig` tiene `strict`, `verbatimModuleSyntax`, `erasableSyntaxOnly`,
`noUnusedLocals` y `noUnusedParameters`. En la práctica:

1. **Nada de `any`.** En `catch` usar `unknown` + `getErrorMessage(err, 'mensaje por defecto')`.
2. **Imports de tipos con `type`:** `import { type Load } from '../types'` o
   `import type { ... }`. Mezclar valor y tipo sin `type` rompe el build.
3. **Sin `enum`** ni parameter properties (`constructor(private x)`) — no son
   borrables. Para constantes tipo enum usar un objeto `as const`.
4. **Sin imports, variables ni parámetros sin usar** — el build falla con TS6133.
5. **Cleanup en `useEffect`:** patrón `let ignore = false` para evitar race
   conditions en fetches.
6. **Errores de formulario:** siempre vía `getErrorMessage` (`src/api/errorUtils.ts`),
   que además desarma los arrays de errores de Zod que devuelve el backend.
7. **Textos siempre en español (es-AR).** Fechas con `date-fns` o
   `new Date(x).toLocaleDateString('es-AR')`.
8. Componentes funcionales con `React.FC<Props>` e interface de props nombrada.

## Diseño / UI

El sistema de diseño (paleta verde oliva, tipografía, escala de radios y
sombras, dark mode, catálogo de componentes de `src/components/ui/`) está
documentado en **`.claude/skills/ui-style/SKILL.md`** y es la fuente autoritativa.
Se carga solo cuando se trabaja en UI.

> `FRONTEND-STRUCTURE.md` (en la raíz) está **desactualizado** en su sección de
> estética (menciona botones azules y `rounded-2xl/3xl`, que ya no aplican).
> Ante cualquier duda de estilo, mandar la skill `ui-style`.

## Variables de entorno

Ver `.env.example`. Todas con prefijo `VITE_`:
- `VITE_API_URL` — base del backend REST (Railway).
- `VITE_FIREBASE_*` — config de FCM, incluida `VITE_FIREBASE_VAPID_KEY` para
  push en web.
