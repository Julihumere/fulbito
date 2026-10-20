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

### Mapa

El mapa de la ficha es de OpenStreetMap (Leaflet dentro de un `WebView`): gratis, sin clave y funciona en Expo Go. Necesita conexión para bajar los mosaicos. "Cómo llegar" abre la app de mapas del teléfono.

## Usuarios de prueba

Con los datos inventados, la pantalla de ingreso muestra botones que completan estos usuarios:

| Rol           | Email                    | Contraseña   |
| ------------- | ------------------------ | ------------ |
| Jugador       | emiliano@mail.com        | fulbito123   |
| Encargado     | marcelo@villaguay.gob.ar | encargado123 |
| Administrador | nahuel@villaguay.gob.ar  | admin123     |

## Probar casos difíciles

- **Sin conexión.** Abrí la app una vez con internet, después poné el modo avión y volvé a abrirla. Los espacios se siguen viendo.
- **Error de red.** En `src/mocks/configuracion.ts` poné `simularErrorDeRed: true`.
- **Modo noche.** Activá el modo oscuro del teléfono.

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npx expo lint
```

## Estructura

Ver `docs/ANALISIS.md`, que tiene la arquitectura, las decisiones provisorias, las preguntas abiertas para la Dirección de Deportes y el plan de entregas.

Regla principal: **ninguna pantalla importa mocks**. Todo pasa por `src/servicios/`. Para conectar la API de la cátedra se pone `USAR_MOCKS = false` en `src/servicios/cliente.ts` y se define `EXPO_PUBLIC_API_URL`.
