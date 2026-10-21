/**
 * Avisos del servidor (suspensiones y turnos liberados en favoritos).
 * Se consultan al abrir la app, al volver a ella y cada dos minutos; los
 * nuevos se muestran como notificación del teléfono.
 * Con push (development build) esta consulta pasa a ser sólo un respaldo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { mostrarAvisosNuevos } from '@/notificaciones';
import { usuarios as servicioUsuarios } from '@/servicios';
import type { Notificacion } from '@/tipos';
import { useSesion } from './SesionContexto';

const CADA_MS = 2 * 60 * 1000;

interface ValorAvisos {
  avisos: Notificacion[];
  noLeidos: number;
  recargar: () => Promise<void>;
  marcarLeidos: () => Promise<void>;
}

const Contexto = createContext<ValorAvisos | null>(null);

/** Pide los avisos y muestra los nuevos en el teléfono. null si no hubo conexión. */
async function traerAvisos(): Promise<Notificacion[] | null> {
  try {
    const avisos = await servicioUsuarios.listarNotificaciones();
    await mostrarAvisosNuevos(avisos);
    return avisos;
  } catch {
    return null;
  }
}

export function AvisosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;
  const [cargados, setCargados] = useState<{ usuarioId: string; avisos: Notificacion[] } | null>(null);

  const recargar = useCallback(async () => {
    if (!usuarioId) return;
    const avisos = await traerAvisos();
    if (avisos) setCargados({ usuarioId, avisos });
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    traerAvisos().then((avisos) => vivo && avisos && setCargados({ usuarioId, avisos }));
    const intervalo = setInterval(recargar, CADA_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') recargar();
    });
    return () => {
      vivo = false;
      clearInterval(intervalo);
      sub.remove();
    };
  }, [usuarioId, recargar]);

  const marcarLeidos = useCallback(async () => {
    setCargados((c) => (c ? { ...c, avisos: c.avisos.map((a) => ({ ...a, leida: true })) } : c));
    try {
      await servicioUsuarios.marcarNotificacionesLeidas();
    } catch {
      // Se vuelven a marcar la próxima vez.
    }
  }, []);

  const avisos = useMemo(
    () => (cargados && cargados.usuarioId === usuarioId ? cargados.avisos : []),
    [cargados, usuarioId],
  );
  const valor = useMemo<ValorAvisos>(
    () => ({ avisos, noLeidos: avisos.filter((a) => !a.leida).length, recargar, marcarLeidos }),
    [avisos, recargar, marcarLeidos],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAvisos(): ValorAvisos {
  const v = useContext(Contexto);
  if (!v) throw new Error('useAvisos tiene que usarse dentro de <AvisosProvider>');
  return v;
}
