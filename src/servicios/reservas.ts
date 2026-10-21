/**
 * Capa de servicios de reservas y turnos (src/servicios/reservas.ts,
 * como pide el documento). Hoy devuelve mocks; mañana hace fetch.
 */
import * as servidor from '@/mocks/servidor';
import type { CancelacionRegistrada, NuevaReserva, Reserva, ReservaFija, Turno } from '@/tipos';
import { pedir, simular, USAR_MOCKS } from './cliente';

/** Los 16 turnos de un espacio en un día, ya cruzados con fijas y bloqueos (pregunta 6). */
export async function obtenerGrilla(espacioId: string, fecha: string): Promise<Turno[]> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.grilla(espacioId, fecha))
    : await pedir<Turno[]>(`/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${fecha}`);
  return r.datos;
}

/** Fijas de un espacio, para mostrar a nombre de quién está cada turno fijo. */
export async function listarFijas(espacioId: string | null = null): Promise<ReservaFija[]> {
  const consulta = espacioId ? `?espacioId=${encodeURIComponent(espacioId)}` : '';
  const r = USAR_MOCKS ? await simular(() => servidor.fijas(espacioId)) : await pedir<ReservaFija[]>(`/reservas-fijas${consulta}`);
  return r.datos;
}

/** Reservas del usuario de la sesión (todas: próximas, pasadas y canceladas). */
export async function listarMisReservas(): Promise<Reserva[]> {
  const r = USAR_MOCKS ? await simular((token) => servidor.misReservas(token)) : await pedir<Reserva[]>('/reservas/mias');
  return r.datos;
}

/**
 * La Reserva del documento no trae fecha ni hora: hay que pedir su Turno.
 * Ver "Huecos" en el análisis.
 */
export async function obtenerTurno(id: string): Promise<Turno> {
  const r = USAR_MOCKS ? await simular(() => servidor.turno(id)) : await pedir<Turno>(`/turnos/${encodeURIComponent(id)}`);
  return r.datos;
}

export async function reservar(pedido: NuevaReserva): Promise<Reserva> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.crearReserva(token, pedido))
    : await pedir<Reserva>('/reservas', { metodo: 'POST', cuerpo: pedido });
  return r.datos;
}

/** Hasta 4 horas antes se cancela sola; después queda anotada como tardía. */
export async function cancelar(id: string): Promise<CancelacionRegistrada> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.cancelarReserva(token, id))
    : await pedir<CancelacionRegistrada>(`/reservas/${encodeURIComponent(id)}/cancelar`, { metodo: 'POST' });
  return r.datos;
}
