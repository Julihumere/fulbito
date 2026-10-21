import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

const claveFavoritos = (usuarioId?: string | null) => `app.favoritos.${usuarioId ?? 'invitado'}`;

export async function leerFavoritos(usuarioId?: string | null): Promise<string[]> {
  try {
    const clave = claveFavoritos(usuarioId);
    const texto = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(clave) ?? null
      : await Storage.getItemAsync(clave);
    if (!texto) return [];
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? valor.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function guardarFavoritos(ids: string[], usuarioId?: string | null): Promise<void> {
  const clave = claveFavoritos(usuarioId);
  const texto = JSON.stringify(ids);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(clave, texto);
  } else {
    await Storage.setItemAsync(clave, texto);
  }
}
