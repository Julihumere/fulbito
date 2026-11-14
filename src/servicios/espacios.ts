import * as servidor from '@/mocks/servidor';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import type { Deporte, Espacio } from '@/tipos';
import { pedir, pedirLista, simular, subirArchivo, USAR_MOCKS, ErrorApi } from './cliente';

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
 * Guarda una copia local de la foto y la sube a la API para asociarla al
 * espacio con POST /espacios/:id/imagenes. Así queda guardada en el servidor
 * y se ve en cualquier teléfono.
 *
 * Si la API es vieja o no hay red, la copia local queda igual y la ficha
 * sigue mostrando la foto.
 */
export async function agregarFoto(
  id: string,
  uriLocal: string,
  espacioAnterior?: Espacio
): Promise<Espacio> {
  if (USAR_MOCKS) {
    const r = await simular((token) =>
      servidor.agregarFoto(token, id, uriLocal)
    );
    return r.datos;
  }

  const fotos = await leerFotosLocales();
  const claveEspacio = String(id);
  const anteriores = fotos[claveEspacio] ?? [];

  // La copia local va primero: si falla la subida, la foto no se pierde.
  const nuevasFotos = [
    uriLocal,
    ...anteriores.filter((url) => url !== uriLocal),
  ];

  await guardarEnCache(CLAVES.fotosEspacios, {
    ...fotos,
    [claveEspacio]: nuevasFotos,
  });

  try {
    const subido = await subirArchivo(uriLocal);
    const r = await pedir<Espacio>(
      `/espacios/${encodeURIComponent(id)}/imagenes`,
      { metodo: 'POST', cuerpo: { url: subido.url } }
    );

    // La API ya tiene la foto: se guarda su URL en vez de la copia local.
    // Así `combinarFotosLocales` no la muestra dos veces.
    const actuales = (await leerFotosLocales())[claveEspacio] ?? [];
    const conApi = [
      subido.url,
      ...actuales.filter(
        (url) => url !== uriLocal && url !== subido.url
      ),
    ];

    await guardarEnCache(CLAVES.fotosEspacios, {
      ...fotos,
      [claveEspacio]: conApi,
    });

    return combinarFotosLocales(r.datos);
  } catch (e) {
    const error = e instanceof ErrorApi ? e : null;
    const apiViejaOSinRed =
      error?.codigo === 'RUTA_NO_ENCONTRADA' ||
      error?.codigo === 'SIN_CONEXION';

    if (!apiViejaOSinRed) throw e;

    const espacio = espacioAnterior ?? await obtenerEspacio(id);

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
}
