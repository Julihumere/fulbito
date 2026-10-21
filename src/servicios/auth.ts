import * as servidor from '@/mocks/servidor';
import type { CredencialesIngreso, SesionIniciada, Usuario } from '@/tipos';
import { pedir, simular, USAR_MOCKS } from './cliente';

/** POST /auth/ingreso — ruta provisoria hasta conocer la API. */
export async function iniciarSesion(credenciales: CredencialesIngreso): Promise<SesionIniciada> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.ingresar(credenciales))
    : await pedir<SesionIniciada>('/auth/ingreso', { metodo: 'POST', cuerpo: credenciales });
  return r.datos;
}

/** GET /usuarios/yo — devuelve el usuario dueño del token guardado. */
export async function obtenerPerfil(): Promise<Usuario> {
  const r = USAR_MOCKS ? await simular((token) => servidor.perfil(token)) : await pedir<Usuario>('/usuarios/yo');
  return r.datos;
}
