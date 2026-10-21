/**
 * El cruce que arma la grilla de un día (docs/ANALISIS.md, sección 3).
 * Una reserva fija no es un turno: es una regla. La grilla sale de cruzar
 * las reservas del día con las fijas vigentes y los bloqueos.
 *
 * Precedencia provisoria (pregunta 5): mantenimiento > reservado > fijo > libre.
 *
 * Es código puro, sin servicios: lo usa el servidor simulado y, si la API
 * devolviera las piezas sueltas (pregunta 6), lo puede usar la app tal cual.
 */
import type { Bloqueo, Espacio, Reserva, ReservaFija, Turno } from '@/tipos';
import { diaDeLaSemana, instante } from './fechas';

export const HORA_APERTURA = 8;
export const HORA_CIERRE = 24;

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** "08:00", "09:00" … "23:00": inicio de cada turno de una hora. */
export const HORAS_DEL_DIA: string[] = Array.from(
  { length: HORA_CIERRE - HORA_APERTURA },
  (_, i) => `${dosCifras(HORA_APERTURA + i)}:00`,
);

export function finDeTurno(inicio: string): string {
  return `${dosCifras(Number(inicio.slice(0, 2)) + 1)}:00`;
}

/**
 * "tur-02-20260919-19". El formato del documento ("tur-0219-19") no incluye
 * el mes y se repite cada mes (pregunta 3).
 */
export function idTurno(espacioId: string, fecha: string, inicio: string): string {
  return `tur-${espacioId.replace(/^esp-/, '')}-${fecha.replaceAll('-', '')}-${inicio.slice(0, 2)}`;
}

/** Desarma un id de turno. null si no tiene la forma esperada. */
export function leerIdTurno(id: string): { espacioId: string; fecha: string; inicio: string } | null {
  const m = /^tur-(.+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/.exec(id);
  if (!m) return null;
  return { espacioId: `esp-${m[1]}`, fecha: `${m[2]}-${m[3]}-${m[4]}`, inicio: `${m[5]}:00` };
}

/** La fija ocupa ese turno: activa, mismo día de la semana, dentro de su vigencia y de su horario. */
export function fijaOcupa(f: ReservaFija, espacioId: string, fecha: string, inicio: string): boolean {
  return (
    f.activa &&
    f.espacioId === espacioId &&
    f.dia === diaDeLaSemana(fecha) &&
    f.desde <= fecha &&
    (f.hasta === null || f.hasta >= fecha) &&
    f.inicio <= inicio &&
    inicio < f.fin
  );
}

/** El bloqueo tapa ese turno: mismo espacio y día, y el día entero o la hora dentro del rango. */
export function bloqueoCubre(b: Bloqueo, espacioId: string, fecha: string, inicio: string): boolean {
  if (b.espacioId !== espacioId || b.fecha !== fecha) return false;
  if (b.inicio === null) return true;
  return b.inicio <= inicio && inicio < (b.fin ?? '24:00');
}

/** Las canceladas liberan el turno; el resto lo ocupa. */
export const reservaOcupa = (r: Reserva) => r.estado !== 'cancelada';

interface Fuentes {
  espacio: Espacio;
  fecha: string;
  reservas: Reserva[];
  fijas: ReservaFija[];
  bloqueos: Bloqueo[];
}

export function armarTurno({ espacio, fecha, reservas, fijas, bloqueos }: Fuentes, inicio: string): Turno {
  const id = idTurno(espacio.id, fecha, inicio);
  const bloqueo = bloqueos.find((b) => bloqueoCubre(b, espacio.id, fecha, inicio));
  const reserva = reservas.find((r) => r.turnoId === id && reservaOcupa(r));
  const fija = fijas.find((f) => fijaOcupa(f, espacio.id, fecha, inicio));

  const base = { id, espacioId: espacio.id, fecha, inicio, fin: finDeTurno(inicio), precio: espacio.precioPorHora };
  if (!espacio.activo) {
    return { ...base, estado: 'mantenimiento', reservaId: null, motivoBloqueo: 'Espacio fuera de servicio' };
  }
  if (bloqueo) return { ...base, estado: 'mantenimiento', reservaId: null, motivoBloqueo: bloqueo.motivo };
  if (reserva) return { ...base, estado: 'reservado', reservaId: reserva.id, motivoBloqueo: null };
  if (fija) return { ...base, estado: 'fijo', reservaId: null, motivoBloqueo: null };
  return { ...base, estado: 'libre', reservaId: null, motivoBloqueo: null };
}

/** Los 16 turnos de 8 a 24 de un espacio en un día. */
export function armarGrilla(fuentes: Fuentes): Turno[] {
  return HORAS_DEL_DIA.map((inicio) => armarTurno(fuentes, inicio));
}

/** Un turno que ya empezó no se reserva aunque figure libre (pregunta 11). */
export function turnoPasado(turno: Pick<Turno, 'fecha' | 'inicio'>, ahora: number): boolean {
  return instante(turno.fecha, turno.inicio) <= ahora;
}

/** Nombre del grupo que tiene la fija en ese turno, para mostrar "FIJO - Grupo del martes". */
export function titularFijo(fijas: ReservaFija[], turno: Turno): string | null {
  return fijas.find((f) => fijaOcupa(f, turno.espacioId, turno.fecha, turno.inicio))?.titular ?? null;
}
