import type { Deporte } from '@/tipos';

export const deportesMock: Deporte[] = [
  { id: 'dep-futbol5', nombre: 'Fútbol 5', icono: 'football-outline', color: '#2E7D32' },
  { id: 'dep-futbol11', nombre: 'Fútbol 11', icono: 'football', color: '#1B5E20' },
  { id: 'dep-basquet', nombre: 'Básquet', icono: 'basketball-outline', color: '#D9601A' },
  // Ionicons no tiene pelota de vóley; queda a confirmar qué ícono manda la API.
  { id: 'dep-voley', nombre: 'Vóley', icono: 'ellipse-outline', color: '#1565C0' },
  { id: 'dep-tenis', nombre: 'Tenis', icono: 'tennisball-outline', color: '#B5452B' },
  // El gimnasio cerrado se usa para varios deportes; ver "Huecos" en el análisis.
  { id: 'dep-multiuso', nombre: 'Gimnasio', icono: 'barbell-outline', color: '#6A4C93' },
];
