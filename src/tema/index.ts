import { useColorScheme } from 'react-native';
import { paletaDia, paletaNoche, type Paleta } from './colores';

export * from './colores';
export * from './tipografia';

export const ESPACIADO = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

/** Radios por jerarquía: los controles chicos, las tarjetas medias, el tablero casi recto. */
export const RADIO = { tablero: 4, control: 10, tarjeta: 14, pastilla: 999 } as const;

/** Mínimo táctil: se usa con guantes, de noche y apurado. */
export const TOQUE_MINIMO = 48;

export interface Tema {
  esNoche: boolean;
  c: Paleta;
}

export function useTema(): Tema {
  const esquema = useColorScheme();
  const esNoche = esquema === 'dark';
  return { esNoche, c: esNoche ? paletaNoche : paletaDia };
}
