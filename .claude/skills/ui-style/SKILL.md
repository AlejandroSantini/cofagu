---
name: ui-style
description: >-
  Sistema de diseño de cofagu (transporte-frontend). Usar SIEMPRE que se cree o
  edite UI: componentes React/TSX, JSX, clases de Tailwind, estilos, layouts,
  pantallas, formularios, tablas, modales, colores o tipografía. Define paleta,
  tipografía, radios, sombras, dark mode y los componentes base que hay que
  reutilizar en vez de reinventar.
---

# Sistema de diseño — cofagu

App de gestión de transporte para la Cooperativa de Urdinarrain. Mobile-first,
PWA, con dark mode. Estética: **sobria, densa en datos, verde oliva**.

**Prohibido** (dan el "look de IA"):
- Gradientes de color (`bg-gradient-to-*`, `from-*`/`via-*`/`to-*`) para fondos,
  botones, avatares o texto. Usar color sólido. `backdrop-blur-sm` solo se
  permite en el backdrop de overlays (modal, sidebar mobile).
- `bg-clip-text` / texto con degradé.
- Glassmorphism, acentos violeta/fucsia, sombras de neón, bordes con gradiente.
- Radios exagerados (ver "Forma y profundidad").
- Iconos gigantes de "marca de agua" detrás del contenido (`<Icon size={120}>`
  con opacidad baja), sombras de color tipo glow (`shadow-lg shadow-current/20`,
  `shadow-<color>/30`+), y micro-animaciones decorativas (`group-hover:scale-110`
  en iconos). El feedback de hover lo da la `Card` (borde + `shadow-md`).

## Reglas duras (romper esto rompe el build o la coherencia visual)

- **Tailwind v4, sin `tailwind.config.js`.** El tema se extiende en
  `src/index.css` dentro de `@theme`. No crear archivos de config de Tailwind.
- **`erasableSyntaxOnly` + `verbatimModuleSyntax` activados.** Prohibido: `enum`,
  parameter properties (`constructor(private x)`), `namespace` con runtime.
  Para "enums" usar un objeto `as const`. Los tipos se importan con
  `import type { ... }`.
- **`noUnusedLocals` / `noUnusedParameters` activados.** No dejar imports,
  variables ni props sin usar — el build falla con TS6133.
- **Reutilizar los componentes de `src/components/ui/`** (abajo). No escribir un
  `<button className="...">` a mano si `Button` ya cubre el caso.
- **Iconos: solo `lucide-react` v1**, importados individualmente, con prop
  numérica `size={...}`. Para tipar props de icono: `import type { LucideIcon }`.

## Paleta

Los tokens `emerald`, `amber` y `yellow` están **redefinidos** en `src/index.css`
— no son los de Tailwind por defecto. Siempre referirlos por nombre de escala
(`emerald-600`), nunca hardcodear el hex.

| Rol | Clases | Notas |
|---|---|---|
| **Primario / marca** | `emerald-600` (fondo), `emerald-700` (hover), `emerald-500` (foco, acentos) | Verde oliva `#597231` / `#7aa72c`, no el emerald de Tailwind |
| **Acento secundario** | `yellow-*` / `amber-*` (ambos = dorado `#eebe00`) | Badges "primary", iconos informativos |
| **Peligro / destructivo** | `rose-500` (fondo), `rose-600` (hover) | Botón `danger`, errores, validación |
| **Info** | `blue-*` | Badge "info" |
| **Éxito** | `emerald-*` | Badge "success" |
| **Advertencia** | `amber-*` | Badge "warning" |
| **Neutros — light** | `slate` (`slate-50` fondo página, `slate-200` bordes, `slate-900` texto, `slate-500` texto atenuado) | |
| **Neutros — dark** | `zinc` (`zinc-950` fondo página, `zinc-900` superficies, `zinc-800` bordes, `white`/`slate-50` texto) | |

**Emparejamiento light/dark fijo** — usar siempre juntos:

```
bg-white           dark:bg-zinc-900        · superficies (cards, inputs, tabla)
bg-slate-50        dark:bg-zinc-950        · fondo de página
border-slate-200   dark:border-zinc-800    · bordes
text-slate-900     dark:text-white         · texto principal
text-slate-500     dark:text-slate-400     · texto atenuado / labels secundarios
hover:bg-slate-50  dark:hover:bg-zinc-800/50 · hover de filas / ghost
```

