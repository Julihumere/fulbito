# Fulbito!

App de reservas de los espacios deportivos municipales de Villaguay (Entre Ríos). Es el TP final de la Tecnicatura Universitaria en Desarrollo Web.

React Native · Expo SDK 57 · TypeScript · Expo Router.

## Cómo correrla

Necesitás:

- Node 20 o más nuevo.
- La app **Expo Go** en el teléfono, compatible con el SDK 57.

```bash
npm install
npx expo start
```

Escaneá el QR que aparece en la terminal con Expo Go (Android) o con la cámara (iPhone).

Como el proyecto tiene `expo-dev-client`, para abrirlo en Expo Go hay que usar `npx expo start --go`. Expo Go pide haber iniciado sesión con la misma cuenta de Expo en la PC (`npx expo login`, en una terminal propia) y en el teléfono.

### Qué anda en Expo Go y qué no

- **Mapa** (`react-native-maps`): anda en Expo Go sin clave. El build de producción de Android necesita una clave de Google Maps.
- **Recordatorios y avisos**: son notificaciones locales y andan en Expo Go. El push del servidor necesita un development build.
- **Huella**: anda en Android. Face ID en iPhone necesita un development build.

## Usuarios de prueba

Con los datos inventados, la pantalla de ingreso muestra botones que completan estos usuarios:

| Rol           | Email                    | Contraseña   |
| ------------- | ------------------------ | ------------ |
| Jugador       | emiliano@mail.com        | fulbito123   |
| Encargado     | marcelo@villaguay.gob.ar | encargado123 |
| Administrador | nahuel@villaguay.gob.ar  | admin123     |

Lucía Godoy (`lucia@mail.com` / `fulbito123`) tiene 4 cancelaciones tardías y queda marcada.

## Probar casos difíciles

- **Día de lluvia.** Cancha 2, el próximo sábado: todo el día bloqueado.
- **Grilla llena.** Cancha 1, mañana: no queda ningún turno libre.
- **Fija de los martes.** Cancha 2, cualquier martes a las 21.
- **Escanear.** Entrá como Emiliano en un teléfono y abrí su turno de hoy. En otro teléfono, entrá como Marcelo → Gestión → Escanear ingreso → Cancha 2. Probá también con otra cancha elegida, para ver el error.
- **Suspender.** Como Marcelo, en Gestión → Bloqueos, bloqueá un turno que Emiliano tenga reservado. Al volver a entrar como Emiliano le llega el aviso.
- **QR sin conexión.** Abrí Mi reserva con internet, poné el modo avión y volvé a abrirla. El código se sigue viendo.
- **Error de red.** En `src/mocks/configuracion.ts` poné `simularErrorDeRed: true`.
- **Modo noche.** Activá el modo oscuro del teléfono.
- **Volver al principio.** Ajustes → Reiniciar datos de prueba.

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npx expo lint
```

## Estructura

Ver `docs/ANALISIS.md`, que tiene la arquitectura, las decisiones provisorias, las preguntas abiertas para la Dirección de Deportes y el plan de entregas.

Regla principal: **ninguna pantalla importa mocks**. Todo pasa por `src/servicios/`. Para conectar la API de la cátedra se pone `USAR_MOCKS = false` en `src/servicios/cliente.ts` y se define `EXPO_PUBLIC_API_URL`.
