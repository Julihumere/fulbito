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
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import type { Espacio, Notificacion, Reserva, Turno } from '@/tipos';
import { horaCorta, instante } from '@/utilidades/fechas';
import { HORAS_RECORDATORIO } from '@/utilidades/reglas';

type ModuloNotificaciones = typeof import('expo-notifications');

/**
 * `expo-notifications` en Android carga un módulo nativo al importarse, y Expo Go
 * no siempre lo trae: el import tira un error y tumba toda la app. Se carga acá
 * adentro y, si falla, las notificaciones quedan apagadas y el resto anda igual.
 */
const Notifications: ModuloNotificaciones | null = (() => {
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
export const useUltimaRespuesta: () => ReturnType<ModuloNotificaciones['useLastNotificationResponse']> =
  Notifications?.useLastNotificationResponse ?? (() => null);

export function limpiarUltimaRespuesta(): void {
  Notifications?.clearLastNotificationResponse();
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
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
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
