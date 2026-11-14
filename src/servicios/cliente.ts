/**
 * Único punto por donde la app habla con "el servidor".
 * Por defecto responde con los mocks; con EXPO_PUBLIC_USAR_MOCKS=false los
 * servicios pasan a usar `pedir()` con fetch contra EXPO_PUBLIC_API_URL.
 * Las pantallas no se enteran del cambio.
 */
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as Network from 'expo-network';
import { leerToken } from '@/almacenamiento/token';
import { configuracionMocks } from '@/mocks/configuracion';
import {
  esRespuestaError,
  type ArchivoSubido,
  type CodigoError,
  type Meta,
  type RespuestaApi,
  type RespuestaExito,
} from '@/tipos';

export const USAR_MOCKS = process.env.EXPO_PUBLIC_USAR_MOCKS !== 'false';
export const URL_API = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export class ErrorApi extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
    public readonly estado?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export const errorSinConexion = (detalle?: string) =>
  new ErrorApi(
    'SIN_CONEXION',
    `No hay conexión. Revisá los datos o el wifi y probá de nuevo.${detalle ? ` (${detalle})` : ''}`,
  );

/** Convierte cualquier cosa atrapada en un ErrorApi con un mensaje mostrable. */
export function aErrorApi(e: unknown): ErrorApi {
  if (e instanceof ErrorApi) return e;
  if (e instanceof Error) {
    return new ErrorApi('ERROR_DESCONOCIDO', `${e.name}: ${e.message}`);
  }
  return new ErrorApi('ERROR_DESCONOCIDO', `Algo falló del lado nuestro: ${String(e)}`);
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

async function construirHeaders(conJson: boolean): Promise<Record<string, string>> {
  const token = await leerToken();
  return {
    Accept: 'application/json',
    ...(conJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    throw new ErrorApi('ERROR_DESCONOCIDO', `El servidor respondió algo inesperado (${respuesta.status}).`);
  }
}

function errorDeRespuesta(json: unknown, status: number): ErrorApi {
  const respuesta = json as RespuestaApi<unknown> | null;
  if (respuesta && typeof respuesta === 'object' && esRespuestaError(respuesta)) {
    return new ErrorApi(respuesta.error.codigo, respuesta.error.mensaje, status);
  }
  return new ErrorApi('ERROR_DESCONOCIDO', `El servidor respondió con un error (${status}).`, status);
}

export async function pedir<T>(
  ruta: string,
  opciones: { metodo?: Metodo; cuerpo?: unknown } = {},
): Promise<RespuestaExito<T>> {
  if (!(await hayConexion())) throw errorSinConexion('El dispositivo figura sin conexión.');

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: await construirHeaders(opciones.cuerpo !== undefined),
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  } catch (e) {
    throw errorSinConexion(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }

  // DELETE exitoso: 204 sin cuerpo.
  if (respuesta.status === 204) {
    return { datos: undefined as T, meta: null };
  }

  const json = await leerJson(respuesta);
  if (!respuesta.ok) throw errorDeRespuesta(json, respuesta.status);
  if (!json) return { datos: undefined as T, meta: null };
  if (esRespuestaError(json as RespuestaApi<T>)) {
    throw new ErrorApi((json as { error: { codigo: CodigoError; mensaje: string } }).error.codigo,
      (json as { error: { mensaje: string } }).error.mensaje);
  }
  return json as RespuestaExito<T>;
}

/** Para endpoints DELETE que responden 204. */
export async function pedirVacio(
  ruta: string,
  opciones: { metodo?: Metodo; cuerpo?: unknown } = {},
): Promise<void> {
  await pedir<unknown>(ruta, opciones);
}

export interface OpcionesLista {
  [clave: string]: string | number | boolean | undefined;
}

/**
 * Recorre las páginas de un endpoint de lista hasta traer todos los datos.
 * La API usa `pagina`/`porPagina` (máximo 100; agenda admite 500).
 */
export async function pedirLista<T>(
  ruta: string,
  opciones: OpcionesLista = {},
  porPagina = 100,
): Promise<T[]> {
  const resultado: T[] = [];
  let pagina = 1;

  while (pagina <= 50) {
    const params = Object.entries(opciones)
      .filter(([, valor]) => valor !== undefined)
      .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);
    params.push(`pagina=${pagina}`, `porPagina=${porPagina}`);
    const separador = ruta.includes('?') ? '&' : '?';
    const respuesta = await pedir<T[]>(`${ruta}${separador}${params.join('&')}`);
    resultado.push(...respuesta.datos);

    const total = respuesta.meta?.total ?? resultado.length;
    if (respuesta.datos.length === 0 || resultado.length >= total) break;
    pagina += 1;
  }

  return resultado;
}

/** POST /archivos (multipart/form-data, campo `archivo`). */
export async function subirArchivo(uri: string): Promise<ArchivoSubido> {
  if (!(await hayConexion())) throw errorSinConexion('El dispositivo figura sin conexión.');

  const extension = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const nombre = uri.split('/').pop()?.split('?')[0] ?? `archivo-${Date.now()}.${extension}`;
  const formulario = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    formulario.append('archivo', blob, nombre);
  } else {
    // expo/fetch no acepta `{ uri, name, type }`: hay que mandar un File real,
    // que implementa Blob y expone bytes().
    const archivo = new File(uri);
    formulario.append('archivo', archivo, archivo.name || nombre);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}/archivos`, {
      method: 'POST',
      headers: await construirHeaders(false),
      body: formulario,
    });
  } catch (e) {
    throw errorSinConexion(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }

  const json = await leerJson(respuesta);
  if (!respuesta.ok) throw errorDeRespuesta(json, respuesta.status);
  if (!json || esRespuestaError(json as RespuestaApi<ArchivoSubido>)) {
    throw errorDeRespuesta(json, respuesta.status);
  }
  return (json as RespuestaExito<ArchivoSubido>).datos;
}

// ---------------------------------------------------------------- Mocks

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simula un pedido: misma demora, mismos errores y misma forma de respuesta
 * que tiene la API real.
 */
export async function simular<T>(
  producir: (token: string | null) => RespuestaApi<T> | Promise<RespuestaApi<T>>,
): Promise<RespuestaExito<T>> {
  if (!(await hayConexion())) throw errorSinConexion('El dispositivo figura sin conexión.');
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
