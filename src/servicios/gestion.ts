/**
 * Lo que maneja la Dirección (documento, sección 6): agenda del día,
 * ingreso con QR, presentes y ausentes, bloqueos y reservas fijas.
 * Sólo para cuentas de encargado o administrador.
 */
import * as servidor from '@/mocks/servidor';
import type {
  Bloqueo,
  BloqueoCreado,
  DatosReservaFija,
  EntradaAgenda,
  IngresoRegistrado,
  NuevoBloqueo,
  Reserva,
  ReservaFija,
} from '@/tipos';
import { pedir, simular, USAR_MOCKS } from './cliente';

export async function agendaDelDia(fecha: string): Promise<EntradaAgenda[]> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.agenda(token, fecha))
    : await pedir<EntradaAgenda[]>(`/agenda?fecha=${fecha}`);
  return r.datos;
}

/** Valida el código escaneado en la puerta de un espacio y registra la hora de llegada. */
export async function validarIngreso(codigoQr: string, espacioId: string): Promise<IngresoRegistrado> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.validarIngreso(token, codigoQr, espacioId))
    : await pedir<IngresoRegistrado>('/ingresos', { metodo: 'POST', cuerpo: { codigoQr, espacioId } });
  return r.datos;
}

export async function marcarPresente(reservaId: string): Promise<Reserva> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.marcarPresente(token, reservaId))
    : await pedir<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/presente`, { metodo: 'POST' });
  return r.datos;
}

export async function marcarAusente(reservaId: string): Promise<Reserva> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.marcarAusente(token, reservaId))
    : await pedir<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/ausente`, { metodo: 'POST' });
  return r.datos;
}

export async function listarBloqueos(desde: string): Promise<Bloqueo[]> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.bloqueos(token, desde))
    : await pedir<Bloqueo[]>(`/bloqueos?desde=${desde}`);
  return r.datos;
}

export async function crearBloqueo(nuevo: NuevoBloqueo): Promise<BloqueoCreado> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.crearBloqueo(token, nuevo))
    : await pedir<BloqueoCreado>('/bloqueos', { metodo: 'POST', cuerpo: nuevo });
  return r.datos;
}

export async function borrarBloqueo(id: string): Promise<Bloqueo> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.borrarBloqueo(token, id))
    : await pedir<Bloqueo>(`/bloqueos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
  return r.datos;
}

export async function crearFija(datos: DatosReservaFija): Promise<ReservaFija> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.crearFija(token, datos))
    : await pedir<ReservaFija>('/reservas-fijas', { metodo: 'POST', cuerpo: datos });
  return r.datos;
}

export async function editarFija(id: string, datos: DatosReservaFija): Promise<ReservaFija> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.editarFija(token, id, datos))
    : await pedir<ReservaFija>(`/reservas-fijas/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos });
  return r.datos;
}
