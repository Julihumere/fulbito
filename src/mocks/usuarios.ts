import type { Usuario } from '@/tipos';

export const usuariosMock: Usuario[] = [
  {
    id: 'usr-207', nombre: 'Emiliano Ruiz', email: 'emiliano@mail.com',
    telefono: '3455-401122', rol: 'jugador', espaciosFavoritos: ['esp-02'],
    cancelacionesTardias: 1, ausencias: 0,
  },
  {
    id: 'usr-002', nombre: 'Marcelo Benítez', email: 'marcelo@villaguay.gob.ar',
    telefono: '3455-400200', rol: 'encargado', espaciosFavoritos: [],
    cancelacionesTardias: 0, ausencias: 0,
  },
  {
    id: 'usr-001', nombre: 'Nahuel Ojeda', email: 'nahuel@villaguay.gob.ar',
    telefono: '3455-400100', rol: 'administrador', espaciosFavoritos: [],
    cancelacionesTardias: 0, ausencias: 0,
  },
  // Usuario sin reservas y con varias cancelaciones tardías ("quede marcado").
  {
    id: 'usr-318', nombre: 'Lucía Godoy', email: 'lucia@mail.com',
    telefono: '3455-418833', rol: 'jugador', espaciosFavoritos: ['esp-09', 'esp-10'],
    cancelacionesTardias: 4, ausencias: 2,
  },
  // Otros jugadores: llenan la grilla completa de la Cancha 1 (caso "sin turnos libres").
  {
    id: 'usr-401', nombre: 'Gonzalo Acosta', email: 'gonzalo@mail.com',
    telefono: '3455-402233', rol: 'jugador', espaciosFavoritos: ['esp-01'],
    cancelacionesTardias: 0, ausencias: 1,
  },
  {
    id: 'usr-402', nombre: 'Martina Silva', email: 'martina@mail.com',
    telefono: '3455-403344', rol: 'jugador', espaciosFavoritos: [],
    cancelacionesTardias: 0, ausencias: 0,
  },
  {
    id: 'usr-403', nombre: 'Rodrigo Paz', email: 'rodrigo@mail.com',
    telefono: '3455-404455', rol: 'jugador', espaciosFavoritos: ['esp-02'],
    cancelacionesTardias: 2, ausencias: 0,
  },
];

/**
 * Contraseñas de prueba. Sólo existen en el mock: la app real nunca guarda
 * ni compara contraseñas, eso lo hace la API.
 */
export const credencialesMock: { email: string; contrasena: string; usuarioId: string }[] = [
  { email: 'emiliano@mail.com', contrasena: 'fulbito123', usuarioId: 'usr-207' },
  { email: 'marcelo@villaguay.gob.ar', contrasena: 'encargado123', usuarioId: 'usr-002' },
  { email: 'nahuel@villaguay.gob.ar', contrasena: 'admin123', usuarioId: 'usr-001' },
  { email: 'lucia@mail.com', contrasena: 'fulbito123', usuarioId: 'usr-318' },
];

/** El mock entrega tokens con esta forma para poder resolver de quién son. */
export const tokenDe = (usuarioId: string) => `mock-token-${usuarioId}`;
export const usuarioDeToken = (token: string) => token.replace('mock-token-', '');
