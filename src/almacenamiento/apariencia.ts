/**
 * Apariencia elegida por la persona: claro, oscuro o la del sistema.
 * Se guarda en kv-store y se aplica con Appearance.setColorScheme, así toda la app
 * (useColorScheme, barra de estado, barra de navegación) cambia a la vez.
 */
import { Appearance } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';

const CLAVE = 'app.apariencia';
const ESQUEMA = { sistema: 'unspecified', claro: 'light', oscuro: 'dark' } as const;

export function leerApariencia(): Apariencia {
  try {
    const valor = Storage.getItemSync(CLAVE);
    return valor === 'claro' || valor === 'oscuro' ? valor : 'sistema';
  } catch {
    return 'sistema';
  }
}

/** Aplica la apariencia y la recuerda para la próxima vez que se abra la app. */
export function aplicarApariencia(apariencia: Apariencia): void {
  Appearance.setColorScheme(ESQUEMA[apariencia]);
  try {
    Storage.setItemSync(CLAVE, apariencia);
  } catch {
    // Sin almacenamiento sigue funcionando; sólo no se recuerda.
  }
}
