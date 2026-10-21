/** Reglas del documento. Las usa la app para mostrar textos y el servidor simulado para validar. */

/** Máximo de reservas activas por persona (sección 3). */
export const MAXIMO_ACTIVAS = 3;

/** Horas antes del turno hasta las que se cancela sin aviso (sección 3). */
export const HORAS_CANCELACION = 4;

/** Días hacia adelante que se pueden mirar y reservar (sección 2). */
export const DIAS_RESERVABLES = 7;

/** Horas antes del turno en que llega el recordatorio (sección 5). */
export const HORAS_RECORDATORIO = 2;

/**
 * Cancelaciones tardías a partir de las cuales la persona queda marcada.
 * El documento dice "repetidas veces" sin número (pregunta 7).
 */
export const UMBRAL_MARCADO = 3;
