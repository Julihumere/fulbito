/**
 * Cascadia Code en toda la app. Con fuentes propias, React Native no
 * "engorda" la letra con fontWeight: cada peso es una familia distinta.
 */
export const FUENTES = {
  regular: 'CascadiaCode-Regular',
  seminegrita: 'CascadiaCode-SemiBold',
  negrita: 'CascadiaCode-Bold',
  cursiva: 'CascadiaCode-Italic',
} as const;

export const ARCHIVOS_FUENTES = {
  [FUENTES.regular]: require('../../assets/fonts/CascadiaCode-Regular.ttf'),
  [FUENTES.seminegrita]: require('../../assets/fonts/CascadiaCode-SemiBold.ttf'),
  [FUENTES.negrita]: require('../../assets/fonts/CascadiaCode-Bold.ttf'),
  [FUENTES.cursiva]: require('../../assets/fonts/CascadiaCode-Italic.ttf'),
};

/**
 * Escala modular (≈1,25) pensada para leerse al aire libre y de noche:
 * nada por debajo de 13 y el cuerpo en 16.
 */
export const ESCALA = {
  marcador: { fontSize: 44, lineHeight: 50, letterSpacing: -1 },
  titulo: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  subtitulo: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  cuerpo: { fontSize: 16, lineHeight: 23, letterSpacing: 0 },
  etiqueta: { fontSize: 14, lineHeight: 19, letterSpacing: 0 },
  chico: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
} as const;

export type VarianteTexto = keyof typeof ESCALA;
export type PesoTexto = 'regular' | 'seminegrita' | 'negrita' | 'cursiva';
