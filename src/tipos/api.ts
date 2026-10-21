/** Forma fija de las respuestas de la API de la cátedra. */

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaExito<T> {
  datos: T;
  /** Convención del documento: un campo sin valor viaja como null, no ausente. */
  meta: Meta | null;
}

/**
 * Códigos conocidos. El documento sólo nombra TURNO_OCUPADO; el resto son los
 * que usa esta app hasta que la cátedra publique la lista oficial.
 * `(string & {})` permite recibir códigos nuevos sin romper el tipado.
 */
export type CodigoError =
  | 'TURNO_OCUPADO'
  | 'TURNO_PASADO'
  | 'LIMITE_RESERVAS'
  | 'CAPACIDAD_EXCEDIDA'
  | 'ESPACIO_INACTIVO'
  | 'NO_CANCELABLE'
  | 'QR_INVALIDO'
  | 'QR_OTRO_DIA'
  | 'QR_OTRA_CANCHA'
  | 'QR_CANCELADO'
  | 'QR_YA_USADO'
  | 'DATOS_INVALIDOS'
  | 'SIN_PERMISO'
  | 'CREDENCIALES_INVALIDAS'
  | 'NO_AUTORIZADO'
  | 'NO_ENCONTRADO'
  | 'SIN_CONEXION'
  | 'ERROR_DESCONOCIDO'
  | (string & {});

export interface RespuestaError {
  error: {
    codigo: CodigoError;
    mensaje: string;
  };
}

export type RespuestaApi<T> = RespuestaExito<T> | RespuestaError;

export function esRespuestaError<T>(r: RespuestaApi<T>): r is RespuestaError {
  return (r as RespuestaError).error !== undefined;
}
