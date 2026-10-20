import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { aplicarApariencia, leerApariencia } from '@/almacenamiento/apariencia';
import { SesionProvider, useSesion } from '@/contexto/SesionContexto';
import { ARCHIVOS_FUENTES, FUENTES, useTema } from '@/tema';

SplashScreen.preventAutoHideAsync();

// La apariencia elegida se aplica antes del primer dibujo, así no parpadea el otro modo.
aplicarApariencia(leerApariencia());

export default function LayoutRaiz() {
  const [fuentesListas, errorFuentes] = useFonts(ARCHIVOS_FUENTES);
  // Si la fuente fallara, la app sigue con la del sistema antes que quedar en blanco.
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <SafeAreaProvider>
      <SesionProvider>
        <Navegacion />
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
      </Stack>
    </>
  );
}
