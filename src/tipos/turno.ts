export type EstadoTurno = 'libre' | 'reservado' | 'fijo' | 'mantenimiento';

/** Una hora concreta de un espacio en un día concreto. Es lo que dibuja la grilla. */
export interface Turno {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string; // "HH:MM"
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
}
