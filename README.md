# Fulbito!

App de reservas de los espacios deportivos municipales de Villaguay (Entre Ríos). Es el TP final de la Tecnicatura Universitaria en Desarrollo Web.

React Native · Expo SDK 58 · TypeScript · Expo Router.

## Cómo correrla

Necesitás:

- Node 20 o más nuevo.
- La app **Expo Go** en el teléfono, compatible con el SDK 58.
- La API de la cátedra corriendo (ver abajo) o dejar los mocks.

```bash
npm install
cp .env.example .env.local   # y completá EXPO_PUBLIC_API_URL
npx expo start --go -c
```

Escaneá el QR que aparece en la terminal con Expo Go (Android) o con la cámara (iPhone).

Como el proyecto tiene `expo-dev-client`, para abrirlo en Expo Go hay que usar `npx expo start --go`. Expo Go pide haber iniciado sesión con la misma cuenta de Expo en la PC (`npx expo login`, en una terminal propia) y en el teléfono.

## Conectar la API

La API está en [`franco-ruisdias-uner/api-proyectos-mobile`](https://github.com/franco-ruisdias-uner/api-proyectos-mobile/tree/main/api-reservas-deportivas). Seguí su README para levantarla (`docker compose up` o `pnpm dev`).

Después, en `.env.local`:

```bash
EXPO_PUBLIC_USAR_MOCKS=false
# API desplegada y expuesta a internet (Dokploy + Tailscale Funnel), es la que
# ya está configurada:
EXPO_PUBLIC_API_URL=https://fulbito-api.taild5debe.ts.net:8443
# WhatsApp de la Dirección (código de país, sin signos)
EXPO_PUBLIC_WHATSAPP_DIRECCION=5493456267235

# Alternativas para desarrollo local:
# EXPO_PUBLIC_API_URL=http://localhost:3000
# EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

Expo lee las variables al compilar: reiniciá con `npx expo start -c`. Si no definís `EXPO_PUBLIC_USAR_MOCKS=false`, la app usa los datos inventados de `src/mocks/` y no necesita la API.

La app ya implementa: registro e ingreso, catálogo, grilla, reservas, cancelación, favoritos, agenda, ingresos por QR, bloqueos, fijas, precios, carga múltiple de fotos y cancelación de reservas del día por el personal. El envío de push del servidor ya está implementado en la API; la app pide permiso y registra el teléfono desde Ajustes. En Android se prueba con development build, no con Expo Go.

### Qué anda en Expo Go y qué no

- **Mapa** (`react-native-maps`): anda en Expo Go. La clave de Google Maps para el build de Android ya está configurada en `app.json`; probar el APK.
- **Recordatorios**: son notificaciones locales y andan en Expo Go. El push del servidor necesita un development build; la API ya implementa `/dispositivos` y la app registra el teléfono desde Ajustes.
- **Huella**: anda en Android. Face ID en iPhone necesita un development build.
- **Cámara**: el escaneo de QR necesita un teléfono con cámara; en web no está disponible.

Para el build de Android, `app.json` referencia `./google-services.json` (Firebase). No está versionado: pedilo al grupo antes de correr `eas build`.

## Usuarios de prueba

### API real

Todos usan la contraseña **`villaguay2026`**.

| Rol           | Email                      |
| ------------- | -------------------------- |
| Jugador       | emiliano@mail.com          |
| Jugador       | lleno@demo.ar              |
| Jugador       | nuevo@demo.ar              |
| Encargado     | marcelo@villaguay.demo.ar  |
| Administrador | nahuel@villaguay.demo.ar   |

El registro desde la app crea siempre una cuenta de **jugador**.

### Mocks locales

La pantalla de ingreso muestra atajos (sólo con `EXPO_PUBLIC_USAR_MOCKS=true`):

| Rol           | Email                    | Contraseña   |
| ------------- | ------------------------ | ------------ |
| Jugador       | emiliano@mail.com        | fulbito123   |
| Encargado     | marcelo@villaguay.gob.ar | encargado123 |
| Administrador | nahuel@villaguay.gob.ar  | admin123     |

Lucía Godoy (`lucia@mail.com` / `fulbito123`) tiene 4 cancelaciones tardías y queda marcada.

## Probar casos difíciles

- **Día de lluvia.** Cancha 2, el próximo sábado (API): todo el día bloqueado.
- **Grilla llena.** Cancha 1, mañana (API): no queda ningún turno libre.
- **Fija de los martes.** Cancha 2, cualquier martes a las 21.
- **Escanear.** Entrá como Emiliano en un teléfono y abrí su turno de hoy. En otro teléfono, entrá como Marcelo → Gestión → Escanear ingreso → Cancha 2. Probá también con otra cancha elegida, para ver el error.
- **Suspender.** Como Marcelo, en Gestión → Bloqueos, bloqueá un turno que Emiliano tenga reservado. La API cancela la reserva y avisa por push cuando esa parte esté implementada.
- **QR sin conexión.** Abrí Mi reserva con internet, poné el modo avión y volvé a abrirla. El código se sigue viendo.
- **Error de red (API).** Mandá la cabecera `X-Simular: error-500` (la API la acepta en desarrollo) o apagá la API.
- **Error de red (mocks).** En `src/mocks/configuracion.ts` poné `simularErrorDeRed: true`.
- **Modo noche.** Activá el modo oscuro del teléfono.
- **Volver al principio (mocks).** Ajustes → Reiniciar datos de prueba.

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npx expo lint
npx expo export --platform android
```

## Estructura

Ver `docs/ANALISIS.md`, que tiene la arquitectura, las decisiones provisorias, las preguntas abiertas para la Dirección de Deportes y el plan de entregas.

Regla principal: **ninguna pantalla importa mocks**. Todo pasa por `src/servicios/`. Con `EXPO_PUBLIC_USAR_MOCKS=false` los servicios hablan con la API; con `true` usan `src/mocks/`. Los tipos del PRD están en `src/tipos/` y no se tocan.
