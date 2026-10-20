/** 0 = domingo … 6 = sábado */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Una reserva fija NO es un turno: es una regla que ocupa el mismo turno
 * todas las semanas mientras esté vigente.
 */
export interface ReservaFija {
  id: string;
  espacioId: string;
  titular: string;
  dia: DiaSemana;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}
