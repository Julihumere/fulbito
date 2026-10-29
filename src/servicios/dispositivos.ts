import type { DispositivoPush } from '@/tipos';
import { pedir, pedirVacio, USAR_MOCKS } from './cliente';

/** POST /dispositivos — anota el token de Expo del teléfono. */
export async function registrarDispositivo(
  tokenExpo: string,
  plataforma: 'ios' | 'android',
): Promise<DispositivoPush> {
  if (USAR_MOCKS) {
    return { tokenExpo, plataforma };
  }
  return (await pedir<DispositivoPush>('/dispositivos', {
    metodo: 'POST',
    cuerpo: { tokenExpo, plataforma },
  })).datos;
}

/** DELETE /dispositivos/:tokenExpo — deja de recibir push. */
export async function borrarDispositivo(tokenExpo: string): Promise<void> {
  if (USAR_MOCKS) return;
  await pedirVacio(`/dispositivos/${encodeURIComponent(tokenExpo)}`, { metodo: 'DELETE' });
}

/** POST /dispositivos/prueba — manda una push de prueba a tus teléfonos. */
export async function probarNotificaciones(): Promise<{ dispositivos: number }> {
  if (USAR_MOCKS) return { dispositivos: 0 };
  return (await pedir<{ dispositivos: number }>('/dispositivos/prueba', { metodo: 'POST' })).datos;
}
