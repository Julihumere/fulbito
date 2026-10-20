/**
 * Dos paletas: cancha de día y cancha de noche (con reflectores).
 * Toda pantalla toma sus colores de acá; nada de hex sueltos en los componentes.
 */
export interface Paleta {
  /** Franjas del césped cortado. */
  cesped: string;
  cespedAlterno: string;
  /** Líneas de cal. */
  cal: string;
  calTenue: string;
  /** Fondo de pantalla debajo de las listas. */
  fondo: string;
  superficie: string;
  superficieElevada: string;
  borde: string;
  texto: string;
  textoSuave: string;
  /** Texto que va directo sobre el césped. */
  textoSobreCesped: string;
  textoSobreCespedSuave: string;
  /** Tablero del estadio (logo, marcador). */
  tablero: string;
  tableroLed: string;
  /** Tarjeta amarilla: acción principal. */
  acento: string;
  textoSobreAcento: string;
  /** Tarjeta roja: errores. */
  peligro: string;
  fondoPeligro: string;
  aviso: string;
  fondoAviso: string;
  campoFondo: string;
  campoTexto: string;
  campoPlaceholder: string;
}

export const paletaDia: Paleta = {
  cesped: '#2E7D32',
  cespedAlterno: '#36893A',
  cal: 'rgba(255,255,255,0.9)',
  calTenue: 'rgba(255,255,255,0.45)',
  fondo: '#E8EFE6',
  superficie: '#FFFFFF',
  superficieElevada: '#F6FAF5',
  borde: '#C8D6C5',
  texto: '#13261A',
  textoSuave: '#4A5E50',
  textoSobreCesped: '#FFFFFF',
  textoSobreCespedSuave: 'rgba(255,255,255,0.86)',
  tablero: '#0E1D13',
  tableroLed: '#FFC233',
  acento: '#FFD23F',
  textoSobreAcento: '#1E1A05',
  peligro: '#B3261E',
  fondoPeligro: '#FDE7E5',
  aviso: '#6B4E00',
  fondoAviso: '#FFF1C2',
  campoFondo: '#FFFFFF',
  campoTexto: '#13261A',
  campoPlaceholder: '#7A8C7E',
};

export const paletaNoche: Paleta = {
  cesped: '#0F3A1B',
  cespedAlterno: '#134320',
  cal: 'rgba(255,255,255,0.7)',
  calTenue: 'rgba(255,255,255,0.28)',
  fondo: '#08170D',
  superficie: '#112718',
  superficieElevada: '#16301E',
  borde: '#24432E',
  texto: '#E7F2E9',
  textoSuave: '#A5BCAB',
  textoSobreCesped: '#FFFFFF',
  textoSobreCespedSuave: 'rgba(255,255,255,0.82)',
  tablero: '#030A05',
  tableroLed: '#FFC233',
  acento: '#FFD23F',
  textoSobreAcento: '#1E1A05',
  peligro: '#FF8A80',
  fondoPeligro: '#3A1513',
  aviso: '#FFD878',
  fondoAviso: '#2E2610',
  campoFondo: '#0B1E11',
  campoTexto: '#F2F8F3',
  campoPlaceholder: '#7F9786',
};
