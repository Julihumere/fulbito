/**
 * Notificaciones del teléfono (documento, sección 5).
 *
 * - Recordatorio 2 horas antes: notificación local programada en el teléfono.
 *   Funciona en Expo Go y sin señal.
 * - Suspensión y turno liberado en un favorito: los genera el servidor. En
 *   producción llegarían por push (necesita development build: el push no
 *   anda en Expo Go en Android). Mientras tanto la app consulta los avisos y
 *   los muestra como notificación local.
 *
 * Cada notificación lleva en `data.url` la pantalla que abre al tocarla.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { dispositivos } from '@/servicios';
import type { Espacio, Notificacion, Reserva, Turno } from '@/tipos';
import { horaCorta, instante } from '@/utilidades/fechas';
import { HORAS_RECORDATORIO } from '@/utilidades/reglas';

type ModuloNotificaciones = typeof import('expo-notifications');

/**
 * `expo-notifications` en Android carga un módulo nativo al importarse, y Expo Go
 * no siempre lo trae: el import tira un error y tumba toda la app. Se carga acá
 * adentro y, si falla, las notificaciones quedan apagadas y el resto anda igual.
 */
const Notifications: ModuloNotificaciones | null = Platform.OS === 'web'
  ? null
  : (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga a propósito dentro del try
        return require('expo-notifications') as ModuloNotificaciones;
      } catch {
        return null;
      }
    })();

const CANAL_RECORDATORIOS = 'recordatorios';
const CANAL_AVISOS = 'avisos';

/** Última notificación tocada (para abrir su pantalla). Siempre `null` si no hay módulo. */
export function useUltimaRespuesta(): ReturnType<ModuloNotificaciones['useLastNotificationResponse']> {
  if (Platform.OS === 'web' || !Notifications) return null;
  // Platform.OS no cambia en tiempo de ejecución; el orden de hooks es estable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Notifications.useLastNotificationResponse();
}

export function limpiarUltimaRespuesta(): void {
  Notifications?.clearLastNotificationResponse();
}

/** Token de Expo del teléfono. null en web o si Expo Go no puede obtenerlo. */
export let tokenPushActual: string | null = null;

export async function obtenerTokenPush(): Promise<string | null> {
  try {
    return await pedirTokenPush();
  } catch {
    // En Expo Go Android el push remoto no está disponible; se sigue sin token.
    return null;
  }
}

/** Igual que obtenerTokenPush, pero explica el motivo cuando no se puede. */
async function pedirTokenPush(): Promise<string> {
  // El push remoto sólo anda en un teléfono real (o emulador con Google Play).
  if (Platform.OS === 'web' || !Notifications) throw new Error('Este dispositivo no admite notificaciones.');
  if (!Device.isDevice) throw new Error('Las push sólo andan en un teléfono real.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) throw new Error('Falta el projectId de EAS en la app.');
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  tokenPushActual = data;
  return data;
}

export type ResultadoRegistroPush = { ok: true } | { ok: false; motivo: string };

/**
 * Anota el teléfono en el servidor para que le lleguen las push (p. ej. cuando el
 * personal le cancela una reserva). Dice por qué no pudo, para mostrarlo en Ajustes.
 */
export async function registrarDispositivoPush(): Promise<ResultadoRegistroPush> {
  if (Platform.OS === 'web' || !Notifications) return { ok: false, motivo: 'Este dispositivo no admite notificaciones.' };
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return { ok: false, motivo: 'Falta el permiso de notificaciones.' };
    const token = await pedirTokenPush();
    await dispositivos.registrarDispositivo(token, Platform.OS === 'ios' ? 'ios' : 'android');
    return { ok: true };
  } catch (e) {
    // Sin push configurado, la app sigue con las notificaciones locales.
    return { ok: false, motivo: e instanceof Error ? e.message : 'No se pudo registrar el teléfono.' };
  }
}

/** Avisa cuando llega una notificación con la app abierta. Devuelve cómo dejar de escuchar. */
export function escucharNotificaciones(alRecibir: (datos: Record<string, unknown>) => void): () => void {
  if (!Notifications) return () => {};
  const suscripcion = Notifications.addNotificationReceivedListener((n) => {
    alRecibir((n.request.content.data ?? {}) as Record<string, unknown>);
  });
  return () => suscripcion.remove();
}

