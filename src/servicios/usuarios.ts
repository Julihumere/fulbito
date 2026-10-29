import * as servidor from '@/mocks/servidor';
import type { Notificacion, Usuario } from '@/tipos';
import { pedir, pedirVacio, simular, USAR_MOCKS } from './cliente';

/** PUT/DELETE /yo/espacios-favoritos/:id. Devuelve el usuario actualizado. */
export async function alternarFavorito(espacioId: string): Promise<Usuario> {
  if (USAR_MOCKS) {
    return (await simular((token) => servidor.alternarFavorito(token, espacioId))).datos;
  }

  const yo = (await pedir<Usuario>('/yo')).datos;
  const ruta = `/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`;
  if (yo.espaciosFavoritos.includes(espacioId)) {
    await pedirVacio(ruta, { metodo: 'DELETE' });
    return (await pedir<Usuario>('/yo')).datos;
  }
  return (await pedir<Usuario>(ruta, { metodo: 'PUT' })).datos;
}

/** GET /usuarios/:id — encargado/administrador, para la agenda. */
export async function obtenerUsuario(id: string): Promise<Usuario> {
  if (USAR_MOCKS) throw new Error('El mock ya entrega el titular en la agenda.');
  return (await pedir<Usuario>(`/usuarios/${encodeURIComponent(id)}`)).datos;
}

/**
 * La API no tiene un endpoint de avisos in-app: las suspensiones y los turnos
 * liberados llegan por push. En modo mock se conserva la bandeja de prueba.
 */
export async function listarNotificaciones(): Promise<Notificacion[]> {
  if (!USAR_MOCKS) return [];
  return (await simular((token) => servidor.notificaciones(token))).datos;
}

export async function marcarNotificacionesLeidas(): Promise<void> {
  if (!USAR_MOCKS) return;
  await simular((token) => servidor.marcarLeidas(token));
}

/** Sólo existe con datos inventados: vuelve a los datos de prueba iniciales. */
export function reiniciarDatosDePrueba(): void {
  if (USAR_MOCKS) servidor.reiniciarDatosDePrueba();
}
