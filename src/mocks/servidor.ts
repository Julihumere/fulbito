/**
 * Servidor simulado. Hace del lado "servidor" lo mismo que va a hacer la API
 * de la cátedra: valida, guarda y responde con la forma { datos, meta } /
 * { error }. Las pantallas nunca lo importan: sólo src/servicios/.
 *
 * El estado se guarda en kv-store para que las reservas sobrevivan a una
 * recarga de la app. Las fechas se siembran relativas al día en que se
 * crean los datos, así siempre hay turnos de hoy, de mañana y pasados.
 *
 * Casos feos que pide el documento:
 *  - Día entero bloqueado por lluvia: Cancha 2, el próximo sábado.
 *  - Grilla completa sin turnos libres: Cancha 1, mañana.
 *  - Espacio sin video: esp-11 (gimnasio).
 *  - Reserva cancelada: res-1171 de Emiliano.
 *  - Fija que ocupa todos los martes: fij-07.
 *  - Error de red: `simularErrorDeRed` en configuracion.ts.
 */
import Storage from 'expo-sqlite/kv-store';
import { exito, fallo, lista } from '@/servicios/cliente';
import type {
  Bloqueo,
  BloqueoCreado,
  CancelacionRegistrada,
  CredencialesIngreso,
  DatosReservaFija,
  Deporte,
  EntradaAgenda,
  Espacio,
  IngresoRegistrado,
  NuevaReserva,
  NuevoBloqueo,
  Notificacion,
  Reserva,
  ReservaFija,
  RespuestaApi,
  SesionIniciada,
  Titular,
  TipoNotificacion,
  Turno,
  Usuario,
} from '@/tipos';
import { ahoraIso, fechaCorta, hoy, instante, isoConZona, proximoDia, restarHoras, sumarDias } from '@/utilidades/fechas';
import {
  armarGrilla, armarTurno, bloqueoCubre, HORAS_DEL_DIA, idTurno, leerIdTurno, titularFijo, turnoPasado,
} from '@/utilidades/grilla';
import { DIAS_RESERVABLES, HORAS_CANCELACION, MAXIMO_ACTIVAS } from '@/utilidades/reglas';
import { deportesMock } from './deportes';
import { espaciosMock } from './espacios';
import { reservasFijasMock } from './reservasFijas';
import { credencialesMock, tokenDe, usuarioDeToken, usuariosMock } from './usuarios';

const CLAVE = 'mock.servidor';
const VERSION = 1;

interface Estado {
  version: number;
  contador: number;
  espacios: Espacio[];
  usuarios: Usuario[];
  reservas: Reserva[];
  fijas: ReservaFija[];
  bloqueos: Bloqueo[];
  notificaciones: Notificacion[];
}

let estado: Estado | null = null;

function db(): Estado {
  if (estado) return estado;
  try {
    const crudo = Storage.getItemSync(CLAVE);
    const leido = crudo ? (JSON.parse(crudo) as Estado) : null;
    estado = leido && leido.version === VERSION ? leido : sembrar();
  } catch {
    estado = sembrar();
  }
  guardar();
  return estado;
}

