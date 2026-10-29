/**
 * Estado de la sesión para toda la app.
 *
 * - Mirar disponibilidad NO requiere cuenta (lo pide el documento): sin token
 *   la app queda en modo "invitado", no se bloquea nada.
 * - Para abrir sin señal en la puerta de la cancha, el perfil se guarda en
 *   kv-store y se usa al instante; después se refresca contra la API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { borrarDeCache, CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { borrarToken, guardarToken, leerToken } from '@/almacenamiento/token';
import { borrarRecordatorios, obtenerTokenPush, olvidarTokenPush, tokenPushActual } from '@/notificaciones';
import { auth, dispositivos, ErrorApi } from '@/servicios';
import type { CredencialesIngreso, DatosRegistro, Usuario } from '@/tipos';

export type EstadoSesion = 'cargando' | 'invitado' | 'autenticado';

interface ValorSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  /** true hasta que la persona ve la pantalla de ingreso por primera vez. */
  primeraVez: boolean;
  iniciarSesion: (credenciales: CredencialesIngreso) => Promise<Usuario>;
  registrar: (datos: DatosRegistro) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  /** Reemplaza el usuario (p. ej. después de marcar un favorito) y lo guarda en el teléfono. */
  actualizarUsuario: (u: Usuario) => Promise<void>;
  /** Vuelve a pedir el perfil (contadores de cancelaciones y ausencias). */
  refrescarPerfil: () => Promise<void>;
  marcarBienvenidaVista: () => Promise<void>;
}

const Contexto = createContext<ValorSesion | null>(null);

/** Best-effort: la API puede responder 501 mientras falte el lado servidor. */
async function registrarPush(): Promise<void> {
  const token = await obtenerTokenPush();
  if (!token || Platform.OS === 'web') return;
  try {
    await dispositivos.registrarDispositivo(token, Platform.OS === 'ios' ? 'ios' : 'android');
  } catch {
    // Sin push configurado, la app sigue funcionando con notificaciones locales.
  }
}

async function borrarPush(): Promise<void> {
  if (!tokenPushActual || Platform.OS === 'web') return;
  try {
    await dispositivos.borrarDispositivo(tokenPushActual);
  } catch {
    // 501 o sin conexión: no hay nada más que hacer.
  } finally {
    olvidarTokenPush();
  }
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [primeraVez, setPrimeraVez] = useState(false);

  const limpiar = useCallback(async () => {
    await borrarPush();
    await borrarToken();
    await borrarDeCache(CLAVES.usuario, CLAVES.misReservas, CLAVES.agenda, CLAVES.ingresosPendientes);
    await borrarRecordatorios();
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
        void registrarPush();
      } catch (e) {
        if (cancelado) return;
        const codigo = e instanceof ErrorApi ? e.codigo : null;
        if (codigo === 'NO_AUTENTICADO' || codigo === 'NO_AUTORIZADO') await limpiar();
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
    void registrarPush();
    return u;
  }, []);

  const registrar = useCallback(async (datos: DatosRegistro) => {
    const { token, usuario: u } = await auth.registrar(datos);
    await guardarToken(token);
    await guardarEnCache(CLAVES.usuario, u);
    setUsuario(u);
    setEstado('autenticado');
    void registrarPush();
    return u;
  }, []);

  const actualizarUsuario = useCallback(async (u: Usuario) => {
    setUsuario(u);
    await guardarEnCache(CLAVES.usuario, u);
  }, []);

  const refrescarPerfil = useCallback(async () => {
    try {
      await actualizarUsuario(await auth.obtenerPerfil());
    } catch {
      // Sin conexión queda el perfil guardado.
    }
  }, [actualizarUsuario]);

  const marcarBienvenidaVista = useCallback(async () => {
    setPrimeraVez(false);
    await guardarEnCache(CLAVES.bienvenidaVista, true);
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({
      estado, usuario, primeraVez, iniciarSesion, registrar, cerrarSesion: limpiar, actualizarUsuario, refrescarPerfil, marcarBienvenidaVista,
    }),
    [estado, usuario, primeraVez, iniciarSesion, registrar, limpiar, actualizarUsuario, refrescarPerfil, marcarBienvenidaVista],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ValorSesion {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSesion tiene que usarse dentro de <SesionProvider>');
  return v;
}
