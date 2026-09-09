import React from 'react';

interface SkeletonProps {
  /** Clases extra: sobrescribí `h-*` / `w-*` para dar la forma del contenido real. */
  className?: string;
  /** Si se pasa (>1), renderiza esa cantidad de líneas de texto; la última al 60%. */
  lines?: number;
  /** Redondeo. `sm` para chips/celdas, `md` para bloques, `full` para avatares. */
  radius?: 'sm' | 'md' | 'lg' | 'full';
}

const radiusMap: Record<NonNullable<SkeletonProps['radius']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Bloque de carga. Pulso suave (`animate-pulse`), sin barrido de brillo: da
 * sensación de "cargando" sin llamar la atención. Usar mientras se resuelve un
 * fetch, con el mismo alto/ancho aproximado que tendrá el contenido para que
 * no haya salto de layout al aparecer los datos.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  lines = 1,
  radius = 'sm',
}) => {
  const base = `animate-pulse bg-slate-100 dark:bg-zinc-800 ${radiusMap[radius]}`;

  if (lines <= 1) {
    return <div aria-hidden="true" className={`${base} h-4 w-full ${className}`} />;
  }

  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${base} h-4 ${i === lines - 1 ? 'w-3/5' : 'w-full'} ${className}`}
        />
      ))}
    </div>
  );
};