function guardar() {
  try {
    Storage.setItemSync(CLAVE, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento el servidor simulado sigue andando en memoria.
  }
}

/** Vuelve a los datos de prueba iniciales (botón en Ajustes). */
export function reiniciarDatosDePrueba(): void {
  estado = sembrar();
  guardar();
}

// ---------------------------------------------------------------- Siembra

const clonar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function codigoQr(numero: number, fecha: string, inicio: string): string {
  return `VGY-${numero}-${fecha.slice(5, 7)}${fecha.slice(8, 10)}-${inicio.slice(0, 2)}`;
}

function nuevaReserva(
  numero: number,
  espacioId: string,
  usuarioId: string,
  fecha: string,
  inicio: string,
  extra: Partial<Reserva> = {},
): Reserva {
  const comienzo = isoConZona(fecha, inicio);
  return {
    id: `res-${numero}`,
    turnoId: idTurno(espacioId, fecha, inicio),
    espacioId,
    usuarioId,
    cantidadPersonas: 10,
    codigoQr: codigoQr(numero, fecha, inicio),
    estado: 'confirmada',
    ingresoEn: null,
    creadaEn: restarHoras(comienzo, 72),
    cancelableHasta: restarHoras(comienzo, HORAS_CANCELACION),
    ...extra,
  };
}

function sembrar(): Estado {
  const h = hoy();
  const manana = sumarDias(h, 1);
  const horaAhora = Number(ahoraIso().slice(11, 13));
  // Un turno de hoy para Emiliano, unas horas más tarde; si ya es de noche, mañana.
  const [fechaHoy, horaHoy] = horaAhora + 3 <= 23 ? [h, horaAhora + 3] : [manana, 19];
  const inicioHoy = `${String(Math.max(horaHoy, 8)).padStart(2, '0')}:00`;
  // Sábado de lluvia: al menos dos días adelante, para no pisar los turnos de hoy y mañana.
  const sabadoLluvia = proximoDia(6, 2);

  const reservas: Reserva[] = [
    // Emiliano (usr-207): próximas, pasadas, cancelada y ausente.
    nuevaReserva(1180, 'esp-02', 'usr-207', fechaHoy, inicioHoy),
    nuevaReserva(1181, 'esp-09', 'usr-207', sumarDias(h, 3), '18:00', { cantidadPersonas: 4 }),
    nuevaReserva(1170, 'esp-02', 'usr-207', sumarDias(h, -5), '20:00', {
      estado: 'cumplida',
      ingresoEn: `${sumarDias(h, -5)}T19:56:00-03:00`,
    }),
    nuevaReserva(1171, 'esp-04', 'usr-207', sumarDias(h, -2), '19:00', { estado: 'cancelada' }),
    nuevaReserva(1172, 'esp-01', 'usr-207', sumarDias(h, -9), '21:00', { estado: 'ausente' }),
    // Suspendida por la lluvia: la Dirección la canceló y le dejó un aviso.
    nuevaReserva(1173, 'esp-02', 'usr-207', sabadoLluvia, '19:00', { estado: 'cancelada' }),
    // Lucía.
    nuevaReserva(1175, 'esp-10', 'usr-318', sumarDias(h, 2), '10:00', { cantidadPersonas: 2 }),
  ];

  // Cancha 1 llena todo el día de mañana.
  const otros = ['usr-401', 'usr-402', 'usr-403'];
  HORAS_DEL_DIA.forEach((inicio, i) => {
    reservas.push(nuevaReserva(1200 + i, 'esp-01', otros[i % otros.length], manana, inicio));
  });

  const bloqueos: Bloqueo[] = [
    {
      id: 'blq-01', espacioId: 'esp-02', fecha: sabadoLluvia, inicio: null, fin: null,
      motivo: 'Cancha anegada por la lluvia', creadoEn: ahoraIso(),
    },
    {
      id: 'blq-02', espacioId: 'esp-07', fecha: manana, inicio: '20:00', fin: '22:00',
      motivo: 'Cambio de red y arreglo de postes', creadoEn: ahoraIso(),
    },
  ];

  const notificaciones: Notificacion[] = [
    {
      id: 'ntf-01', usuarioId: 'usr-207', tipo: 'suspension',
      titulo: 'Turno suspendido',
      mensaje: `Cancha 2 — Fútbol 5, ${fechaCorta(sabadoLluvia)} a las 19: cancha anegada por la lluvia. Tu reserva quedó cancelada.`,
      espacioId: 'esp-02', fecha: sabadoLluvia, inicio: '19:00', creadaEn: ahoraIso(), leida: false,
    },
  ];

  return {
    version: VERSION,
    contador: 1300,
    espacios: clonar(espaciosMock),
    usuarios: clonar(usuariosMock),
    reservas,
    fijas: clonar(reservasFijasMock),
    bloqueos,
    notificaciones,
  };
}

// ---------------------------------------------------------------- Ayudantes

type R<T> = RespuestaApi<T>;

const usuarioDe = (token: string | null) => (token ? db().usuarios.find((u) => u.id === usuarioDeToken(token)) : undefined);
const esPersonal = (u: Usuario | undefined) => u?.rol === 'encargado' || u?.rol === 'administrador';
const espacioDe = (id: string) => db().espacios.find((e) => e.id === id);

const noAutorizado = () => fallo('NO_AUTORIZADO', 'Entrá con tu cuenta para seguir.');
const sinPermiso = () => fallo('SIN_PERMISO', 'Esto sólo lo puede hacer el personal de la Dirección.');

function titularDe(usuarioId: string): Titular | null {
  const u = db().usuarios.find((x) => x.id === usuarioId);
  if (!u) return null;
  return { id: u.id, nombre: u.nombre, telefono: u.telefono, cancelacionesTardias: u.cancelacionesTardias, ausencias: u.ausencias };
}

function turnoDe(turnoId: string): Turno | null {
  const partes = leerIdTurno(turnoId);
  const espacio = partes && espacioDe(partes.espacioId);
  if (!partes || !espacio) return null;
  const { reservas, fijas, bloqueos } = db();
  return armarTurno({ espacio, fecha: partes.fecha, reservas, fijas, bloqueos }, partes.inicio);
}

/** Confirmadas cuyo turno todavía no terminó. */
function activasDe(usuarioId: string, ahora: number): Reserva[] {
  return db().reservas.filter((r) => {
    if (r.usuarioId !== usuarioId || r.estado !== 'confirmada') return false;
    const p = leerIdTurno(r.turnoId);
    return p !== null && instante(p.fecha, p.inicio) + 60 * 60 * 1000 > ahora;
  });
}

function notificar(usuarioId: string, tipo: TipoNotificacion, titulo: string, mensaje: string, t: Turno) {
  const s = db();
  s.contador += 1;
  s.notificaciones.push({
    id: `ntf-${s.contador}`, usuarioId, tipo, titulo, mensaje,
    espacioId: t.espacioId, fecha: t.fecha, inicio: t.inicio, creadaEn: ahoraIso(), leida: false,
  });
}

const horaTexto = (inicio: string) => String(Number(inicio.slice(0, 2)));

// ---------------------------------------------------------------- Sesión

export function ingresar(credenciales: CredencialesIngreso): R<SesionIniciada> {
  const email = credenciales.email.trim().toLowerCase();
  const c = credencialesMock.find((x) => x.email === email && x.contrasena === credenciales.contrasena);
  const usuario = c && db().usuarios.find((u) => u.id === c.usuarioId);
  if (!usuario) return fallo('CREDENCIALES_INVALIDAS', 'El email o la contraseña no coinciden.');
  return exito({ token: tokenDe(usuario.id), usuario });
}

export function perfil(token: string | null): R<Usuario> {
  const u = usuarioDe(token);
  return u ? exito(u) : fallo('NO_AUTORIZADO', 'Tu sesión venció. Entrá de nuevo.');
}

export function alternarFavorito(token: string | null, espacioId: string): R<Usuario> {
  const u = usuarioDe(token);
  if (!u) return noAutorizado();
  if (!espacioDe(espacioId)) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  u.espaciosFavoritos = u.espaciosFavoritos.includes(espacioId)
    ? u.espaciosFavoritos.filter((id) => id !== espacioId)
    : [...u.espaciosFavoritos, espacioId];
  guardar();
  return exito(u);
}

// ---------------------------------------------------------------- Catálogo

export const deportes = (): R<Deporte[]> => lista(deportesMock);
export const espacios = (): R<Espacio[]> => lista(db().espacios);

export function espacio(id: string): R<Espacio> {
  const e = espacioDe(id);
  return e ? exito(e) : fallo('NO_ENCONTRADO', 'Ese espacio no existe o se dio de baja.');
}

export function cambiarPrecio(token: string | null, id: string, precio: number): R<Espacio> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const e = espacioDe(id);
  if (!e) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  if (!Number.isInteger(precio) || precio <= 0) return fallo('DATOS_INVALIDOS', 'El precio tiene que ser un número entero mayor a cero.');
  e.precioPorHora = precio;
  guardar();
  return exito(e);
}

