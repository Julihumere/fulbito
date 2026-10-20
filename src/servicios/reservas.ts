/**
 * Capa de servicios de reservas y turnos (src/servicios/reservas.ts,
 * como pide el documento). Hoy devuelve mocks; mañana hace fetch.
 */
import type { Reserva, Turno } from '@/tipos';
import { fallo, lista, pedir, simular, USAR_MOCKS } from './cliente';

/** Reservas del usuario de la sesión (todas: próximas, pasadas y canceladas). */
export async function listarMisReservas(): Promise<Reserva[]> {
  const r = USAR_MOCKS
    ? await simular((token) => {
        if (!token) return fallo('NO_AUTORIZADO', 'Entrá con tu cuenta para ver tus reservas.');
        // Sin datos de prueba: hasta conectar la API real nadie tiene reservas.
        return lista<Reserva>([]);
      })
    : await pedir<Reserva[]>('/reservas/mias');
  return r.datos;
}

/**
 * La Reserva del documento no trae fecha ni hora: hay que pedir su Turno.
 * Ver "Huecos" en el análisis.
 */
export async function obtenerTurno(id: string): Promise<Turno> {
  const r = USAR_MOCKS
    ? await simular<Turno>(() => fallo('NO_ENCONTRADO', 'No encontramos ese turno.'))
    : await pedir<Turno>(`/turnos/${encodeURIComponent(id)}`);
  return r.datos;
}
