import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, type NombreIcono } from '@/componentes/Icono';
import { FUENTES, useTema } from '@/tema';

function icono(activo: NombreIcono, inactivo: NombreIcono) {
  return function IconoPestana({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icono nombre={focused ? activo : inactivo} color={color as string} tamano={24} />;
  };
}

/** Barra inferior: Inicio, Mis turnos y Perfil. */
export default function LayoutPestanas() {
  const { c, esNoche } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // El verde césped no se ve sobre la barra oscura: de noche la pestaña activa va en amarillo.
        tabBarActiveTintColor: esNoche ? c.acento : c.cesped,
        tabBarInactiveTintColor: c.textoSuave,
        tabBarLabelStyle: { fontFamily: FUENTES.seminegrita, fontSize: 12 },
        tabBarStyle: { backgroundColor: c.superficie, borderTopColor: c.borde, height: 72 + insets.bottom, paddingTop: 8, paddingBottom: 8 + insets.bottom },
        tabBarItemStyle: { paddingVertical: 4, gap: 2 },
        sceneStyle: { backgroundColor: c.fondo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('home', 'home-outline') }} />
      <Tabs.Screen name="turnos" options={{ title: 'Mis turnos', tabBarIcon: icono('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person', 'person-outline') }} />
    </Tabs>
  );
}
