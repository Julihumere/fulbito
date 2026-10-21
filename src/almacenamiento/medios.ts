/**
 * Fotos y video de cada cancha guardados en el teléfono para verlos sin datos.
 * Usa la API nueva de expo-file-system (File, Directory, Paths): la vieja
 * tira error en tiempo de ejecución, como advierte el documento.
 *
 * La descarga es a pedido (botón en la ficha): once videos de 30 segundos
 * pesan decenas de MB y no queremos gastar los datos de nadie sin avisar.
 */
import { Directory, File, Paths } from 'expo-file-system';
import type { Espacio } from '@/tipos';

const esRemoto = (url: string) => /^https?:\/\//.test(url);

function carpeta(espacioId: string): Directory {
  return new Directory(Paths.document, 'espacios', espacioId);
}

/** Nombre de archivo estable a partir de la URL. */
function nombreDe(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.]/g, '_').slice(-96);
}

function archivoDe(espacioId: string, url: string): File {
  return new File(carpeta(espacioId), nombreDe(url));
}

/** URI local de una foto o video si está guardado; si no, null. */
export function uriLocal(espacioId: string, url: string): string | null {
  if (!esRemoto(url)) return null;
  try {
    const f = archivoDe(espacioId, url);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

/** Lo que se puede descargar de un espacio (los videos `local:` ya vienen en la app). */
function remotosDe(espacio: Espacio): string[] {
  return [...espacio.imagenes, ...(espacio.videoUrl ? [espacio.videoUrl] : [])].filter(esRemoto);
}

export function estadoGuardado(espacio: Espacio): { guardados: number; total: number } {
  const remotos = remotosDe(espacio);
  return { guardados: remotos.filter((u) => uriLocal(espacio.id, u) !== null).length, total: remotos.length };
}

/** Descarga lo que falte. Devuelve cuántos archivos quedaron y cuántos fallaron. */
export async function guardarMedios(espacio: Espacio): Promise<{ guardados: number; fallidos: number }> {
  const dir = carpeta(espacio.id);
  dir.create({ idempotent: true, intermediates: true });
  let guardados = 0;
  let fallidos = 0;
  for (const url of remotosDe(espacio)) {
    const destino = archivoDe(espacio.id, url);
    if (destino.exists) {
      guardados += 1;
      continue;
    }
    try {
      await File.downloadFileAsync(url, destino);
      guardados += 1;
    } catch {
      fallidos += 1;
    }
  }
  return { guardados, fallidos };
}

export function borrarMedios(espacioId: string): void {
  try {
    const dir = carpeta(espacioId);
    if (dir.exists) dir.delete();
  } catch {
    // Si no se puede borrar, queda ocupando lugar; no rompe nada.
  }
}

/**
 * Copia una foto elegida de la galería a la carpeta de la app: la que deja
 * el selector está en caché y el sistema la puede borrar.
 */
export function copiarFotoElegida(uri: string): string {
  const dir = new Directory(Paths.document, 'fotos-estado');
  dir.create({ idempotent: true, intermediates: true });
  const origen = new File(uri);
  const destino = new File(dir, `estado-${Date.now()}${origen.extension || '.jpg'}`);
  origen.copy(destino);
  return destino.uri;
}
