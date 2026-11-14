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

export interface ResultadoFoto {
  espacio: Espacio;
  /** true si la foto llegó al servidor; false si quedó solo en el teléfono. */
  subida: boolean;
  /** Por qué quedó local, para mostrarlo en la ficha. */
  motivo?: string;
}

/**
 * Guarda una copia local de la foto y la sube a la API para asociarla al
 * espacio con POST /espacios/:id/imagenes. Así queda guardada en el servidor
 * y se ve en cualquier teléfono.
 *
 * Si la API es vieja o no hay red, la copia local queda igual y la ficha
 * sigue mostrando la foto, pero se avisa que no se subió.
 */
export async function agregarFoto(
  id: string,
  uriLocal: string,
  espacioAnterior?: Espacio
): Promise<ResultadoFoto> {
  if (USAR_MOCKS) {
    const r = await simular((token) =>
      servidor.agregarFoto(token, id, uriLocal)
    );
    return {
      espacio: r.datos,
      subida: false,
      motivo: 'Modo de prueba: la foto queda solo en este teléfono.',
    };
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

    return {
      espacio: await combinarFotosLocales(r.datos),
      subida: true,
    };
  } catch (e) {
    const error = e instanceof ErrorApi ? e : null;
    const apiViejaOSinRed =
      error?.codigo === 'RUTA_NO_ENCONTRADA' ||
      error?.codigo === 'SIN_CONEXION';

    if (!apiViejaOSinRed) throw e;

    const espacio = espacioAnterior ?? await obtenerEspacio(id);

    return {
      espacio: {
        ...espacio,
        imagenes: [
          ...nuevasFotos,
          ...espacio.imagenes.filter(
            (url) => !nuevasFotos.includes(url)
          ),
        ],
      },
      subida: false,
      motivo:
        error?.codigo === 'SIN_CONEXION'
          ? 'Sin conexión: la foto quedó solo en este teléfono.'
          : 'La API no tiene el endpoint de fotos: la foto quedó solo en este teléfono.',
    };
  }
}
