# Fulbito! — Análisis del pedido

Análisis del documento *Reservas Deportivas — Pedido de aplicación móvil* (Dirección de Deportes de Villaguay, Nahuel Ojeda) y estado de la primera entrega: estructura del proyecto, ingreso y pantalla de inicio.

## 1. El problema, en una frase

Hoy las reservas viven en dos libretas y un WhatsApp. Eso produce tres fallas concretas, que son la vara para medir si la app sirve:

| Falla del mes pasado | Qué la resuelve en la app |
|---|---|
| Dos grupos con la misma cancha el mismo viernes a las 21 | Una sola fuente de verdad (la API) y una grilla que muestra **fijas** y **reservas** juntas |
| Seis grupos vinieron a una cancha anegada | Bloqueo por mantenimiento con motivo y **aviso push** a quienes tenían turno |
| 30 % de turnos reservados y no usados | Cancelar con un botón, recordatorio 2 h antes, registro de **ausentes** y de **cancelaciones tardías** |

## 2. Alcance de la primera versión

**Entra:** catálogo de los 11 espacios (fotos, video, reglas, precio, mapa), grilla de disponibilidad de 8 a 24 para los próximos 7 días, reservar, mis reservas, cancelar, QR de ingreso visible sin señal, recordatorios y avisos, y el modo encargado/administrador (bloqueos, fijas, agenda del día, escaneo, precio).

**No entra** (lo dice el documento): pagos y señas, torneos, armado de equipos, canchas privadas, alquiler de elementos.

## 3. Lo difícil: armar la grilla de un día

El documento lo dice explícitamente: una reserva fija **no es un turno**, es una regla. La grilla de un espacio en un día sale de cruzar tres fuentes:

1. Las **reservas** confirmadas, cumplidas o ausentes de ese día (las canceladas liberan el turno).
2. Las **reservas fijas vigentes**: `activa`, `dia` igual al día de la semana, `desde ≤ fecha` y `hasta` nulo o `≥ fecha`, y la hora dentro de `[inicio, fin)`. Una fija puede ocupar más de una hora (ej. un club que entrena de 18 a 20).
3. Los **bloqueos** de mantenimiento o lluvia (un turno o el día entero).

Para cada hora de 8 a 23 se decide un estado. La precedencia propuesta, **a confirmar con Nahuel** (pregunta 5), es:

```
mantenimiento  >  reservado  >  fijo  >  libre
```

Además, un turno cuyo inicio ya pasó no se puede reservar aunque figure libre. Esto se calcula en el teléfono con la hora de Argentina (UTC−03:00), no con la zona del dispositivo.

Hay una pregunta abierta que define dónde vive este código: ¿la API devuelve la grilla ya armada (el tipo `Turno` tiene estado `"fijo"`, lo que sugiere que sí) o la arma la app? (pregunta 6).

## 4. Arquitectura

```
src/
  app/              Pantallas (Expo Router). Sólo UI y navegación.
  tipos/            Tipos del documento, escritos una vez. pendientes.ts = lo que falta definir.
  mocks/            Datos inventados, tipados con los mismos tipos.
  servicios/        Única puerta a "el servidor". Hoy mocks, mañana fetch.
  almacenamiento/   secure-store (token) y kv-store (copias para usar sin señal).
  contexto/         Sesión.
  hooks/            Carga de datos con copia local.
  componentes/      Piezas de UI reutilizables.
  tema/             Paletas día/noche, Cascadia Code, espaciados.
  utilidades/       Fechas en hora argentina, formato de precios.
```

Reglas que se cumplen desde el día uno:

- **Ninguna pantalla importa un mock.** Todo pasa por `src/servicios/`. Las funciones de servicio son `async` y devuelven lo mismo que la API, con la forma `{ datos, meta }` / `{ error: { codigo, mensaje } }`.
- **Para conectar la API real** se pone `USAR_MOCKS = false` en `src/servicios/cliente.ts` y se configura `EXPO_PUBLIC_API_URL`. Las rutas de `pedir()` son provisorias hasta conocer la API.
- **El token** viaja en `Authorization: Bearer <token>` y se guarda sólo en `expo-secure-store`.
- **Sin señal:** el perfil, el catálogo y las reservas del usuario se guardan en `expo-sqlite/kv-store`. La app arranca con lo guardado y después actualiza. Esto cubre el pedido de que el QR se vea en la puerta de la cancha, donde la señal es mala.

### Paquetes por capacidad (pedido de la cátedra)

