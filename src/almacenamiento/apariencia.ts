/**
 * Apariencia elegida por la persona: claro, oscuro o la del sistema.
 * Se guarda en kv-store y se aplica con Appearance.setColorScheme, así toda la app
 * (useColorScheme, barra de estado, barra de navegación) cambia a la vez.
 */
import { Appearance, Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';

const CLAVE = 'app.apariencia';
const ESQUEMA = { sistema: 'unspecified', claro: 'light', oscuro: 'dark' } as const;

export async function leerApariencia(): Promise<Apariencia> {
  try {
    const valor = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(CLAVE)
      : await Storage.getItemAsync(CLAVE);
    return valor === 'claro' || valor === 'oscuro' ? valor : 'sistema';
  } catch {
    return 'sistema';
  }
}

/** Aplica la apariencia y la recuerda para la próxima vez que se abra la app. */
export async function aplicarApariencia(apariencia: Apariencia): Promise<void> {
  if (Platform.OS !== 'web') Appearance.setColorScheme(ESQUEMA[apariencia]);
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(CLAVE, apariencia);
    else await Storage.setItemAsync(CLAVE, apariencia);
  } catch {
    // Sin almacenamiento sigue funcionando; sólo no se recuerda.
  }
}

export async function inicializarApariencia(): Promise<Apariencia> {
  const apariencia = await leerApariencia();
  if (Platform.OS !== 'web') Appearance.setColorScheme(ESQUEMA[apariencia]);
  return apariencia;
}