export function agregarFoto(token: string | null, id: string, uri: string): R<Espacio> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const e = espacioDe(id);
  if (!e) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  e.imagenes = [uri, ...e.imagenes];
  guardar();
  return exito(e);
}

// ---------------------------------------------------------------- Disponibilidad

export function grilla(espacioId: string, fecha: string): R<Turno[]> {
  const e = espacioDe(espacioId);
  if (!e) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  const { reservas, fijas, bloqueos } = db();
  return lista(armarGrilla({ espacio: e, fecha, reservas, fijas, bloqueos }));
}

export function turno(id: string): R<Turno> {
  const t = turnoDe(id);
  return t ? exito(t) : fallo('NO_ENCONTRADO', 'No encontramos ese turno.');
}

export function fijas(espacioId: string | null): R<ReservaFija[]> {
  return lista(db().fijas.filter((f) => espacioId === null || f.espacioId === espacioId));
}

// ---------------------------------------------------------------- Reservas

export function misReservas(token: string | null): R<Reserva[]> {
  const u = usuarioDe(token);
  if (!u) return fallo('NO_AUTORIZADO', 'Entrá con tu cuenta para ver tus reservas.');
  return lista(db().reservas.filter((r) => r.usuarioId === u.id));
}

export function crearReserva(token: string | null, pedido: NuevaReserva): R<Reserva> {
  const u = usuarioDe(token);
  if (!u) return fallo('NO_AUTORIZADO', 'Entrá con tu cuenta para reservar.');
  const partes = leerIdTurno(pedido.turnoId);
  const e = partes && espacioDe(partes.espacioId);
  const t = turnoDe(pedido.turnoId);
  if (!partes || !e || !t) return fallo('NO_ENCONTRADO', 'No encontramos ese turno.');

  const ahora = Date.now();
  const h = hoy();
  if (partes.fecha < h || partes.fecha > sumarDias(h, DIAS_RESERVABLES - 1)) {
    return fallo('DATOS_INVALIDOS', `Se reserva con hasta ${DIAS_RESERVABLES} días de anticipación.`);
  }
  if (!e.activo) return fallo('ESPACIO_INACTIVO', 'Este espacio está fuera de servicio.');
  if (t.estado === 'mantenimiento') return fallo('TURNO_OCUPADO', `Ese turno está bloqueado: ${t.motivoBloqueo ?? 'mantenimiento'}.`);
  if (t.estado !== 'libre') return fallo('TURNO_OCUPADO', 'Ese turno ya fue reservado.');
  if (turnoPasado(t, ahora)) return fallo('TURNO_PASADO', 'Ese turno ya empezó. Elegí uno más tarde.');
  if (activasDe(u.id, ahora).length >= MAXIMO_ACTIVAS) {
    return fallo('LIMITE_RESERVAS', `Ya tenés ${MAXIMO_ACTIVAS} reservas activas. Cancelá una o esperá a jugarla.`);
  }
  if (!Number.isInteger(pedido.cantidadPersonas) || pedido.cantidadPersonas < 1 || pedido.cantidadPersonas > e.capacidad) {
    return fallo('CAPACIDAD_EXCEDIDA', `En este espacio entran hasta ${e.capacidad} personas.`);
  }

  const s = db();
  s.contador += 1;
  const reserva = nuevaReserva(s.contador, e.id, u.id, t.fecha, t.inicio, {
    cantidadPersonas: pedido.cantidadPersonas,
    creadaEn: ahoraIso(ahora),
  });
  s.reservas.push(reserva);
  guardar();
  return exito(reserva);
}

