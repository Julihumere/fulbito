
import * as servidor from '@/mocks/servidor';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import type { Deporte, Espacio } from '@/tipos';
import { pedir, pedirLista, simular, USAR_MOCKS } from './cliente';

type FotosLocales = Record<string, string[]>;

async function leerFotosLocales(): Promise<FotosLocales> {
  const copia = await leerDeCache<FotosLocales>(CLAVES.fotosEspacios);
  return copia?.valor ?? {};
}

async function combinarFotosLocales(espacio: Espacio): Promise<Espacio> {
  const fotos = await leerFotosLocales();
  const locales = fotos[String(espacio.id)] ?? [];

  return {
    ...espacio,
    imagenes: [
      ...locales,
      ...espacio.imagenes.filter((url) => !locales.includes(url)),
    ],
  };
}

export async function listarDeportes(): Promise<Deporte[]> {
  const datos = USAR_MOCKS
    ? (await simular(() => servidor.deportes())).datos
    : await pedirLista<Deporte>('/deportes');

  return datos;
}

/** La API devuelve los espacios activos. */
export async function listarEspacios(): Promise<Espacio[]> {
  const datos = USAR_MOCKS
    ? (await simular(() => servidor.espacios())).datos
    : await pedirLista<Espacio>('/espacios');

  return Promise.all(datos.map(combinarFotosLocales));
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.espacio(id))
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`);

  return combinarFotosLocales(r.datos);
}

/** PATCH /espacios/:id — sólo administrador. */
export async function cambiarPrecio(
  id: string,
  precioPorHora: number
): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular((token) =>
        servidor.cambiarPrecio(token, id, precioPorHora)
      )
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`, {
        metodo: 'PATCH',
        cuerpo: { precioPorHora },
      });

  return r.datos;
}

/**
 * Guarda fotografías localmente y las asocia a cada cancha.
 * No utiliza POST /archivos.
 */
export async function agregarFoto(
  id: string,
  uriLocal: string,
  espacioAnterior?: Espacio
): Promise<Espacio> {
  const espacio = espacioAnterior ?? await obtenerEspacio(id);

  const fotos = await leerFotosLocales();
  const claveEspacio = String(id);
  const anteriores = fotos[claveEspacio] ?? [];

  const nuevasFotos = [
    uriLocal,
    ...anteriores.filter((url) => url !== uriLocal),
  ];

  await guardarEnCache(CLAVES.fotosEspacios, {
    ...fotos,
    [claveEspacio]: nuevasFotos,
  });

  return {
    ...espacio,
    imagenes: [
      ...nuevasFotos,
      ...espacio.imagenes.filter(
        (url) => !nuevasFotos.includes(url)
      ),
    ],
  };
}
