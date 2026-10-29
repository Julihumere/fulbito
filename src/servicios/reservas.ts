/**
 * Capa de servicios de reservas y turnos (src/servicios/reservas.ts,
 * como pide el documento). Con EXPO_PUBLIC_USAR_MOCKS=false habla con la API.
 */
import * as servidor from '@/mocks/servidor';
import type { CancelacionRegistrada, NuevaReserva, Reserva, ReservaFija, Turno } from '@/tipos';
import { finDeTurno, leerIdTurno } from '@/utilidades/grilla';
import { ErrorApi, pedir, pedirLista, simular, USAR_MOCKS } from './cliente';
import { obtenerEspacio } from './espacios';

/** Los 16 turnos de un espacio en un día, ya cruzados por la API. */
export async function obtenerGrilla(espacioId: string, fecha: string): Promise<Turno[]> {
  const datos = USAR_MOCKS
    ? (await simular(() => servidor.grilla(espacioId, fecha))).datos
    : (await pedir<Turno[]>(
        `/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${encodeURIComponent(fecha)}`,
      )).datos;
  return datos;
}

/** GET /fijas — sólo encargado/administrador. */
export async function listarFijas(espacioId: string | null = null): Promise<ReservaFija[]> {
  const datos = USAR_MOCKS
    ? (await simular(() => servidor.fijas(espacioId))).datos
    : await pedirLista<ReservaFija>('/fijas', espacioId ? { espacioId } : {});
  return datos;
}

/** La API separa próximas y pasadas; la app las vuelve a separar por fecha. */
export async function listarMisReservas(): Promise<Reserva[]> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.misReservas(token))).datos;
  }

  const [proximas, pasadas] = await Promise.all([
    pedirLista<Reserva>('/yo/reservas', { cuando: 'proximas' }),
    pedirLista<Reserva>('/yo/reservas', { cuando: 'pasadas' }),
  ]);
  const porId = new Map<string, Reserva>();
  [...proximas, ...pasadas].forEach((r) => porId.set(r.id, r));
  return [...porId.values()];
}

/** GET /reservas/:id — el dueño o el personal. */
export async function obtenerReserva(id: string): Promise<Reserva> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.obtenerReserva(token, id))
    : await pedir<Reserva>(`/reservas/${encodeURIComponent(id)}`);
  return r.datos;
}

/**
 * La Reserva no trae fecha ni hora. Se obtiene el turno a partir de su id:
 * `tur-esp-02-20260919-19` (API) o `tur-02-20260919-19` (mock viejo).
 */
export async function obtenerTurno(id: string): Promise<Turno> {
  if (USAR_MOCKS) {
    const r = await simular(() => servidor.turno(id));
    return r.datos;
  }

  const partes = leerIdTurno(id);
  if (!partes) throw new Error('El id del turno no tiene la forma esperada.');

  try {
    const turnos = await obtenerGrilla(partes.espacioId, partes.fecha);
    const turno = turnos.find((t) => t.id === id);
    if (turno) return turno;
  } catch (e) {
    // La grilla sólo cubre hoy + 6. Para una reserva vieja se reconstruye
    // con el id y el precio actual del espacio.
    const codigo = e instanceof ErrorApi ? e.codigo : null;
    if (codigo !== 'FECHA_FUERA_DE_RANGO' && codigo !== 'TURNO_NO_ENCONTRADO') throw e;
  }

  const espacio = await obtenerEspacio(partes.espacioId);
  return {
    id,
    espacioId: partes.espacioId,
    fecha: partes.fecha,
    inicio: partes.inicio,
    fin: finDeTurno(partes.inicio),
    estado: 'reservado',
    reservaId: null,
    motivoBloqueo: null,
    precio: espacio.precioPorHora,
  };
}

/** POST /reservas — la API sólo acepta turnoId y cantidadPersonas. */
export async function reservar(pedido: NuevaReserva): Promise<Reserva> {
  const cuerpo = {
    turnoId: pedido.turnoId,
    cantidadPersonas: pedido.cantidadPersonas,
  };
  const r = USAR_MOCKS
    ? await simular((token) => servidor.crearReserva(token, pedido))
    : await pedir<Reserva>('/reservas', { metodo: 'POST', cuerpo });
  return r.datos;
}

/** POST /reservas/:id/cancelacion. La API no permite cancelar tarde a un jugador. */
export async function cancelar(id: string): Promise<CancelacionRegistrada> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.cancelarReserva(token, id))).datos;
  }

  const antes = await obtenerReserva(id);
  const tardia = Date.parse(antes.cancelableHasta) <= Date.now();
  const r = await pedir<Reserva>(`/reservas/${encodeURIComponent(id)}/cancelacion`, { metodo: 'POST' });
  return { reserva: r.datos, tardia };
}

/** GET /reservas?fecha= — sólo personal; alimenta la agenda. */
export async function listarReservasDelDia(fecha: string): Promise<Reserva[]> {
  if (USAR_MOCKS) return [];
  return pedirLista<Reserva>('/reservas', { fecha });
}