export function cancelarReserva(token: string | null, id: string): R<CancelacionRegistrada> {
  const u = usuarioDe(token);
  if (!u) return noAutorizado();
  const r = db().reservas.find((x) => x.id === id && x.usuarioId === u.id);
  if (!r) return fallo('NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (r.estado !== 'confirmada') return fallo('NO_CANCELABLE', 'Esa reserva ya no está activa.');
  const t = turnoDe(r.turnoId);
  const ahora = Date.now();
  if (!t || turnoPasado(t, ahora)) return fallo('NO_CANCELABLE', 'El turno ya empezó: no se puede cancelar.');

  // Pasado el límite se cancela igual (así el turno se libera), pero queda anotado (pregunta 7).
  const tardia = Date.parse(r.cancelableHasta) < ahora;
  r.estado = 'cancelada';
  if (tardia) u.cancelacionesTardias += 1;

  // Aviso a quienes tienen el espacio de favorito (pregunta: sólo dentro de los 7 días).
  const e = espacioDe(r.espacioId);
  if (e && t.fecha <= sumarDias(hoy(), DIAS_RESERVABLES - 1)) {
    db()
      .usuarios.filter((x) => x.id !== u.id && x.espaciosFavoritos.includes(e.id))
      .forEach((x) =>
        notificar(x.id, 'liberado', 'Se liberó un turno',
          `${e.nombre}: ${fechaCorta(t.fecha)} a las ${horaTexto(t.inicio)} quedó libre.`, t),
      );
  }
  guardar();
  return exito({ reserva: r, tardia });
}

// ---------------------------------------------------------------- Ingreso y agenda

export function validarIngreso(token: string | null, codigo: string, espacioId: string): R<IngresoRegistrado> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const r = db().reservas.find((x) => x.codigoQr === codigo.trim().toUpperCase());
  const t = r && turnoDe(r.turnoId);
  if (!r || !t) return fallo('QR_INVALIDO', 'Este código no corresponde a ninguna reserva.');
  const titular = titularDe(r.usuarioId);
  if (!titular) return fallo('QR_INVALIDO', 'La reserva no tiene titular.');

  if (r.estado === 'cancelada') return fallo('QR_CANCELADO', 'Esta reserva está cancelada.');
  if (r.estado === 'ausente') return fallo('QR_CANCELADO', 'Esta reserva quedó marcada como ausente.');
  if (t.fecha !== hoy()) return fallo('QR_OTRO_DIA', `Este código es del ${fechaCorta(t.fecha)}, no de hoy.`);
  if (r.espacioId !== espacioId) {
    return fallo('QR_OTRA_CANCHA', `Este código es de ${espacioDe(r.espacioId)?.nombre ?? 'otro espacio'}.`);
  }
  if (r.estado === 'cumplida') {
    return fallo('QR_YA_USADO', `Este código ya se usó a las ${r.ingresoEn?.slice(11, 16) ?? '—'}.`);
  }
  r.estado = 'cumplida';
  r.ingresoEn = ahoraIso();
  guardar();
  return exito({ reserva: r, turno: t, titular });
}

