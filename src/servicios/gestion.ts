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
  Titular,
  Turno,
  Usuario,
} from '@/tipos';
import { fijaOcupa, finDeTurno, leerIdTurno } from '@/utilidades/grilla';
import { pedir, pedirLista, pedirVacio, simular, USAR_MOCKS } from './cliente';
import { listarFijas, listarReservasDelDia, obtenerReserva, obtenerTurno } from './reservas';

/** Cache de usuarios para no pedir el mismo titular una vez por turno. */
const titulares = new Map<string, Promise<Titular | null>>();

function titularDe(usuario: Usuario): Titular {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    cancelacionesTardias: usuario.cancelacionesTardias,
    ausencias: usuario.ausencias,
  };
}

async function obtenerTitular(usuarioId: string): Promise<Titular | null> {
  if (USAR_MOCKS) return null;
  let pendiente = titulares.get(usuarioId);
  if (!pendiente) {
    pendiente = pedir<Usuario>(`/usuarios/${encodeURIComponent(usuarioId)}`)
      .then((r) => titularDe(r.datos))
      .catch(() => null);
    titulares.set(usuarioId, pendiente);
  }
  return pendiente;
}

/** La API devuelve Turno[]; la pantalla necesita el turno con su reserva y titular. */
export async function agendaDelDia(fecha: string): Promise<EntradaAgenda[]> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.agenda(token, fecha))).datos;
  }

  const [turnos, reservas, fijas] = await Promise.all([
    pedirLista<Turno>('/agenda', { fecha }, 500),
    listarReservasDelDia(fecha),
    listarFijas(),
  ]);
  const reservaPorId = new Map(reservas.map((r) => [r.id, r]));

  return Promise.all(
    turnos.map(async (turno) => {
      const reserva = turno.reservaId ? (reservaPorId.get(turno.reservaId) ?? null) : null;
      const titular = reserva ? await obtenerTitular(reserva.usuarioId) : null;
      const fija = turno.estado === 'fijo'
        ? fijas.find((f) => fijaOcupa(f, turno.espacioId, turno.fecha, turno.inicio))
        : null;
      return {
        turno,
        reserva,
        titular,
        titularFijo: fija?.titular ?? null,
      };
    }),
  );
}

/** Una reserva confirmada con lo justo para mostrarla y cancelarla. */
export interface ReservaCancelable {
  reserva: Reserva;
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  titular: Titular | null;
}

/**
 * Reservas confirmadas de un día. En la API pide sólo GET /reservas (más liviano
 * que la agenda completa) y completa el titular en paralelo.
 */
export async function reservasCancelables(fecha: string): Promise<ReservaCancelable[]> {
  if (USAR_MOCKS) {
    const agenda = (await simular((token) => servidor.agenda(token, fecha))).datos;
    return agenda.flatMap((x) =>
      x.reserva?.estado === 'confirmada'
        ? [{ reserva: x.reserva, espacioId: x.turno.espacioId, fecha: x.turno.fecha, inicio: x.turno.inicio, fin: x.turno.fin, titular: x.titular }]
        : [],
    );
  }

  const reservas = await pedirLista<Reserva>('/reservas', { fecha, estado: 'confirmada' });
  const filas = await Promise.all(
    reservas
      .filter((r) => r.estado === 'confirmada')
      .map(async (reserva): Promise<ReservaCancelable | null> => {
        const partes = leerIdTurno(reserva.turnoId);
        if (!partes) return null;
        return {
          reserva,
          espacioId: reserva.espacioId,
          fecha: partes.fecha,
          inicio: partes.inicio,
          fin: finDeTurno(partes.inicio),
          titular: await obtenerTitular(reserva.usuarioId),
        };
      }),
  );
  return filas.filter((f): f is ReservaCancelable => f !== null);
}