Dark mode es **class-based** (`.dark` en el `<html>`, `@custom-variant dark`).
Todo lo que se agregue debe tener su variante `dark:`.

## Tipografía

- **Fuente: Inter** en todo. Está bien — es el sistema, no un default a corregir.
- Títulos / `h1-h6`: `font-black tracking-tight` (el CSS ya aplica
  `letter-spacing: -0.01em` a headings y a `.font-bold`/`.font-black`).
- Labels de formulario: `font-bold text-slate-700 dark:text-slate-300`.
- Badges y headers de tabla: `font-black uppercase tracking-wider`, tamaño
  `text-xs` o `text-[10px]`.
- **Badges, pills y headers de tabla nunca se parten en dos líneas.** Siempre
  `whitespace-nowrap` (ya está en `Badge` y en el `<th>` de `Table`); un label de
  dos palabras como "CENTRO AGROTÉCNICO" ensancha la celda, no envuelve. Si el
  pill se arma a mano en un `render:` de columna, agregarle `whitespace-nowrap`
  (y `inline-block`/`inline-flex` si tiene padding).
- Texto de datos en tablas: `font-bold ... text-xs sm:text-sm`.
- Body / descripciones: `text-sm leading-relaxed text-slate-500 dark:text-slate-400`.
- En mobile los `input/select/textarea` van a `font-size: 16px` (regla global,
  evita el auto-zoom de iOS) — no pelear con eso.

## Forma y profundidad

- **Radios** (escala ajustada — look utilitario, nada más redondo que esto):
  - `rounded-md` (6px) → default: botones, cards, inputs, selects, tabla, filas de nav.
  - `rounded-lg` (8px) → solo superficies grandes: contenedor de modal, cards de
    las pantallas de auth, tiles de icono de `PageHeader`, zona de drop de imágenes.
  - `rounded-sm` (4px) → controles y adornos chicos: badges, chips, pills,
    checkboxes, cajas de icono pequeñas, tags inline.
  - `rounded-full` → solo elementos circulares reales: avatares, botones de solo
    icono (ej. "volver"), contadores de notificación.
  - Prohibido `rounded-xl`, `rounded-2xl`, `rounded-3xl` en componentes nuevos.
- **Bordes:** cards y contenedores `border` (1px); inputs y botones `outline`
  usan `border-2`.
- **Sombras:** discretas. `shadow-sm` en reposo, `shadow-md` en hover. Sombras
  de color a baja opacidad para elementos de marca:
  `shadow-md shadow-emerald-600/10`, `shadow-lg shadow-emerald-600/20`.
  Nunca sombras duras o grandes salvo `shadow-2xl` en el modal.
- **Transiciones:** `transition-all duration-200` (o `duration-300` para
  cambios de tema). Feedback táctil: `active:scale-[0.98]` en botones,
  `active:scale-[0.99]` en cards clickeables.
- **Espaciado:** escala de 4px de Tailwind. Padding de card: `p-4 md:p-8`.
  Padding de celda de tabla: `px-6 py-4`.

## Componentes base — `src/components/ui/`

Importar y componer estos. No duplicar su lógica.

| Componente | Para qué | API relevante |
|---|---|---|
| `Button` | Toda acción clickeable | `variant`: `primary` \| `secondary` \| `outline` \| `ghost` \| `danger`; `size`: `sm` \| `md` \| `lg`; `isLoading`; `icon` (LucideIcon); soporta solo-icono |
| `Badge` | Estados, etiquetas | `variant`: `primary` \| `success` \| `warning` \| `error` \| `info` \| `neutral`; `size`: `xs` \| `sm` |
| `Card` | Contenedor de contenido | `hover`, `onClick`, `padding`: `none` \| `sm` \| `md` \| `lg` |
| `Input` | Campo de texto | `label`, `icon`, `rightElement`, `error`; usa `forwardRef` (compatible con react-hook-form) |
| `Select` | Desplegable | mismo patrón que `Input` |
| `Modal` | Diálogos / confirmaciones | `type`: `danger` \| `success` \| `info`; `onConfirm`, `isLoading`; cierra con Esc y backdrop |
| `Table` | Listados | genérico `<T>`: `columns` (`{ header, render, className }`), `data`, `isLoading` (muestra filas skeleton), `skeletonRows` (default 5), `pagination` opcional server-side |
| `PageHeader` | Encabezado de pantalla | `title`, `icon`, `iconColor`, `showBack` |
| `Skeleton` | Placeholder de carga | `className` (dar `h-*`/`w-*` reales), `lines` (>1 = bloque de texto), `radius`: `sm` \| `md` \| `lg` \| `full` |
| `Toast` / `ErrorMessage` | Feedback | — |
| `ImageUpload` | Subida de imágenes | — |

