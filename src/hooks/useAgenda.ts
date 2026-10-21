/**
 * Agenda de un día para el encargado. La de hoy se guarda en el teléfono:
 * si en la puerta no hay señal, el escaneo valida contra esta copia
 * (pregunta 13).
 */
import { useCallback, useEffect, useState } from 'react';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { aErrorApi, gestion, type ErrorApi } from '@/servicios';
import type { EntradaAgenda } from '@/tipos';
import { hoy } from '@/utilidades/fechas';

export interface AgendaGuardada {
  fecha: string;
  entradas: EntradaAgenda[];
}

/** Pide la agenda y, si es la de hoy, la deja guardada. */
export async function traerAgenda(fecha: string): Promise<EntradaAgenda[]> {
  const entradas = await gestion.agendaDelDia(fecha);
  if (fecha === hoy()) await guardarEnCache<AgendaGuardada>(CLAVES.agenda, { fecha, entradas });
  return entradas;
}

export async function leerAgendaGuardada(): Promise<AgendaGuardada | null> {
  const copia = await leerDeCache<AgendaGuardada>(CLAVES.agenda);
  return copia && copia.valor.fecha === hoy() ? copia.valor : null;
}

interface Cargada {
  fecha: string;
  entradas: EntradaAgenda[] | null;
  ahora: number;
  desdeCopia: boolean;
  error: ErrorApi | null;
}

/** La agenda de la API o, sin conexión, la guardada de hoy. */
async function cargar(fecha: string): Promise<Cargada> {
  try {
    return { fecha, entradas: await traerAgenda(fecha), ahora: Date.now(), desdeCopia: false, error: null };
  } catch (e) {
    const copia = await leerAgendaGuardada();
    const entradas = copia && copia.fecha === fecha ? copia.entradas : null;
    return { fecha, entradas, ahora: Date.now(), desdeCopia: entradas !== null, error: aErrorApi(e) };
  }
}

export function useAgenda(fecha: string) {
  const [cargada, setCargada] = useState<Cargada | null>(null);

  useEffect(() => {
    let vivo = true;
    cargar(fecha).then((r) => vivo && setCargada(r));
    return () => {
      vivo = false;
    };
  }, [fecha]);

  const recargar = useCallback(async () => {
    setCargada(await cargar(fecha));
  }, [fecha]);

  const vigente = cargada && cargada.fecha === fecha ? cargada : null;
  return {
    entradas: vigente?.entradas ?? null,
    ahora: vigente?.ahora ?? 0,
    desdeCopia: vigente?.desdeCopia ?? false,
    error: vigente?.error ?? null,
    recargar,
  };
}