export async function permisoDeNotificaciones(): Promise<'concedido' | 'denegado' | 'sin-pedir' | 'no-disponible'> {
  if (!Notifications) return 'no-disponible';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'concedido';
    return p.canAskAgain ? 'sin-pedir' : 'denegado';
  } catch {
    return 'no-disponible';
  }
}

export function olvidarTokenPush(): void {
  tokenPushActual = null;
}

/** Se llama una vez al arrancar la app. */
export function configurarNotificaciones(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: 'Recordatorios de turnos',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
    Notifications.setNotificationChannelAsync(CANAL_AVISOS, {
      name: 'Suspensiones y turnos liberados',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

/** Pide permiso recién cuando hace falta (al reservar), no al abrir la app. */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) {
      void registrarDispositivoPush();
      return true;
    }
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
    // Recién con el permiso se puede pedir el token para las push del servidor.
    if (pedido.granted) void registrarDispositivoPush();
    return pedido.granted;
  } catch {
    return false;
  }
}

interface ReservaParaRecordar {
  reserva: Reserva;
  turno: Turno;
}

/**
 * Deja programado un recordatorio por cada reserva confirmada que todavía
 * esté a más de 2 horas, y borra los de las que se cancelaron.
 * Se llama cada vez que se cargan "mis reservas", así también se cubren
 * las reservas hechas desde otro teléfono.
 */
export async function sincronizarRecordatorios(
  lista: ReservaParaRecordar[],
  espacioDe: (id: string) => Espacio | undefined,
): Promise<void> {
  if (!Notifications) return;
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return;
    const guardado = (await leerDeCache<Record<string, string>>(CLAVES.recordatorios))?.valor ?? {};
    const ahora = Date.now();
    const quedan: Record<string, string> = {};

    for (const { reserva, turno } of lista) {
      const cuando = instante(turno.fecha, turno.inicio) - HORAS_RECORDATORIO * 60 * 60 * 1000;
      if (reserva.estado !== 'confirmada' || cuando <= ahora) continue;
      if (guardado[reserva.id]) {
        quedan[reserva.id] = guardado[reserva.id];
        continue;
      }
      const espacio = espacioDe(reserva.espacioId);
      quedan[reserva.id] = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Tu turno es en ${HORAS_RECORDATORIO} horas`,
          body: `${espacio?.nombre ?? 'Tu reserva'} a las ${horaCorta(turno.inicio)} hs. Mostrá el QR en la puerta.`,
          data: { url: `/reserva/${reserva.id}` },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL_RECORDATORIOS },
      });
    }

    await Promise.all(
      Object.entries(guardado)
        .filter(([reservaId]) => !quedan[reservaId])
        .map(([, id]) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
    );
    await guardarEnCache(CLAVES.recordatorios, quedan);
  } catch {
    // Si el sistema rechaza la notificación, la reserva sigue valiendo igual.
  }
}

/** Borra todos los recordatorios (al cerrar sesión). */
export async function borrarRecordatorios(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await guardarEnCache(CLAVES.recordatorios, {});
  } catch {
    // Nada que hacer.
  }
}

/** Muestra en el teléfono los avisos del servidor que todavía no se mostraron. */
export async function mostrarAvisosNuevos(avisos: Notificacion[]): Promise<void> {
  if (!Notifications) return;
  try {
    const mostrados = new Set((await leerDeCache<string[]>(CLAVES.avisosMostrados))?.valor ?? []);
    const nuevos = avisos.filter((a) => !a.leida && !mostrados.has(a.id));
    if (nuevos.length === 0) return;
    const permiso = await Notifications.getPermissionsAsync();
    if (permiso.granted) {
      for (const a of nuevos) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: a.titulo,
            body: a.mensaje,
            data: { url: a.tipo === 'liberado' ? `/disponibilidad/${a.espacioId}?fecha=${a.fecha}` : '/avisos' },
          },
          trigger: Platform.OS === 'android' ? { channelId: CANAL_AVISOS } : null,
        });
      }
    }
    nuevos.forEach((a) => mostrados.add(a.id));
    await guardarEnCache(CLAVES.avisosMostrados, [...mostrados]);
  } catch {
    // Los avisos igual quedan en la pantalla de avisos.
  }
}
