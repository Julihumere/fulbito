import { deportesMock } from '@/mocks/deportes';
import { espaciosMock } from '@/mocks/espacios';
import type { Deporte, Espacio } from '@/tipos';
import { exito, fallo, lista, pedir, simular, USAR_MOCKS } from './cliente';

export async function listarDeportes(): Promise<Deporte[]> {
  const r = USAR_MOCKS ? await simular(() => lista(deportesMock)) : await pedir<Deporte[]>('/deportes');
  return r.datos;
}

/** Los 11 espacios entran en una página; la paginación se suma si la API la exige. */
export async function listarEspacios(): Promise<Espacio[]> {
  const r = USAR_MOCKS ? await simular(() => lista(espaciosMock)) : await pedir<Espacio[]>('/espacios');
  return r.datos;
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
  const r = USAR_MOCKS
    ? await simular(() => {
        const espacio = espaciosMock.find((e) => e.id === id);
        return espacio ? exito(espacio) : fallo('NO_ENCONTRADO', 'Ese espacio no existe o se dio de baja.');
      })
    : await pedir<Espacio>(`/espacios/${encodeURIComponent(id)}`);
  return r.datos;
}
