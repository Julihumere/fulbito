export type EstadoReserva = 'confirmada' | 'cancelada' | 'cumplida' | 'ausente';

export interface Reserva {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  codigoQr: string;
  estado: EstadoReserva;
  /** Cuándo escaneó el QR el encargado (ISO 8601 con zona). */
  ingresoEn: string | null;
  creadaEn: string;
  cancelableHasta: string;
}
