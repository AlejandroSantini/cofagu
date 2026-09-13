/**
 * Convierte el valor de un `<input type="date">` ("YYYY-MM-DD") a un ISO
 * string que representa el mediodía de ESE día en la zona horaria local.
 *
 * `new Date("YYYY-MM-DD")` lo interpreta como medianoche UTC — en
 * Argentina (UTC-3) eso cae en las 21hs del día anterior, y cualquier
 * `toLocaleDateString('es-AR')` posterior muestra un día antes del
 * elegido. Usar mediodía evita que la conversión cruce la medianoche en
 * cualquier huso horario razonable.
 */
export function dateOnlyToISOString(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}
