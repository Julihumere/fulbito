/**
 * Catálogo de espacios y deportes con copia local.
 * Primero muestra lo guardado (aparece al instante, incluso sin señal) y
 * después lo reemplaza por lo que devuelva la API.
 */
import { useCallback, useEffect, useState } from 'react';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { aErrorApi, espacios as servicioEspacios, type ErrorApi } from '@/servicios';
import type { Deporte, Espacio } from '@/tipos';

interface EstadoCatalogo {
  espacios: Espacio[];
  deportes: Deporte[];
  cargando: boolean;
  refrescando: boolean;
  /** Fecha ISO de la copia local que se está mostrando, si la API no respondió. */
  copiaDel: string | null;
  error: ErrorApi | null;
}

type Resultado = { ok: true; espacios: Espacio[]; deportes: Deporte[] } | { ok: false; error: ErrorApi };

async function leerCopia() {
  const [e, d] = await Promise.all([
    leerDeCache<Espacio[]>(CLAVES.espacios),
    leerDeCache<Deporte[]>(CLAVES.deportes),
  ]);
  return e && d ? { espacios: e.valor, deportes: d.valor, guardadoEn: e.guardadoEn } : null;
}

async function traerDeApi(): Promise<Resultado> {
  try {
    const [espacios, deportes] = await Promise.all([
      servicioEspacios.listarEspacios(),
      servicioEspacios.listarDeportes(),
    ]);
    await Promise.all([guardarEnCache(CLAVES.espacios, espacios), guardarEnCache(CLAVES.deportes, deportes)]);
    return { ok: true, espacios, deportes };
  } catch (e) {
    return { ok: false, error: aErrorApi(e) };
  }
}

function aplicar(s: EstadoCatalogo, r: Resultado, guardadoEnCopia: string | null): EstadoCatalogo {
  if (r.ok) {
    return { espacios: r.espacios, deportes: r.deportes, cargando: false, refrescando: false, copiaDel: null, error: null };
  }
  const hayDatos = s.espacios.length > 0;
  return {
    ...s,
    cargando: false,
    refrescando: false,
    error: r.error,
    copiaDel: hayDatos ? (guardadoEnCopia ?? s.copiaDel ?? new Date().toISOString()) : null,
  };
}

export function useCatalogo() {
  const [estado, setEstado] = useState<EstadoCatalogo>({
    espacios: [], deportes: [], cargando: true, refrescando: false, copiaDel: null, error: null,
  });

  useEffect(() => {
    let vivo = true;
    leerCopia()
      .then((copia) => {
        if (vivo && copia) {
          setEstado((s) => ({ ...s, espacios: copia.espacios, deportes: copia.deportes, cargando: false }));
        }
        return traerDeApi().then((r) => ({ r, copia }));
      })
      .then(({ r, copia }) => {
        if (vivo) setEstado((s) => aplicar(s, r, copia?.guardadoEn ?? null));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    setEstado((s) => ({ ...s, refrescando: true }));
    const r = await traerDeApi();
    setEstado((s) => aplicar(s, r, null));
  }, []);

  return { ...estado, recargar };
}
