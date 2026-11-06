/**
 * Tarifa sin ambigüedad a partir de `targetGroups`: cuando todos los grupos
 * destinatarios tienen la MISMA tarifa (incluido el caso de un único grupo),
 * esa es la tarifa que le corresponde a cualquier transportista aceptado.
 * Si hay grupos con tarifas distintas no hay una tarifa única que mostrar
 * sin que el backend resuelva cuál aplica (`resolvedRate`).
 */
export function uniqueTargetGroupRate(
  groups?: { rate?: number | null }[] | null,
): number | undefined {
  if (!groups || groups.length === 0) return undefined;
  const rates = groups.map((g) => g.rate);
  const first = rates[0];
  if (first == null || isNaN(Number(first))) return undefined;
  return rates.every((r) => r != null && Number(r) === Number(first))
    ? Number(first)
    : undefined;
}
