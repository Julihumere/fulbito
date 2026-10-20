/**
 * Estado de la sesión para toda la app.
 *
 * - Mirar disponibilidad NO requiere cuenta (lo pide el documento): sin token
 *   la app queda en modo "invitado", no se bloquea nada.
 * - Para abrir sin señal en la puerta de la cancha, el perfil se guarda en
 *   kv-store y se usa al instante; después se refresca contra la API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { borrarDeCache, CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { borrarToken, guardarToken, leerToken } from '@/almacenamiento/token';
import { auth, ErrorApi } from '@/servicios';
import type { CredencialesIngreso, Usuario } from '@/tipos';

export type EstadoSesion = 'cargando' | 'invitado' | 'autenticado';

interface ValorSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  /** true hasta que la persona ve la pantalla de ingreso por primera vez. */
  primeraVez: boolean;
  iniciarSesion: (credenciales: CredencialesIngreso) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  marcarBienvenidaVista: () => Promise<void>;
}

const Contexto = createContext<ValorSesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [primeraVez, setPrimeraVez] = useState(false);

  const limpiar = useCallback(async () => {
    await borrarToken();
    await borrarDeCache(CLAVES.usuario, CLAVES.misReservas);
    setUsuario(null);
    setEstado('invitado');
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [token, enCache, bienvenida] = await Promise.all([
        leerToken(),
        leerDeCache<Usuario>(CLAVES.usuario),
        leerDeCache<boolean>(CLAVES.bienvenidaVista),
      ]);
      if (cancelado) return;
      setPrimeraVez(!bienvenida?.valor);

      if (!token) {
        setEstado('invitado');
        return;
      }
      // Arranque inmediato con lo guardado; la API confirma después.
      if (enCache) {
        setUsuario(enCache.valor);
        setEstado('autenticado');
      }
      try {
        const perfil = await auth.obtenerPerfil();
        if (cancelado) return;
        setUsuario(perfil);
        setEstado('autenticado');
        await guardarEnCache(CLAVES.usuario, perfil);
      } catch (e) {
        if (cancelado) return;
        const codigo = e instanceof ErrorApi ? e.codigo : null;
        if (codigo === 'NO_AUTORIZADO') await limpiar();
        // Sin conexión u otro error: si había perfil guardado seguimos con ese.
        else if (!enCache) setEstado('invitado');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [limpiar]);

  const iniciarSesion = useCallback(async (credenciales: CredencialesIngreso) => {
    const { token, usuario: u } = await auth.iniciarSesion(credenciales);
    await guardarToken(token);
    await guardarEnCache(CLAVES.usuario, u);
    setUsuario(u);
    setEstado('autenticado');
    return u;
  }, []);

  const marcarBienvenidaVista = useCallback(async () => {
    setPrimeraVez(false);
    await guardarEnCache(CLAVES.bienvenidaVista, true);
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({ estado, usuario, primeraVez, iniciarSesion, cerrarSesion: limpiar, marcarBienvenidaVista }),
    [estado, usuario, primeraVez, iniciarSesion, limpiar, marcarBienvenidaVista],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ValorSesion {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSesion tiene que usarse dentro de <SesionProvider>');
  return v;
}
