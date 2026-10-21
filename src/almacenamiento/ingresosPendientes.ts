/**
 * Ingresos validados sin señal contra la agenda guardada. Quedan en el
 * teléfono y se mandan al servidor apenas vuelve la conexión.
 */
import { CLAVES, guardarEnCache, leerDeCache } from './cache';

export interface IngresoPendiente {
  codigoQr: string;
  espacioId: string;
  /** Cuándo se escaneó (ISO con zona). */
  escaneadoEn: string;
}

export async function leerPendientes(): Promise<IngresoPendiente[]> {
  return (await leerDeCache<IngresoPendiente[]>(CLAVES.ingresosPendientes))?.valor ?? [];
}

export async function agregarPendiente(p: IngresoPendiente): Promise<void> {
  const actuales = await leerPendientes();
  if (actuales.some((x) => x.codigoQr === p.codigoQr)) return;
  await guardarEnCache(CLAVES.ingresosPendientes, [...actuales, p]);
}

/**
 * Intenta mandar cada pendiente. Los que fallan por falta de señal quedan;
 * los que el servidor rechaza se descartan (el servidor tiene la última palabra).
 */
export async function enviarPendientes(
  enviar: (p: IngresoPendiente) => Promise<void>,
  esSinConexion: (e: unknown) => boolean,
): Promise<number> {
  const pendientes = await leerPendientes();
  const quedan: IngresoPendiente[] = [];
  let enviados = 0;
  for (const p of pendientes) {
    try {
      await enviar(p);
      enviados += 1;
    } catch (e) {
      if (esSinConexion(e)) quedan.push(p);
    }
  }
  await guardarEnCache(CLAVES.ingresosPendientes, quedan);
  return enviados;
}
