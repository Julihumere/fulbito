import * as servidor from '@/mocks/servidor';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import type { Deporte, Espacio } from '@/tipos';
import { pedir, pedirLista, simular, subirArchivo, USAR_MOCKS } from './cliente';

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
  return datos;
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.espacio(id))
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`);
  return r.datos;
}

/** PATCH /espacios/:id — sólo administrador. */
export async function cambiarPrecio(id: string, precioPorHora: number): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.cambiarPrecio(token, id, precioPorHora))
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`, {
        metodo: 'PATCH',
        cuerpo: { precioPorHora },
      });
  return r.datos;
}

/**
 * Sube una foto del estado de la cancha con POST /archivos.
 * La API todavía no tiene un endpoint para asociarla a un espacio: se agrega
 * a la ficha y a la copia local, y queda visible en esta sesión/dispositivo.
 */
export async function agregarFoto(id: string, uriLocal: string): Promise<Espacio> {
  if (USAR_MOCKS) {
    const r = await simular((token) => servidor.agregarFoto(token, id, uriLocal));
    return r.datos;
  }

  const subido = await subirArchivo(uriLocal);
  const espacio = await obtenerEspacio(id);
  const actualizado: Espacio = {
    ...espacio,
    imagenes: [subido.url, ...espacio.imagenes.filter((url) => url !== subido.url)],
  };

  // La API no persiste la asociación; al menos la guardamos en la copia local.
  const copia = await leerDeCache<Espacio[]>(CLAVES.espacios);
  if (copia) {
    const espacios = copia.valor.map((e) => (e.id === actualizado.id ? actualizado : e));
    await guardarEnCache(CLAVES.espacios, espacios);
  }
  return actualizado;
}
