import * as servidor from '@/mocks/servidor';
import type { Notificacion, Usuario } from '@/tipos';
import { pedir, simular, USAR_MOCKS } from './cliente';

/** Marca o desmarca un espacio como favorito. Devuelve el usuario actualizado. */
export async function alternarFavorito(espacioId: string): Promise<Usuario> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.alternarFavorito(token, espacioId))
    : await pedir<Usuario>(`/usuarios/yo/favoritos/${encodeURIComponent(espacioId)}`, { metodo: 'POST' });
  return r.datos;
}

/** Avisos que dejó el servidor: suspensiones y turnos liberados en favoritos. */
export async function listarNotificaciones(): Promise<Notificacion[]> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.notificaciones(token))
    : await pedir<Notificacion[]>('/usuarios/yo/notificaciones');
  return r.datos;
}

export async function marcarNotificacionesLeidas(): Promise<void> {
  if (USAR_MOCKS) await simular((token) => servidor.marcarLeidas(token));
  else await pedir<number>('/usuarios/yo/notificaciones/leidas', { metodo: 'POST' });
}

/** Sólo existe con datos inventados: vuelve a los datos de prueba iniciales. */
export function reiniciarDatosDePrueba(): void {
  if (USAR_MOCKS) servidor.reiniciarDatosDePrueba();
}
