import { credencialesMock, tokenDe, usuarioDeToken, usuariosMock } from '@/mocks/usuarios';
import type { CredencialesIngreso, SesionIniciada, Usuario } from '@/tipos';
import { exito, fallo, pedir, simular, USAR_MOCKS } from './cliente';

/** POST /auth/ingreso — ruta provisoria hasta conocer la API. */
export async function iniciarSesion(credenciales: CredencialesIngreso): Promise<SesionIniciada> {
  const r = USAR_MOCKS
    ? await simular(() => {
        const email = credenciales.email.trim().toLowerCase();
        const c = credencialesMock.find((x) => x.email === email && x.contrasena === credenciales.contrasena);
        const usuario = c && usuariosMock.find((u) => u.id === c.usuarioId);
        if (!usuario) return fallo('CREDENCIALES_INVALIDAS', 'El email o la contraseña no coinciden.');
        return exito<SesionIniciada>({ token: tokenDe(usuario.id), usuario });
      })
    : await pedir<SesionIniciada>('/auth/ingreso', { metodo: 'POST', cuerpo: credenciales });
  return r.datos;
}

/** GET /usuarios/yo — devuelve el usuario dueño del token guardado. */
export async function obtenerPerfil(): Promise<Usuario> {
  const r = USAR_MOCKS
    ? await simular((token) => {
        const usuario = token && usuariosMock.find((u) => u.id === usuarioDeToken(token));
        if (!usuario) return fallo('NO_AUTORIZADO', 'Tu sesión venció. Entrá de nuevo.');
        return exito(usuario);
      })
    : await pedir<Usuario>('/usuarios/yo');
  return r.datos;
}
