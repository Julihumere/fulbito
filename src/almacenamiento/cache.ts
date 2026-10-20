/**
 * Copia local de datos NO sensibles (catálogo, perfil, mis reservas) en
 * expo-sqlite/kv-store, para poder mostrarlos sin señal.
 */
import Storage from 'expo-sqlite/kv-store';

export const CLAVES = {
  espacios: 'cache.espacios',
  deportes: 'cache.deportes',
  usuario: 'cache.usuario',
  misReservas: 'cache.misReservas',
  bienvenidaVista: 'app.bienvenidaVista',
} as const;

type Clave = (typeof CLAVES)[keyof typeof CLAVES];

interface Envoltorio<T> {
  guardadoEn: string;
  valor: T;
}

export async function guardarEnCache<T>(clave: Clave, valor: T): Promise<void> {
  const envoltorio: Envoltorio<T> = { guardadoEn: new Date().toISOString(), valor };
  await Storage.setItemAsync(clave, JSON.stringify(envoltorio));
}

export async function leerDeCache<T>(clave: Clave): Promise<Envoltorio<T> | null> {
  try {
    const crudo = await Storage.getItemAsync(clave);
    return crudo ? (JSON.parse(crudo) as Envoltorio<T>) : null;
  } catch {
    return null;
  }
}

export async function borrarDeCache(...claves: Clave[]): Promise<void> {
  await Promise.all(claves.map((c) => Storage.removeItemAsync(c)));
}
