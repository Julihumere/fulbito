import * as servidor from '@/mocks/servidor';
import type { Deporte, Espacio } from '@/tipos';
import { pedir, simular, USAR_MOCKS } from './cliente';

export async function listarDeportes(): Promise<Deporte[]> {
  const r = USAR_MOCKS ? await simular(() => servidor.deportes()) : await pedir<Deporte[]>('/deportes');
  return r.datos;
}

/** Los 11 espacios entran en una página; la paginación se suma si la API la exige. */
export async function listarEspacios(): Promise<Espacio[]> {
  const r = USAR_MOCKS ? await simular(() => servidor.espacios()) : await pedir<Espacio[]>('/espacios');
  return r.datos;
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.espacio(id))
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`);
  return r.datos;
}

/** PATCH /espacios/:id — sólo encargado o administrador. */
export async function cambiarPrecio(id: string, precioPorHora: number): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.cambiarPrecio(token, id, precioPorHora))
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo: { precioPorHora } });
  return r.datos;
}

/**
 * Foto del estado de la cancha, elegida de la galería.
 * Con la API real se sube el archivo; el formato (multipart, URL firmada) está por definirse.
 */
export async function agregarFoto(id: string, uriLocal: string): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.agregarFoto(token, id, uriLocal))
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}/imagenes`, { metodo: 'POST', cuerpo: { uri: uriLocal } });
  return r.datos;
}
