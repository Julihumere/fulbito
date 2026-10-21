/**
 * Tipos que el documento NO define y que hacen falta para avanzar.
 * Están separados a propósito: cuando la cátedra publique la API se
 * reemplazan por los oficiales sin tocar los tipos del documento.
 * Ver docs/ANALISIS.md, sección "Huecos".
 */
import type { Reserva } from './reserva';
import type { ReservaFija } from './reservaFija';
import type { Turno } from './turno';
import type { Usuario } from './usuario';

/** Respuesta del inicio de sesión (endpoint no especificado todavía). */
export interface SesionIniciada {
  token: string;
  usuario: Usuario;
}

export interface CredencialesIngreso {
  email: string;
  contrasena: string;
}

/**
 * Bloqueo por mantenimiento o lluvia. El documento sólo tiene `motivoBloqueo`
 * en el Turno; hace falta una entidad para poder cargarlos y borrarlos.
 * `inicio` y `fin` en null = el día entero.
 */
export interface Bloqueo {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string | null; // "HH:MM"
  fin: string | null;
  motivo: string;
  creadoEn: string;
}

export interface NuevoBloqueo {
  espacioId: string;
  fecha: string;
  inicio: string | null;
  fin: string | null;
  motivo: string;
}

/** Lo que manda la app para reservar. */
export interface NuevaReserva {
  turnoId: string;
  cantidadPersonas: number;
  /** El deporte que se va a jugar: importa en el gimnasio multiuso. */
  deporteId: string;
}

/** Alta o edición de una reserva fija (sin id: lo pone el servidor). */
export type DatosReservaFija = Omit<ReservaFija, 'id'>;

export type TipoNotificacion = 'suspension' | 'liberado';

/**
 * Aviso que el servidor deja para una persona: suspensión por lluvia o
 * mantenimiento, o un turno liberado en un espacio favorito.
 * En producción llegaría por push; en Expo Go la app los consulta.
 */
export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  creadaEn: string;
  leida: boolean;
}

/** Datos mínimos de quien reservó, para la agenda del encargado. */
export interface Titular {
  id: string;
  nombre: string;
  telefono: string;
  cancelacionesTardias: number;
  ausencias: number;
}

/** Una fila de la agenda del día: un turno y, si está ocupado, quién lo tiene. */
export interface EntradaAgenda {
  turno: Turno;
  reserva: Reserva | null;
  titular: Titular | null;
  /** Nombre del grupo cuando el turno lo ocupa una reserva fija. */
  titularFijo: string | null;
}

export interface CancelacionRegistrada {
  reserva: Reserva;
  /** true si se canceló pasado el límite de 4 horas: queda anotada en el usuario. */
  tardia: boolean;
}

export interface BloqueoCreado {
  bloqueo: Bloqueo;
  /** Reservas que se suspendieron por el bloqueo; a cada titular le llega un aviso. */
  suspendidas: number;
}

/** Respuesta de un escaneo válido en la puerta. */
export interface IngresoRegistrado {
  reserva: Reserva;
  turno: Turno;
  titular: Titular;
}
