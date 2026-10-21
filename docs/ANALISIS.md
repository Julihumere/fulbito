# Fulbito! — Análisis del pedido

Análisis del documento *Reservas Deportivas — Pedido de aplicación móvil* (Dirección de Deportes de Villaguay, Nahuel Ojeda) y estado de la entrega: todas las funciones del pedido andando contra datos inventados.

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

El cruce está en `src/utilidades/grilla.ts`, como código puro sin servicios. Hoy lo usa el servidor simulado. Si la API mandara las piezas sueltas, lo puede usar la app tal cual.

## 4. Arquitectura

```
src/
  app/              Pantallas (Expo Router). Sólo UI y navegación.
    (tabs)/         Inicio, Mis turnos, Gestión (sólo personal) y Perfil.
    disponibilidad/ La grilla de turnos de un espacio.
    reserva/        Mi reserva, con el QR.
    gestion/        Agenda, escaneo, bloqueos, fijas y precios.
  tipos/            Tipos del documento, escritos una vez. pendientes.ts = lo que falta definir.
  mocks/            Datos inventados y servidor.ts, el servidor simulado.
  servicios/        Única puerta a "el servidor". Hoy mocks, mañana fetch.
  almacenamiento/   secure-store (token), kv-store (copias sin señal) y archivos (fotos y video).
  contexto/         Sesión, mis reservas y avisos, compartidos por toda la app.
  notificaciones/   Recordatorio local y avisos del servidor.
  hooks/            Catálogo, agenda y ubicación.
  componentes/      Piezas de UI reutilizables.
  tema/             Paletas día/noche, Cascadia Code, espaciados.
  utilidades/       Fechas en hora argentina, cruce de la grilla, reglas, formato de precios.
```

Reglas que se cumplen desde el día uno:

- **Ninguna pantalla importa un mock.** Todo pasa por `src/servicios/`. Las funciones de servicio son `async` y devuelven lo mismo que la API, con la forma `{ datos, meta }` / `{ error: { codigo, mensaje } }`.
- **Para conectar la API real** se pone `USAR_MOCKS = false` en `src/servicios/cliente.ts` y se configura `EXPO_PUBLIC_API_URL`. Las rutas de `pedir()` son provisorias hasta conocer la API.
- **El token** viaja en `Authorization: Bearer <token>` y se guarda sólo en `expo-secure-store`.
- **Sin señal:** el perfil, el catálogo y las reservas del usuario se guardan en `expo-sqlite/kv-store`. La app arranca con lo guardado y después actualiza. Esto cubre el pedido de que el QR se vea en la puerta de la cancha, donde la señal es mala.

### Paquetes por capacidad (pedido de la cátedra)

| Capacidad | Paquete | Dónde se usa |
|---|---|---|
| Navegación | `expo-router` | Toda la app |
| Cámara | `expo-camera` (`CameraView`) | `gestion/escanear`: lee el QR en la puerta |
| Galería | `expo-image-picker` | Ficha del espacio: el personal sube fotos del estado de la cancha |
| Ubicación y mapa | `expo-location` + `react-native-maps` | Ficha (mapa chico) y `mapa` (todos los complejos, el más cercano, cómo llegar) |
| Notificaciones | `expo-notifications` | Recordatorio 2 h antes (local) y avisos de suspensión y de turno liberado |
| Persistencia y red | `expo-sqlite/kv-store`, `expo-network` | Catálogo, reservas con QR, agenda del día e ingresos pendientes guardados para usar sin señal |
| Seguridad | `expo-secure-store` + `expo-local-authentication` | Token de sesión. Huella del encargado antes de escanear |
| Sensores y háptica | `expo-haptics`, `expo-sensors` | Vibración distinta para un ingreso válido y uno inválido. Sacudir el teléfono para escanear el siguiente |
| Archivos | `expo-file-system` (`File`, `Directory`, `Paths`) | Fotos y video de la cancha guardados a pedido, y fotos subidas |
| Multimedia | `expo-video` (no `expo-av`) | Recorrido en video de la cancha |
| Íconos | `@react-native-vector-icons/ionicons` | Toda la app (no `@expo/vector-icons`) |
| QR | `react-native-qrcode-svg` + `react-native-svg` | Dibuja el código de ingreso en Mi reserva |

## 5. Decisiones provisorias de esta entrega

El documento pide avisar antes de decidir. Estas decisiones se tomaron sólo para poder avanzar, y son fáciles de cambiar:

1. **Se entra con email y contraseña.** El documento no define el registro ni el método de ingreso (pregunta 1).
2. **El inicio se usa sin cuenta**, como pide el documento. El ingreso se ofrece la primera vez que se abre la app, con la opción "Mirar sin cuenta", y después desde el botón "Entrar".
3. **Ids de turno con el formato `tur-<espacio>-<AAAAMMDD>-<HH>`**, porque el del documento no incluye el mes (pregunta 3).
4. **Complejos supuestos.** Fútbol 11, básquet, vóley y el gimnasio se ubicaron en el Polideportivo (pregunta 8).
5. **El gimnasio quedó como deporte "Gimnasio" (multiuso).** Vóley usa el ícono `ellipse-outline` porque Ionicons no tiene una pelota de vóley. Al reservar el gimnasio se elige qué se va a jugar: básquet, vóley, fútbol u otro (pregunta 9).
6. **Precedencia de la grilla:** mantenimiento > reservado > fijo > libre (pregunta 5). Un turno que ya empezó no se reserva (pregunta 11).
7. **Cancelación tardía.** Pasadas las 4 horas, el botón pasa a "Avisar que no vamos". El turno se libera igual y se suma una cancelación tardía. Con 3 o más, la persona queda marcada: lo ve ella en su perfil y el encargado en la agenda (pregunta 7).
8. **Bloqueo sobre reservas.** Las reservas que tapa un bloqueo se cancelan. No cuentan como tardías y a cada titular le llega un aviso (pregunta 5). "Mover un turno" no se modeló.
9. **Máximo de tres** = confirmadas que todavía no terminaron. Las fijas no cuentan (pregunta 12).
10. **Personas:** de 1 a la capacidad del espacio (pregunta 10).
11. **Escaneo.** El encargado elige qué espacio controla. La reserva tiene que ser de hoy y de ese espacio. Sin señal, valida contra la agenda de hoy guardada y registra el ingreso cuando vuelve la conexión (pregunta 13). "No se presentó" se marca a mano, recién cuando el turno empezó (pregunta 14).
12. **Roles.** Encargado y administrador pueden hacer todo lo de la sección 6 (pregunta 15).
13. **Avisos de favoritos.** Sólo por cancelaciones y sólo para turnos de los próximos 7 días.
14. **Fotos del estado de la cancha.** Las sube el personal desde la ficha y aparecen primeras en la galería (pregunta 17).

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
- **Mapa.** `react-native-maps` anda en Expo Go sin configurar nada. Para el build de producción en Android hace falta una clave de Google Maps (`androidGoogleMapsApiKey` en el plugin), que exige una cuenta de Google Cloud con facturación habilitada.
- **Videos sin datos.** Once videos de 30 segundos pueden ocupar decenas de MB. Se descargan a pedido, con el botón "Guardar en el teléfono" de cada ficha.
- **Face ID** no anda en Expo Go. En iPhone hace falta un development build; en Android la huella anda en Expo Go.
- **Avisos de favoritos.** "Avisar cuando se libera un turno de un favorito" puede generar muchas notificaciones. Conviene limitarlo a los próximos 7 días y a cancelaciones.

## 8. Datos de prueba

El servidor simulado (`src/mocks/servidor.ts`) guarda su estado en el teléfono, así lo que se reserva sobrevive a una recarga. Las fechas se siembran relativas al día en que se crean los datos. **Ajustes → Reiniciar datos de prueba** los vuelve a crear con fechas de hoy.

Los casos feos que pide el documento:

| Caso | Dónde |
|---|---|
| Día entero bloqueado por lluvia | Cancha 2, el próximo sábado (al menos 2 días adelante) |
| Grilla completa sin turnos libres | Cancha 1, mañana |
| Espacio sin video | esp-11 (el gimnasio sólo tiene fotos) |
| Reserva cancelada | res-1171 de Emiliano, y res-1173 (suspendida por la lluvia, con su aviso) |
| Fija que ocupa todos los martes | fij-07, Cancha 2, de 21 a 22 |
| Error de red | `simularErrorDeRed: true` en `src/mocks/configuracion.ts` |

Otros casos: un espacio sin fotos (esp-10), uno fuera de servicio (esp-06), una fija de dos horas (fij-08), una fija dada de baja (fij-03), un bloqueo de algunas horas (Vóley 1, mañana de 20 a 22), y Lucía Godoy con 4 cancelaciones tardías (queda marcada). Emiliano tiene un turno hoy en la Cancha 2 (o mañana si ya es de noche), uno en 3 días, uno jugado, uno cancelado y una ausencia.

## 9. Estado de esta entrega

**Hecho, sección por sección del documento:**

1. **Los espacios.** Listado con foto, deporte, superficie y luz. Filtros por deporte y complejo. Ficha con fotos, características, precio, reglas y video. Mapa de todos los complejos, el más cercano y cómo llegar.
2. **La disponibilidad.** Grilla de 8 a 24 de los próximos 7 días, con libre, ocupado, fijo y mantenimiento. Muestra la fija con el nombre del grupo y el motivo del bloqueo. Los turnos que ya empezaron no se reservan. Se mira sin cuenta.
3. **Reservar y mis reservas.** Dos toques: el turno y el botón. Personas y deporte vienen cargados. Mis turnos separa próximas y pasadas. Se cancela sola hasta 4 horas antes; después queda como tardía. Hay un máximo de 3 activas.
4. **El ingreso.** QR en Mi reserva, guardado para verlo sin señal. Huella del encargado, cámara y vibración distinta para válido e inválido. Mensajes claros para "no es de hoy", "es de otra cancha" y "ya se usó". También ingreso manual y "no se presentó".
5. **Recordatorios y avisos.** Recordatorio local 2 horas antes. Aviso de suspensión al bloquear. Aviso de turno liberado en un favorito.
6. **Lo que manejamos nosotros.** Bloqueos de turnos o días (un espacio o todo un complejo al aire libre), reservas fijas, agenda del día, escaneo y precios.

**Verificado:**
- `tsc --noEmit` y `expo lint` sin errores. `expo-doctor`: 21 de 21 chequeos.
- 11 comprobaciones del cruce de la grilla: precedencia, fijas de varias horas y vencidas, lluvia, turnos pasados, ids con mes y el límite de 4 horas.
- `expo export --platform android` compila.

**Sin verificar en un teléfono:** la cámara, la huella, las notificaciones y el mapa necesitan probarse a mano en un dispositivo.

## 10. Próximos pasos

1. Respuestas de Nahuel a las preguntas de la sección 6, sobre todo la 4 (fijas sin persona) y la 6 (quién arma la grilla).
2. Conectar la API de la cátedra: `USAR_MOCKS = false` y ajustar las rutas de los servicios.
3. Push real para los avisos: development build (`eas build --profile development`) y que la API guarde los tokens.
4. Clave de Google Maps y build de producción con EAS.