/** Presente a mano, para cuando el QR no se puede leer. */
export function marcarPresente(token: string | null, reservaId: string): R<Reserva> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const r = db().reservas.find((x) => x.id === reservaId);
  if (!r) return fallo('NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (r.estado !== 'confirmada') return fallo('DATOS_INVALIDOS', 'Esa reserva ya no está pendiente.');
  r.estado = 'cumplida';
  r.ingresoEn = ahoraIso();
  guardar();
  return exito(r);
}

export function marcarAusente(token: string | null, reservaId: string): R<Reserva> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const r = db().reservas.find((x) => x.id === reservaId);
  const t = r && turnoDe(r.turnoId);
  if (!r || !t) return fallo('NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (r.estado !== 'confirmada') return fallo('DATOS_INVALIDOS', 'Esa reserva ya no está pendiente.');
  if (!turnoPasado(t, Date.now())) return fallo('DATOS_INVALIDOS', 'El turno todavía no empezó.');
  r.estado = 'ausente';
  const u = db().usuarios.find((x) => x.id === r.usuarioId);
  if (u) u.ausencias += 1;
  guardar();
  return exito(r);
}

export function agenda(token: string | null, fecha: string): R<EntradaAgenda[]> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const { espacios: todos, reservas, fijas: todasFijas, bloqueos } = db();
  const entradas = todos.flatMap((e) =>
    armarGrilla({ espacio: e, fecha, reservas, fijas: todasFijas, bloqueos }).map((t): EntradaAgenda => {
      // La agenda muestra también las cumplidas y ausentes del día.
      const reserva = reservas.find((r) => r.turnoId === t.id && r.estado !== 'cancelada') ?? null;
      return {
        turno: t,
        reserva,
        titular: reserva ? titularDe(reserva.usuarioId) : null,
        titularFijo: t.estado === 'fijo' ? titularFijo(todasFijas, t) : null,
      };
    }),
  );
  return lista(entradas);
}

// ---------------------------------------------------------------- Bloqueos

export function bloqueos(token: string | null, desde: string): R<Bloqueo[]> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  return lista(
    db()
      .bloqueos.filter((b) => b.fecha >= desde)
      .sort((a, b) => (a.fecha + (a.inicio ?? '')).localeCompare(b.fecha + (b.inicio ?? ''))),
  );
}

