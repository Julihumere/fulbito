import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { aplicarApariencia, leerApariencia } from '@/almacenamiento/apariencia';
import { AvisosProvider } from '@/contexto/AvisosContexto';
import { ReservasProvider } from '@/contexto/ReservasContexto';
import { SesionProvider, useSesion } from '@/contexto/SesionContexto';
import { configurarNotificaciones, limpiarUltimaRespuesta, useUltimaRespuesta } from '@/notificaciones';
import { ARCHIVOS_FUENTES, FUENTES, useTema } from '@/tema';

SplashScreen.preventAutoHideAsync();
configurarNotificaciones();

// La apariencia elegida se aplica antes del primer dibujo, así no parpadea el otro modo.
aplicarApariencia(leerApariencia());

export default function LayoutRaiz() {
  const [fuentesListas, errorFuentes] = useFonts(ARCHIVOS_FUENTES);
  // Si la fuente fallara, la app sigue con la del sistema antes que quedar en blanco.
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <SafeAreaProvider>
      <SesionProvider>
        <ReservasProvider>
          <AvisosProvider>
            <Navegacion />
          </AvisosProvider>
        </ReservasProvider>
      </SesionProvider>
    </SafeAreaProvider>
  );
}

function Navegacion() {
  const { c, esNoche } = useTema();
  const { estado } = useSesion();

  // Fondo de la ventana: es lo que se ve bajo la barra de navegación del sistema, debe coincidir con la barra de pestañas.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.superficie).catch(() => {});
  }, [c.superficie]);

  // El splash se va recién cuando sabemos si hay sesión: así no parpadea "invitado".
  useEffect(() => {
    if (estado !== 'cargando') SplashScreen.hideAsync();
  }, [estado]);

  // Tocar una notificación abre su pantalla (también si la app estaba cerrada).
  const ultimaRespuesta = useUltimaRespuesta();
  useEffect(() => {
    const url = ultimaRespuesta?.notification.request.content.data?.url;
    if (estado !== 'cargando' && typeof url === 'string') {
      router.push(url as Parameters<typeof router.push>[0]);
      limpiarUltimaRespuesta();
    }
  }, [ultimaRespuesta, estado]);

  if (estado === 'cargando') return null;

  return (
    <>
      {/* Todas las pantallas arrancan con césped arriba: íconos del sistema en blanco. */}
      <StatusBar style="light" />
      {/* Botones del sistema (Android): claros sobre la app oscura, oscuros sobre la clara. */}
      <NavigationBar style={esNoche ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: c.fondo },
          headerStyle: { backgroundColor: c.cesped },
          headerTintColor: c.textoSobreCesped,
          headerTitleStyle: { fontFamily: FUENTES.negrita },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="espacio/[id]" options={{ title: '' }} />
        <Stack.Screen name="disponibilidad/[id]" options={{ title: 'Turnos' }} />
        <Stack.Screen name="reserva/[id]" options={{ title: 'Mi reserva' }} />
        <Stack.Screen name="mapa" options={{ title: 'Complejos' }} />
        <Stack.Screen name="avisos" options={{ title: 'Avisos' }} />
        <Stack.Screen name="gestion/agenda" options={{ title: 'Agenda del día' }} />
        <Stack.Screen name="gestion/escanear" options={{ title: 'Escanear ingreso' }} />
        <Stack.Screen name="gestion/bloqueos" options={{ title: 'Bloqueos' }} />
        <Stack.Screen name="gestion/fijas" options={{ title: 'Reservas fijas' }} />
        <Stack.Screen name="gestion/fija" options={{ title: 'Reserva fija' }} />
        <Stack.Screen name="gestion/precios" options={{ title: 'Precios' }} />
      </Stack>
    </>
  );
}
