/**
 * Las reservas del usuario, compartidas por Inicio, Mis turnos y Mi reserva.
 *
 * Se guardan en el teléfono junto con su turno (la Reserva no trae fecha ni
 * hora, ver pregunta 2): el QR tiene que verse en la puerta de la cancha,
 * donde la señal es mala. Primero se muestra la copia y después se actualiza.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { sincronizarRecordatorios } from '@/notificaciones';
import { reservas as servicioReservas } from '@/servicios';
import type { Espacio, Reserva, Turno } from '@/tipos';
import { instante } from '@/utilidades/fechas';
import { useSesion } from './SesionContexto';

/** Modelo de pantalla (no viene así de la API): la reserva junto con su turno. */
export interface ReservaConTurno {
  reserva: Reserva;
  turno: Turno;
}

interface Cargado {
  usuarioId: string;
  lista: ReservaConTurno[];
  /** Momento del último cálculo: el render no lee el reloj. */
  ahora: number;
  desdeCopia: boolean;
}

interface ValorReservas {
  /** Confirmadas que todavía no terminaron, de la más cercana a la más lejana. */
  proximas: ReservaConTurno[];
  /** Jugadas, canceladas, ausentes o vencidas, de la más nueva a la más vieja. */
  pasadas: ReservaConTurno[];
  proxima: ReservaConTurno | null;
  activas: number;
  ahora: number;
  desdeCopia: boolean;
  cargando: boolean;
  buscar: (reservaId: string) => ReservaConTurno | null;
  recargar: () => Promise<void>;
}

const Contexto = createContext<ValorReservas | null>(null);

/** Pide las reservas y el turno de cada una. null si no hubo conexión. */
async function traer(): Promise<ReservaConTurno[] | null> {
  try {
    const mias = await servicioReservas.listarMisReservas();
    const turnos = await Promise.all(mias.map((r) => servicioReservas.obtenerTurno(r.turnoId)));
    const lista = mias.map((reserva, i) => ({ reserva, turno: turnos[i] }));
    await guardarEnCache(CLAVES.misReservas, lista);
    const espacios = (await leerDeCache<Espacio[]>(CLAVES.espacios))?.valor ?? [];
    await sincronizarRecordatorios(lista, (id) => espacios.find((e) => e.id === id));
    return lista;
  } catch {
    return null;
  }
}

const inicio = (x: ReservaConTurno) => instante(x.turno.fecha, x.turno.inicio);

function separar(lista: ReservaConTurno[], ahora: number) {
  const esProxima = (x: ReservaConTurno) =>
    x.reserva.estado === 'confirmada' && instante(x.turno.fecha, x.turno.fin) > ahora;
  const proximas = lista.filter(esProxima).sort((a, b) => inicio(a) - inicio(b));
  const pasadas = lista.filter((x) => !esProxima(x)).sort((a, b) => inicio(b) - inicio(a));
  return { proximas, pasadas };
}

export function ReservasProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;
  const [cargado, setCargado] = useState<Cargado | null>(null);
  // Usuario cuya primera carga ya terminó (con o sin conexión).
  const [terminado, setTerminado] = useState<string | null>(null);
  const cargando = !!usuarioId && terminado !== usuarioId;

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    leerDeCache<ReservaConTurno[]>(CLAVES.misReservas)
      .then((copia) => {
        if (vivo && copia) setCargado({ usuarioId, lista: copia.valor, ahora: Date.now(), desdeCopia: true });
        return traer();
      })
      .then((lista) => {
        if (!vivo) return;
        // Si no hubo conexión queda lo de la copia local.
        if (lista) setCargado({ usuarioId, lista, ahora: Date.now(), desdeCopia: false });
        setTerminado(usuarioId);
      });
    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  const recargar = useCallback(async () => {
    if (!usuarioId) return;
    const lista = await traer();
    if (lista) setCargado({ usuarioId, lista, ahora: Date.now(), desdeCopia: false });
    else setCargado((c) => (c ? { ...c, ahora: Date.now(), desdeCopia: true } : c));
  }, [usuarioId]);

  // Si cambió el usuario (salió y entró otro), lo cargado no es de él.
  const vigente = cargado && cargado.usuarioId === usuarioId ? cargado : null;

  const valor = useMemo<ValorReservas>(() => {
    const lista = vigente?.lista ?? [];
    const ahora = vigente?.ahora ?? 0;
    const { proximas, pasadas } = separar(lista, ahora);
    return {
      proximas,
      pasadas,
      proxima: proximas[0] ?? null,
      activas: proximas.length,
      ahora,
      desdeCopia: vigente?.desdeCopia ?? false,
      cargando: cargando && !vigente,
      buscar: (id) => lista.find((x) => x.reserva.id === id) ?? null,
      recargar,
    };
  }, [vigente, cargando, recargar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useReservas(): ValorReservas {
  const v = useContext(Contexto);
  if (!v) throw new Error('useReservas tiene que usarse dentro de <ReservasProvider>');
  return v;
}
