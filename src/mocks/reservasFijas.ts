import type { ReservaFija } from '@/tipos';

export const reservasFijasMock: ReservaFija[] = [
  // La del documento: ocupa la Cancha 2 todos los martes a las 21.
  {
    id: 'fij-07', espacioId: 'esp-02', titular: 'Grupo de los martes',
    dia: 2, inicio: '21:00', fin: '22:00', desde: '2026-03-01', hasta: null, activa: true,
  },
  // Club con entrenamiento semanal de dos horas (dos turnos seguidos).
  {
    id: 'fij-08', espacioId: 'esp-11', titular: 'Club Atlético Villaguay — Básquet U15',
    dia: 4, inicio: '18:00', fin: '20:00', desde: '2026-03-01', hasta: '2026-12-15', activa: true,
  },
  // Fija dada de baja: no tiene que ocupar nada.
  {
    id: 'fij-03', espacioId: 'esp-01', titular: 'Escuela N° 12 — Educación Física',
    dia: 3, inicio: '09:00', fin: '10:00', desde: '2025-03-01', hasta: '2025-11-30', activa: false,
  },
];