| Capacidad | Paquete | Estado |
|---|---|---|
| Navegación | `expo-router` | ✅ instalado y en uso |
| Persistencia y red | `expo-sqlite/kv-store`, `expo-network` | ✅ en uso (copias locales, aviso sin conexión) |
| Seguridad | `expo-secure-store` | ✅ token. `expo-local-authentication` con el escaneo |
| Háptica | `expo-haptics` | ✅ en el login. Ingreso válido/inválido con el escaneo |
| Íconos | `@react-native-vector-icons/ionicons` | ✅ (no `@expo/vector-icons`) |
| Cámara | `expo-camera` (`CameraView`) | próxima: escaneo del encargado |
| Notificaciones | `expo-notifications` | próxima: recordatorio y avisos |
| Mapa | `react-native-webview` (OpenStreetMap con Leaflet) | ✅ en la ficha del espacio |
| Multimedia | `expo-video` (no `expo-av`) | próxima: recorrido de la cancha |
| Archivos | `expo-file-system` (`File`, `Directory`, `Paths`) | próxima: video y fotos sin datos |
| Galería | `expo-image-picker` | próxima: fotos del estado de la cancha |
| Sensores | `expo-sensors` | a definir: el documento no dice para qué se usaría |

## 5. Decisiones provisorias de esta entrega

El documento pide avisar antes de decidir. Estas decisiones se tomaron sólo para poder avanzar, y son fáciles de cambiar:

1. **Se entra con email y contraseña.** El documento no define el registro ni el método de ingreso (pregunta 1).
2. **El inicio se usa sin cuenta**, como pide el documento. El ingreso se ofrece la primera vez que se abre la app, con la opción "Mirar sin cuenta", y después desde el botón "Entrar".
3. **Ids de turno con el formato `tur-<espacio>-<AAAAMMDD>-<HH>`**, porque el del documento no incluye el mes (pregunta 3).
4. **Complejos supuestos.** Fútbol 11, básquet, vóley y el gimnasio se ubicaron en el Polideportivo (pregunta 8).
5. **El gimnasio quedó como deporte "Gimnasio" (multiuso).** Vóley usa el ícono `ellipse-outline` porque Ionicons no tiene una pelota de vóley.

## 6. Huecos: preguntas para Nahuel

Numeradas para poder referirse a ellas.

1. **Cuentas.** ¿Cómo se crea una cuenta y con qué se entra: email y contraseña, teléfono con código por SMS o WhatsApp? ¿Quién crea las cuentas de encargado y administrador?
2. **La reserva no dice cuándo es.** `Reserva` no tiene fecha ni hora, sólo `turnoId`. Para mostrarla sin señal hay que pedir y guardar también el `Turno`. ¿Puede la API incluir `fecha`, `inicio` y `fin` en la reserva?
3. **Ids y QR repetidos.** `"tur-0219-19"` y `"VGY-1180-0219-19"` no incluyen el mes, así que el 19/09 y el 19/10 dan el mismo id. Además, un código predecible se puede falsificar. Propuesta: que el QR lleve un código firmado por el servidor.
4. **Fijas sin persona.** `titular` es texto, no un usuario. Entonces los grupos fijos no tienen QR, no reciben avisos de lluvia y no se les puede marcar ausencia. ¿Se vinculan a un usuario? ¿Cómo se libera un martes puntual (feriado, el grupo no viene)?
5. **Bloqueos.** No existe una entidad para ellos: `motivoBloqueo` vive en el turno. ¿Qué gana si coinciden una fija y un bloqueo? Si se bloquea un día con reservas, ¿qué pasa con esas reservas? `EstadoReserva` no tiene "suspendida". "Mover el turno" tampoco tiene modelo.
6. **¿Quién arma la grilla?** ¿La API devuelve los 16 turnos del día ya cruzados, o la app recibe reservas, fijas y bloqueos y los cruza?
7. **Cancelación tardía.** Pasadas las 4 horas, ¿el botón se deshabilita y se muestra el contacto, o se permite cancelar y queda marcada? ¿Cuántas cancelaciones son "repetidas veces"? ¿Quién lo ve?
8. **Complejos.** El documento sólo ubica fútbol 5 (Polideportivo) y tenis (Parque Berduc). ¿Dónde están los demás? Tampoco existe la entidad `Complejo`: las coordenadas van repetidas en cada espacio.
9. **Deporte al reservar.** Se pide "indicar el deporte", pero cada espacio tiene un único `deporteId`. ¿Se refiere al gimnasio multiuso? ¿Qué deportes admite?
10. **Personas y capacidad.** ¿Se limita `cantidadPersonas` por la `capacidad`? Recordemos el ocho contra ocho en una cancha de fútbol 5.
11. **Turno en curso.** A las 19:20, ¿se puede reservar el turno de 19 a 20?
12. **Máximo de tres.** ¿Cuentan las fijas? ¿"Activas" son sólo las confirmadas futuras?
13. **Escaneo sin señal.** Si Marcelo tampoco tiene señal en la puerta, necesita tener la agenda del día descargada. ¿Cómo sabe la app qué cancha está controlando, para decir "este código no es de esta cancha"?
14. **Ausente.** ¿Desde cuántos minutos después del inicio se puede marcar "no se presentó"? ¿Se hace a mano o en automático?
15. **Roles.** ¿Qué puede hacer el administrador que no pueda el encargado? Por ejemplo, ¿quién cambia precios? ¿Quién edita fijas?
16. **Precio.** Si cambia el precio, ¿las reservas ya hechas mantienen el anterior?
17. **Fotos de la galería.** ¿Quién sube fotos del estado de la cancha y dónde se ven? No figura en la sección 6.
18. **Forma de la API.** ¿`datos` es siempre un arreglo, también al pedir un solo objeto? ¿Cuál es la lista completa de códigos de error? ¿Cuál es el endpoint de ingreso?

