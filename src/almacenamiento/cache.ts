/**
 * Copia local de datos NO sensibles (catálogo, perfil, mis reservas) en
 * expo-sqlite/kv-store, para poder mostrarlos sin señal.
 */
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

export const CLAVES = {
  espacios: 'cache.espacios',
  deportes: 'cache.deportes',
  usuario: 'cache.usuario',
  misReservas: 'cache.misReservas',
  agenda: 'cache.agenda',
  ingresosPendientes: 'cache.ingresosPendientes',
  espacioEscaneo: 'app.espacioEscaneo',
  recordatorios: 'notif.recordatorios',
  avisosMostrados: 'notif.avisosMostrados',
  bienvenidaVista: 'app.bienvenidaVista',
} as const;

type Clave = (typeof CLAVES)[keyof typeof CLAVES];

interface Envoltorio<T> {
  guardadoEn: string;
  valor: T;
}

export async function guardarEnCache<T>(clave: Clave, valor: T): Promise<void> {
  const envoltorio: Envoltorio<T> = { guardadoEn: new Date().toISOString(), valor };
  const contenido = JSON.stringify(envoltorio);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(clave, contenido);
  } else {
    await Storage.setItemAsync(clave, contenido);
  }
}

export async function leerDeCache<T>(clave: Clave): Promise<Envoltorio<T> | null> {
  try {
    const crudo = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(clave) ?? null
      : await Storage.getItemAsync(clave);
    return crudo ? (JSON.parse(crudo) as Envoltorio<T>) : null;
  } catch {
    return null;
  }
}

export async function borrarDeCache(...claves: Clave[]): Promise<void> {
  if (Platform.OS === 'web') {
    claves.forEach((clave) => globalThis.localStorage?.removeItem(clave));
  } else {
    await Promise.all(claves.map((c) => Storage.removeItemAsync(c)));
  }
}
