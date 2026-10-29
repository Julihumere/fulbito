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
  | 'VALIDACION_FALLIDA'
  | 'CREDENCIALES_INVALIDAS'
  | 'NO_AUTENTICADO'
  | 'NO_AUTORIZADO'
  | 'SIN_PERMISO'
  | 'EMAIL_YA_REGISTRADO'
  | 'TURNO_OCUPADO'
  | 'TURNO_PASADO'
  | 'TURNO_NO_ENCONTRADO'
  | 'TURNO_NO_DISPONIBLE'
  | 'LIMITE_DE_RESERVAS'
  | 'LIMITE_RESERVAS'
  | 'CAPACIDAD_EXCEDIDA'
  | 'ESPACIO_NO_ENCONTRADO'
  | 'ESPACIO_INACTIVO'
  | 'RESERVA_NO_ENCONTRADA'
  | 'RESERVA_NO_CANCELABLE'
  | 'RESERVA_CANCELADA'
  | 'RESERVA_AUSENTE'
  | 'CANCELACION_FUERA_DE_PLAZO'
  | 'CODIGO_INVALIDO'
  | 'CODIGO_DE_OTRO_DIA'
  | 'CODIGO_DE_OTRO_ESPACIO'
  | 'INGRESO_YA_REGISTRADO'
  | 'FUERA_DE_HORARIO'
  | 'ANTES_DE_TIEMPO'
  | 'FECHA_FUERA_DE_RANGO'
  | 'FECHA_PASADA'
  | 'MOTIVO_REQUERIDO'
  | 'FIJA_SUPERPUESTA'
  | 'CONFLICTO_CON_RESERVAS'
  | 'FIJA_NO_ENCONTRADA'
  | 'BLOQUEO_NO_ENCONTRADO'
  | 'NO_IMPLEMENTADO'
  | 'ARCHIVO_DEMASIADO_GRANDE'
  | 'TIPO_DE_ARCHIVO_NO_PERMITIDO'
  | 'ALMACEN_NO_DISPONIBLE'
  | 'NO_CANCELABLE'
  | 'QR_INVALIDO'
  | 'QR_OTRO_DIA'
  | 'QR_OTRA_CANCHA'
  | 'QR_CANCELADO'
  | 'QR_YA_USADO'
  | 'DATOS_INVALIDOS'
  | 'NO_ENCONTRADO'
  | 'SIN_CONEXION'
  | 'ERROR_DESCONOCIDO'
  | (string & {});

/** Respuesta de POST /archivos. */
export interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}

/** Respuesta de POST /dispositivos. */
export interface DispositivoPush {
  tokenExpo: string;
  plataforma: 'ios' | 'android';
}

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