/** POST /ingresos — devuelve la Reserva; se completa con turno y titular. */
export async function validarIngreso(codigoQr: string, espacioId: string): Promise<IngresoRegistrado> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.validarIngreso(token, codigoQr, espacioId))).datos;
  }

  const reserva = (await pedir<Reserva>('/ingresos', {
    metodo: 'POST',
    cuerpo: { codigoQr, espacioId },
  })).datos;
  const [turno, titular] = await Promise.all([
    obtenerTurno(reserva.turnoId),
    obtenerTitular(reserva.usuarioId),
  ]);
  return {
    reserva,
    turno,
    titular: titular ?? {
      id: reserva.usuarioId,
      nombre: 'Reserva',
      telefono: '',
      cancelacionesTardias: 0,
      ausencias: 0,
    },
  };
}

/** POST /reservas/:id/ausente. */
export async function marcarAusente(reservaId: string): Promise<Reserva> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.marcarAusente(token, reservaId))
    : await pedir<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/ausente`, { metodo: 'POST' });
  return r.datos;
}

/** La API no tiene un endpoint por id: se registra el ingreso con el QR de la reserva. */
export async function marcarPresente(reservaId: string): Promise<Reserva> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.marcarPresente(token, reservaId))).datos;
  }
  const reserva = await obtenerReserva(reservaId);
  return (
    await pedir<Reserva>('/ingresos', {
      metodo: 'POST',
      cuerpo: { codigoQr: reserva.codigoQr, espacioId: reserva.espacioId },
    })
  ).datos;
}

/**
 * POST /reservas/:id/cancelacion con el token del personal: libera el turno de
 * cualquier jugador y no le suma cancelación tardía.
 */
export async function cancelarReserva(reservaId: string): Promise<Reserva> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.cancelarComoPersonal(token, reservaId))).datos;
  }
  return (
    await pedir<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/cancelacion`, { metodo: 'POST' })
  ).datos;
}

export async function listarBloqueos(desde: string): Promise<Bloqueo[]> {
  const datos = USAR_MOCKS
    ? (await simular((token) => servidor.bloqueos(token, desde))).datos
    : await pedirLista<Bloqueo>('/bloqueos', { desde });
  return datos;
}

/**
 * POST /bloqueos. La API acepta varios espacios y devuelve la lista creada;
 * la app sigue creando uno por vez para no cambiar el flujo de la pantalla.
 */
export async function crearBloqueo(nuevo: NuevoBloqueo): Promise<BloqueoCreado> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.crearBloqueo(token, nuevo))).datos;
  }

  const r = await pedir<Bloqueo[]>('/bloqueos', {
    metodo: 'POST',
    cuerpo: {
      espacioIds: [nuevo.espacioId],
      fecha: nuevo.fecha,
      inicio: nuevo.inicio,
      fin: nuevo.fin,
      motivo: nuevo.motivo,
    },
  });
  if (!r.datos[0]) throw new Error('La API no devolvió el bloqueo creado.');
  // La API no informa cuántas reservas canceló; la pantalla muestra un mensaje genérico.
  return { bloqueo: r.datos[0], suspendidas: 0 };
}

export async function borrarBloqueo(id: string): Promise<void> {
  if (USAR_MOCKS) {
    await simular((token) => servidor.borrarBloqueo(token, id));
    return;
  }
  await pedirVacio(`/bloqueos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}

export async function crearFija(datos: DatosReservaFija): Promise<ReservaFija> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.crearFija(token, datos))).datos;
  }
  // POST /fijas no acepta `activa` (forbidNonWhitelisted).
  const { activa: _activa, ...cuerpo } = datos;
  return (await pedir<ReservaFija>('/fijas', { metodo: 'POST', cuerpo })).datos;
}

export async function editarFija(id: string, datos: DatosReservaFija): Promise<ReservaFija> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.editarFija(token, id, datos))).datos;
  }
  // PATCH /fijas no acepta `espacioId`; manda sólo los campos editables.
  const { espacioId: _espacioId, ...cuerpo } = datos;
  return (await pedir<ReservaFija>(`/fijas/${encodeURIComponent(id)}`, {
    metodo: 'PATCH',
    cuerpo,
  })).datos;
}

export async function darDeBajaFija(id: string): Promise<void> {
  if (USAR_MOCKS) {
    await simular((token) => servidor.darDeBajaFija(token, id));
    return;
  }
  await pedirVacio(`/fijas/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}
