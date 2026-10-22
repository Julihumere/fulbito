/**
 * Único punto por donde la app habla con "el servidor".
 * Por defecto responde con los mocks; con EXPO_PUBLIC_USAR_MOCKS=false los
 * servicios pasan a usar `pedir()` con fetch contra EXPO_PUBLIC_API_URL.
 * Las pantallas no se enteran del cambio.
 */
import * as Network from 'expo-network';
import { leerToken } from '@/almacenamiento/token';
import { configuracionMocks } from '@/mocks/configuracion';
import {
  esRespuestaError,
  type CodigoError,
  type Meta,
  type RespuestaApi,
  type RespuestaExito,
} from '@/tipos';

export const USAR_MOCKS = process.env.EXPO_PUBLIC_USAR_MOCKS !== 'false';
export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.villaguay.gob.ar';

export class ErrorApi extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export const errorSinConexion = () =>
  new ErrorApi('SIN_CONEXION', 'No hay conexión. Revisá los datos o el wifi y probá de nuevo.');

/** Convierte cualquier cosa atrapada en un ErrorApi con un mensaje mostrable. */
export function aErrorApi(e: unknown): ErrorApi {
  if (e instanceof ErrorApi) return e;
  return new ErrorApi('ERROR_DESCONOCIDO', 'Algo falló del lado nuestro. Probá de nuevo en un rato.');
}

async function hayConexion(): Promise<boolean> {
  try {
    const estado = await Network.getNetworkStateAsync();
    // isInternetReachable puede venir undefined: en ese caso no bloqueamos.
    return estado.isConnected !== false && estado.isInternetReachable !== false;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------- API real

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function pedir<T>(
  ruta: string,
  opciones: { metodo?: Metodo; cuerpo?: unknown } = {},
): Promise<RespuestaExito<T>> {
  if (!(await hayConexion())) throw errorSinConexion();

  const token = await leerToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  } catch {
    throw errorSinConexion();
  }

  let json: RespuestaApi<T>;
  try {
    json = (await respuesta.json()) as RespuestaApi<T>;
  } catch {
    throw new ErrorApi('ERROR_DESCONOCIDO', `El servidor respondió algo inesperado (${respuesta.status}).`);
  }
  if (esRespuestaError(json)) throw new ErrorApi(json.error.codigo, json.error.mensaje);
  return json;
}

// ---------------------------------------------------------------- Mocks

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simula un pedido: misma demora, mismos errores y misma forma de respuesta
 * que va a tener la API real.
 */
export async function simular<T>(
  producir: (token: string | null) => RespuestaApi<T> | Promise<RespuestaApi<T>>,
): Promise<RespuestaExito<T>> {
  if (!(await hayConexion())) throw errorSinConexion();
  await esperar(configuracionMocks.demoraMs);
  if (configuracionMocks.simularErrorDeRed) throw errorSinConexion();

  const respuesta = await producir(await leerToken());
  if (esRespuestaError(respuesta)) throw new ErrorApi(respuesta.error.codigo, respuesta.error.mensaje);
  return respuesta;
}

/** Ayudantes para armar respuestas con la forma del documento. */
export const exito = <T>(datos: T, meta: Meta | null = null): RespuestaExito<T> => ({ datos, meta });
export const lista = <T>(datos: T[]): RespuestaExito<T[]> =>
  exito(datos, { total: datos.length, pagina: 1, porPagina: 20 });
export const fallo = (codigo: CodigoError, mensaje: string) => ({ error: { codigo, mensaje } });
