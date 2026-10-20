/**
 * Próxima reserva confirmada del usuario, con su turno (fecha y hora).
 * Se guarda en el teléfono para poder mostrar el código sin señal.
 */
import { useCallback, useEffect, useState } from 'react';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { reservas as servicioReservas } from '@/servicios';
import type { Reserva, Turno } from '@/tipos';
import { instante } from '@/utilidades/fechas';

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

/** Pide las reservas y los turnos de las confirmadas. null si no hubo conexión. */
async function traerMisReservas(): Promise<ReservaConTurno[] | null> {
  try {
    const mias = await servicioReservas.listarMisReservas();
    // Sólo hacen falta los turnos de las confirmadas (son 3 como máximo).
    const confirmadas = mias.filter((r) => r.estado === 'confirmada');
    const turnos = await Promise.all(confirmadas.map((r) => servicioReservas.obtenerTurno(r.turnoId)));
    const lista = confirmadas.map((reserva, i) => ({ reserva, turno: turnos[i] }));
    await guardarEnCache(CLAVES.misReservas, lista);
    return lista;
  } catch {
    return null;
  }
}

function resumir(lista: ReservaConTurno[], ahora: number) {
  const futuras = lista
    .filter((x) => x.reserva.estado === 'confirmada' && instante(x.turno.fecha, x.turno.fin) > ahora)
    .sort((a, b) => instante(a.turno.fecha, a.turno.inicio) - instante(b.turno.fecha, b.turno.inicio));
  return { proxima: futuras[0] ?? null, proximas: futuras, activas: futuras.length };
}

export function useProximaReserva(usuarioId: string | null) {
  const [cargado, setCargado] = useState<Cargado | null>(null);

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    leerDeCache<ReservaConTurno[]>(CLAVES.misReservas)
      .then((copia) => {
        if (vivo && copia) setCargado({ usuarioId, lista: copia.valor, ahora: Date.now(), desdeCopia: true });
        return traerMisReservas();
      })
      .then((lista) => {
        // Si no hubo conexión queda lo de la copia local.
        if (vivo && lista) setCargado({ usuarioId, lista, ahora: Date.now(), desdeCopia: false });
      });
    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  const recargar = useCallback(async () => {
    if (!usuarioId) return;
    const lista = await traerMisReservas();
    if (lista) setCargado({ usuarioId, lista, ahora: Date.now(), desdeCopia: false });
  }, [usuarioId]);

  // Si cambió el usuario (salió y entró otro), lo cargado no es de él.
  const vigente = cargado && cargado.usuarioId === usuarioId ? cargado : null;
  const { proxima, proximas, activas } = vigente ? resumir(vigente.lista, vigente.ahora) : { proxima: null, proximas: [] as ReservaConTurno[], activas: 0 };

  return { proxima, proximas, activas, ahora: vigente?.ahora ?? 0, desdeCopia: vigente?.desdeCopia ?? false, recargar };
}
