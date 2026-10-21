/**
 * Todas las fechas de la app se piensan en hora de Argentina (UTC-03:00),
 * sin importar la zona horaria configurada en el teléfono.
 * Argentina no usa horario de verano desde 2009; si eso cambiara, este es
 * el único lugar a tocar.
 */
import type { DiaSemana } from '@/tipos';

export const ZONA = '-03:00';
const DESFASE_MS = -3 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** Un Date cuyos campos UTC representan la hora local de Argentina. */
function relojArgentino(ms: number = Date.now()): Date {
  return new Date(ms + DESFASE_MS);
}

function aFecha(d: Date): string {
  return `${d.getUTCFullYear()}-${dosCifras(d.getUTCMonth() + 1)}-${dosCifras(d.getUTCDate())}`;
}

/** "AAAA-MM-DD" de hoy en Argentina. */
export function hoy(): string {
  return aFecha(relojArgentino());
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return aFecha(new Date(Date.UTC(a, m - 1, d) + dias * UN_DIA_MS));
}

export function diaDeLaSemana(fecha: string): DiaSemana {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() as DiaSemana;
}

/** Próxima fecha (a partir de hoy + `minimoDias`) que cae en el día pedido. */
export function proximoDia(dia: DiaSemana, minimoDias = 0): string {
  let fecha = sumarDias(hoy(), minimoDias);
  while (diaDeLaSemana(fecha) !== dia) fecha = sumarDias(fecha, 1);
  return fecha;
}

/**
 * ISO 8601 con zona: "2026-09-19T19:00:00-03:00".
 * Acepta "24:00" como fin de jornada y lo pasa a las 00:00 del día siguiente.
 */
export function isoConZona(fecha: string, hora: string): string {
  if (hora === '24:00') return `${sumarDias(fecha, 1)}T00:00:00${ZONA}`;
  return `${fecha}T${hora}:00${ZONA}`;
}

/** Milisegundos desde epoch para una fecha y hora argentinas. */
export function instante(fecha: string, hora: string): number {
  return Date.parse(isoConZona(fecha, hora));
}

/** Resta horas a un ISO con zona y devuelve otro ISO en hora argentina. */
export function restarHoras(iso: string, horas: number): string {
  const d = relojArgentino(Date.parse(iso) - horas * 60 * 60 * 1000);
  return `${aFecha(d)}T${dosCifras(d.getUTCHours())}:${dosCifras(d.getUTCMinutes())}:00${ZONA}`;
}

/** El momento actual (o el pedido) como ISO con zona argentina. */
export function ahoraIso(ms: number = Date.now()): string {
  const d = relojArgentino(ms);
  return `${aFecha(d)}T${dosCifras(d.getUTCHours())}:${dosCifras(d.getUTCMinutes())}:${dosCifras(d.getUTCSeconds())}${ZONA}`;
}

/** "AAAA-MM-DD" de un ISO con zona, leído en hora argentina. */
export function fechaDeIso(iso: string): string {
  return aFecha(relojArgentino(Date.parse(iso)));
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "Sábado 19 de septiembre" */
export function fechaLarga(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number);
  return `${DIAS[diaDeLaSemana(fecha)]} ${d} de ${MESES[m - 1]}`;
}

export const NOMBRES_DIAS = DIAS;

/** "Sábado 19/09" */
export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-');
  return `${DIAS[diaDeLaSemana(fecha)]} ${d}/${m}`;
}

/** "Hoy", "Mañana" o "Sábado 19/09". */
export function fechaRelativa(fecha: string): string {
  const h = hoy();
  if (fecha === h) return 'Hoy';
  if (fecha === sumarDias(h, 1)) return 'Mañana';
  return fechaCorta(fecha);
}

/** "19:00" → "19" ; "19:30" → "19:30" */
export function horaCorta(hora: string): string {
  return hora.endsWith(':00') ? String(Number(hora.slice(0, 2))) : hora;
}

/** "de 19 a 20 hs" */
export function rangoHorario(inicio: string, fin: string): string {
  return `de ${horaCorta(inicio)} a ${horaCorta(fin)} hs`;
}

/** "15:00" de un ISO con zona, leído en hora argentina. */
export function horaDeIso(iso: string): string {
  const d = relojArgentino(Date.parse(iso));
  return `${dosCifras(d.getUTCHours())}:${dosCifras(d.getUTCMinutes())}`;
}
