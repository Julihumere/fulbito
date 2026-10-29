import * as servidor from '@/mocks/servidor';
import type { CredencialesIngreso, DatosRegistro, SesionIniciada, Usuario } from '@/tipos';
import { pedir, simular, USAR_MOCKS } from './cliente';

/** POST /auth/ingreso — devuelve token (30 días) y usuario. */
export async function iniciarSesion(credenciales: CredencialesIngreso): Promise<SesionIniciada> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.ingresar(credenciales))
    : await pedir<SesionIniciada>('/auth/ingreso', { metodo: 'POST', cuerpo: credenciales });
  return r.datos;
}

/** POST /auth/registro — crea una cuenta de jugador. */
export async function registrar(datos: DatosRegistro): Promise<SesionIniciada> {
  const r = USAR_MOCKS
    ? await simular(() => servidor.registrar(datos))
    : await pedir<SesionIniciada>('/auth/registro', { metodo: 'POST', cuerpo: datos });
  return r.datos;
}

/** GET /yo — devuelve el usuario dueño del token guardado. */
export async function obtenerPerfil(): Promise<Usuario> {
  const r = USAR_MOCKS ? await simular((token) => servidor.perfil(token)) : await pedir<Usuario>('/yo');
  return r.datos;
}

/** PATCH /yo — cambia nombre y/o teléfono. */
export async function actualizarPerfil(datos: { nombre?: string; telefono?: string }): Promise<Usuario> {
  const r = USAR_MOCKS
    ? await simular((token) => servidor.actualizarPerfil(token, datos))
    : await pedir<Usuario>('/yo', { metodo: 'PATCH', cuerpo: datos });
  return r.datos;
}
