/**
 * Videos que viajan dentro de la app. En el catálogo se nombran como `local:<clave>`
 * (un texto, así la copia guardada sin señal no depende de números internos del build).
 * Una URL http(s) de la API se reproduce tal cual.
 */
const VIDEOS_LOCALES: Record<string, number> = {
  futbol5: require('../../assets/videos/futbol5.mp4'),
  futbol11: require('../../assets/videos/futbol11.mp4'),
  basquet: require('../../assets/videos/basquet.mp4'),
  voley: require('../../assets/videos/voley.mp4'),
  tenis: require('../../assets/videos/tenis.mp4'),
};

export type FuenteVideo = string | number;

/** Devuelve la fuente que entiende el reproductor, o null si la clave local no existe. */
export function resolverVideo(videoUrl: string): FuenteVideo | null {
  if (!videoUrl.startsWith('local:')) return videoUrl;
  return VIDEOS_LOCALES[videoUrl.slice('local:'.length)] ?? null;
}