## Estados de carga (skeletons)

Regla: **mientras se resuelve un fetch se muestra un skeleton con la forma del
contenido real**, no un spinner centrado ni texto "Cargando...". El spinner
solo sobrevive en: botones (`Button isLoading`), acciones dentro de un `Modal`
(`Modal isLoading`), progreso de subida (`ImageUpload`) y redirecciones
instantáneas (`EntityRedirects`).

- **Componente:** `Skeleton` de `src/components/ui/`. Pulso suave
  (`animate-pulse`, `bg-slate-100 dark:bg-zinc-800`), sin barrido de brillo
  (shimmer) — tiene que pasar desapercibido, no llamar la atención.
- **Sin salto de layout:** el skeleton ocupa el mismo alto/ancho aproximado que
  el dato. Reutilizá las clases del contenedor real (mismo `grid`, `p-*`,
  `divide-y`, alturas de fila) y meté `Skeleton` adentro.
- **Tablas:** `<Table isLoading>` ya renderea filas skeleton solo con pasarle el
  flag. No armar un loader aparte antes de la tabla; renderizala siempre y
  dejale el estado a `isLoading`.
- **Re-fetch sobre datos ya visibles** (búsquedas con debounce, auto-refresh):
  **no** cambiar a skeleton — dejar los datos viejos en pantalla. El skeleton es
  solo para la **primera** carga (`isLoading && data.length === 0`).
- **KPIs / `StatCard`:** pasar `loading` → el valor y el label salen como
  skeleton.
- Cantidad de filas/tiles fantasma: ~3–6. Ni una (se ve pobre) ni una pantalla
  entera (se ve lento).

```tsx
// Bloque simple: dale la forma con className
<Skeleton className="h-7 w-64 max-w-full" radius="md" />

// Texto multilínea (última línea al 60%)
<Skeleton lines={3} />

// Grilla de tiles que copia el layout real
<div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
  {Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="flex items-center gap-3">
      <Skeleton radius="md" className="h-11 w-11 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  ))}
</div>
```

## Stack y patrones

- **React 19**, componentes funcionales, `React.FC<Props>` con interface de props
  nombrada. Sin `PropTypes`.
- **Formularios:** `react-hook-form` + `zod` + `@hookform/resolvers`.
- **Estado global:** `zustand`, stores en `src/store/` (`useAuthStore`,
  `useNotificationStore`, …). Selectores: `useAuthStore((s) => s.user)`.
- **Ruteo:** `react-router-dom` v7.
- **HTTP:** `axios` vía `src/api/services.ts`.
- **Fechas:** `date-fns`, o `new Date(x).toLocaleDateString('es-AR')` para
  mostrar. Locale de la UI: **español (Argentina)**. Todos los textos visibles
  van en español.
- **Roles:** la UI se ramifica mucho por `user.role` (`ADMIN`, `CARRIER`,
  `LOGISTICS`, `PLAYERO`, `GAS_STATION`, `CONTROL_VIAJES`, `TECHNICAL_CENTER`,
  `EMPLOYEE`, …). Al agregar pantallas, considerar visibilidad por rol como en
  `AppLayout`.
- **Mobile / PWA:** `html, body` tienen `overflow-x: hidden`. Cuidar áreas
  seguras (notch iOS), no asumir hover, targets táctiles grandes.

## Checklist antes de dar por hecho un cambio de UI

1. ¿Reutiliza los componentes de `ui/` en lugar de markup crudo?
2. ¿Cada clase de color tiene su par `dark:`?
3. ¿Usa los tokens de escala (`emerald-600`) y no hex sueltos?
4. ¿Radios y sombras siguen la tabla de "Forma y profundidad"?
5. ¿Sin `enum` / sin imports o vars sin usar? (`npm run build` limpio)
6. ¿Textos en español (es-AR)?
7. ¿Los estados de carga son skeletons con la forma del contenido (no spinner
   centrado ni "Cargando...")? ¿El re-fetch sobre datos ya visibles NO parpadea
   a skeleton?
