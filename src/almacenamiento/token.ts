/**
 * El token de sesión va SIEMPRE a expo-secure-store (Keychain / Keystore),
 * nunca a kv-store, como pide el documento.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CLAVE_TOKEN = 'fulbito.token';

export async function guardarToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    // En la web se usa sólo para la sesión de demostración del navegador.
    globalThis.sessionStorage?.setItem(CLAVE_TOKEN, token);
    return;
  }
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function leerToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.sessionStorage?.getItem(CLAVE_TOKEN) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(CLAVE_TOKEN);
  } catch {
    // Si el llavero quedó inaccesible (p. ej. se restauró un backup), se pide login de nuevo.
    return null;
  }
}

export async function borrarToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(CLAVE_TOKEN);
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}