## 7. Lo caro o con riesgo

El documento pide decirlo:

- **Avisos del servidor.** El recordatorio de 2 horas puede ser una notificación local, programada al reservar. Pero el aviso de suspensión por lluvia y el de turno liberado en un favorito tienen que mandarse **desde el servidor** con push. Esto depende de que la API de la cátedra guarde los tokens de push y los envíe. Además, desde el SDK 53, **el push no funciona en Expo Go en Android**: hace falta un development build (EAS).
- **Mapa.** El documento pide "conectar API de Google Maps", pero esa API exige facturación. Se usó OpenStreetMap (gratis, sin clave) y un botón "Cómo llegar" que abre la app de mapas del teléfono. **A confirmar con Nahuel** si Google es requisito.
- **Videos sin datos.** Once videos de 30 segundos pueden ocupar decenas de MB. Propuesta: descargarlos a pedido o sólo con wifi.
- **Avisos de favoritos.** "Avisar cuando se libera un turno de un favorito" puede generar muchas notificaciones. Conviene limitarlo a los próximos 7 días y a cancelaciones.

## 8. Datos de prueba

Los mocks de **turnos y reservas se quitaron**: por ahora nadie tiene reservas, y la grilla de disponibilidad se arma con la API real o con datos nuevos. Quedan los espacios, deportes, usuarios y reservas fijas. Casos de los espacios:

| Caso | Dónde |
|---|---|
| Espacio sin video | esp-11 (el gimnasio sólo tiene fotos) |
| Espacio sin fotos | esp-10 |
| Espacio fuera de servicio | esp-06 |
| Fija que ocupa todos los martes | fij-07, Cancha 2, 21 a 22 |
| Fija dada de baja | fij-03 (no ocupa nada) |
| Usuario con cancelaciones tardías | Lucía Godoy (4) |
| Error de red | `simularErrorDeRed: true` en `src/mocks/configuracion.ts` |

## 9. Estado de esta entrega

**Hecho:**
- Proyecto Expo SDK 57 con TypeScript y Expo Router. Se bajó desde el SDK 58 porque el Expo Go de Play Store todavía es el del 57.
- Tipos, mocks y capa de servicios.
- Sesión con token seguro y copias locales.
- Pantalla de ingreso.
- Pantalla de inicio: catálogo con filtros por deporte y complejo, próximo turno con su código, aviso sin conexión, vista distinta para encargado y administrador.
- Ficha mínima del espacio, para que la navegación funcione.

**Verificado:**
- `tsc --noEmit` y `expo lint` sin errores.
- 18 comprobaciones de fechas y mocks.
- `expo export --platform android` compila.

**Sin verificar:** todavía no se probó en un teléfono ni en un emulador.

**Diseño:**
- Cascadia Code en toda la app.
- Paleta de cancha de día y cancha de noche, que sigue el modo oscuro del teléfono. Contraste alto para leer a la intemperie y tocables de 48 px o más.
- El ingreso es media cancha vista desde arriba. Los errores se muestran como tarjeta roja.

## 10. Próximas entregas propuestas

1. **Grilla de disponibilidad.** El cruce de la sección 3, probado con los casos de lluvia, grilla llena y fija. Es la pantalla más importante y donde se decide si la app sirve.
2. **Reservar y Mis reservas.** Incluye el QR guardado para verlo sin señal, cancelar y el máximo de tres.
3. **Encargado.** Escaneo con `CameraView`, reingreso con huella, háptica distinta para válido e inválido, presente y ausente, agenda del día.
4. **Administración.** Bloqueos con motivo, alta y edición de fijas, precios.
5. **Ficha completa.** Fotos, video guardado, mapa y "Cómo llegar", favoritos.
6. **Notificaciones** y build de producción con EAS.
