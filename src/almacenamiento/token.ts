/**
 * El token de sesión va SIEMPRE a expo-secure-store (Keychain / Keystore),
 * nunca a kv-store, como pide el documento.
 */
import * as SecureStore from 'expo-secure-store';

const CLAVE_TOKEN = 'fulbito.token';

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function leerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLAVE_TOKEN);
  } catch {
    // Si el llavero quedó inaccesible (p. ej. se restauró un backup), se pide login de nuevo.
    return null;
  }
}

export async function borrarToken(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}