export function crearBloqueo(token: string | null, nuevo: NuevoBloqueo): R<BloqueoCreado> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const e = espacioDe(nuevo.espacioId);
  if (!e) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  if (!nuevo.motivo.trim()) return fallo('DATOS_INVALIDOS', 'Escribí el motivo: se lo mostramos a quienes tenían turno.');
  if ((nuevo.inicio === null) !== (nuevo.fin === null) || (nuevo.inicio && nuevo.fin && nuevo.inicio >= nuevo.fin)) {
    return fallo('DATOS_INVALIDOS', 'La hora de fin tiene que ser posterior a la de inicio.');
  }
  if (nuevo.fecha < hoy()) return fallo('DATOS_INVALIDOS', 'No se puede bloquear un día que ya pasó.');

  const s = db();
  s.contador += 1;
  const bloqueo: Bloqueo = { id: `blq-${s.contador}`, ...nuevo, motivo: nuevo.motivo.trim(), creadoEn: ahoraIso() };

  // Las reservas confirmadas que tapa el bloqueo se suspenden y se avisa a cada titular.
  const afectadas = s.reservas.filter((r) => {
    const p = leerIdTurno(r.turnoId);
    return r.estado === 'confirmada' && p !== null && bloqueoCubre(bloqueo, p.espacioId, p.fecha, p.inicio);
  });
  afectadas.forEach((r) => {
    r.estado = 'cancelada';
    const t = turnoDe(r.turnoId);
    if (t) {
      notificar(r.usuarioId, 'suspension', 'Turno suspendido',
        `${e.nombre}, ${fechaCorta(t.fecha)} a las ${horaTexto(t.inicio)}: ${bloqueo.motivo}. Tu reserva quedó cancelada y no cuenta como cancelación tardía.`, t);
    }
  });
  s.bloqueos.push(bloqueo);
  guardar();
  return exito({ bloqueo, suspendidas: afectadas.length });
}

export function borrarBloqueo(token: string | null, id: string): R<Bloqueo> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const s = db();
  const b = s.bloqueos.find((x) => x.id === id);
  if (!b) return fallo('NO_ENCONTRADO', 'Ese bloqueo ya no existe.');
  s.bloqueos = s.bloqueos.filter((x) => x.id !== id);
  guardar();
  return exito(b);
}

// ---------------------------------------------------------------- Reservas fijas

function validarFija(datos: DatosReservaFija, idPropio: string | null): RespuestaApi<never> | null {
  if (!espacioDe(datos.espacioId)) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  if (!datos.titular.trim()) return fallo('DATOS_INVALIDOS', 'Escribí a nombre de quién es la fija.');
  if (datos.inicio >= datos.fin) return fallo('DATOS_INVALIDOS', 'La hora de fin tiene que ser posterior a la de inicio.');
  if (datos.hasta !== null && datos.hasta < datos.desde) return fallo('DATOS_INVALIDOS', '"Hasta" no puede ser anterior a "desde".');
  const pisada = db().fijas.find(
    (f) =>
      f.id !== idPropio && f.activa && datos.activa &&
      f.espacioId === datos.espacioId && f.dia === datos.dia &&
      f.inicio < datos.fin && datos.inicio < f.fin &&
      (f.hasta === null || f.hasta >= datos.desde) && (datos.hasta === null || datos.hasta >= f.desde),
  );
  if (pisada) return fallo('TURNO_OCUPADO', `Se pisa con la fija de "${pisada.titular}".`);
  return null;
}

export function crearFija(token: string | null, datos: DatosReservaFija): R<ReservaFija> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const error = validarFija(datos, null);
  if (error) return error;
  const s = db();
  s.contador += 1;
  const fija: ReservaFija = { id: `fij-${s.contador}`, ...datos, titular: datos.titular.trim() };
  s.fijas.push(fija);
  guardar();
  return exito(fija);
}

export function editarFija(token: string | null, id: string, datos: DatosReservaFija): R<ReservaFija> {
  if (!esPersonal(usuarioDe(token))) return sinPermiso();
  const f = db().fijas.find((x) => x.id === id);
  if (!f) return fallo('NO_ENCONTRADO', 'Esa reserva fija no existe.');
  const error = validarFija(datos, id);
  if (error) return error;
  Object.assign(f, datos, { titular: datos.titular.trim() });
  guardar();
  return exito(f);
}

// ---------------------------------------------------------------- Avisos

export function notificaciones(token: string | null): R<Notificacion[]> {
  const u = usuarioDe(token);
  if (!u) return noAutorizado();
  return lista(
    db()
      .notificaciones.filter((n) => n.usuarioId === u.id)
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)),
  );
}

export function marcarLeidas(token: string | null): R<number> {
  const u = usuarioDe(token);
  if (!u) return noAutorizado();
  let n = 0;
  db().notificaciones.forEach((x) => {
    if (x.usuarioId === u.id && !x.leida) {
      x.leida = true;
      n += 1;
    }
  });
  guardar();
  return exito(n);
}
