/** Lo que maneja la Dirección (documento, sección 6). Sólo encargado o administrador. */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, type NombreIcono } from '@/componentes/Icono';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/contexto/SesionContexto';
import { ESPACIADO, RADIO, useTema } from '@/tema';

const ACCIONES: { titulo: string; detalle: string; icono: NombreIcono; ruta: Href }[] = [
  { titulo: 'Escanear ingreso', detalle: 'Leer el QR en la puerta y registrar la llegada.', icono: 'qr-code-outline', ruta: '/gestion/escanear' },
  { titulo: 'Agenda del día', detalle: 'Todos los espacios, quién viene y presentes o ausentes.', icono: 'today-outline', ruta: '/gestion/agenda' },
  { titulo: 'Bloqueos', detalle: 'Suspender turnos o días por lluvia o mantenimiento.', icono: 'rainy-outline', ruta: '/gestion/bloqueos' },
  { titulo: 'Reservas fijas', detalle: 'Grupos y clubes que tienen el turno todas las semanas.', icono: 'repeat-outline', ruta: '/gestion/fijas' },
  { titulo: 'Precios', detalle: 'Cambiar el precio por hora de cada espacio.', icono: 'pricetag-outline', ruta: '/gestion/precios' },
];

export default function Gestion() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const esPersonal = usuario?.rol === 'encargado' || usuario?.rol === 'administrador';

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={[estilos.pantalla, { paddingTop: insets.top + ESPACIADO.l }]}>
      <Texto variante="titulo" peso="negrita">
        Gestión
      </Texto>
      {!esPersonal ? (
        <Texto color={c.textoSuave}>Esta sección es sólo para el personal de la Dirección de Deportes.</Texto>
      ) : (
        ACCIONES.map((a) => (
          <Pressable
            key={a.titulo}
            onPress={() => router.push(a.ruta)}
            accessibilityRole="button"
            accessibilityLabel={a.titulo}
            accessibilityHint={a.detalle}
            style={({ pressed }) => [estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }, pressed && { opacity: 0.85 }]}
          >
            <View style={[estilos.icono, { backgroundColor: c.cesped }]}>
              <Icono nombre={a.icono} color={c.textoSobreCesped} tamano={24} />
            </View>
            <View style={estilos.flex}>
              <Texto peso="seminegrita">{a.titulo}</Texto>
              <Texto variante="etiqueta" color={c.textoSuave}>
                {a.detalle}
              </Texto>
            </View>
            <Icono nombre="chevron-forward" color={c.textoSuave} tamano={20} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.m },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.tarjeta, borderWidth: 1 },
  icono: { width: 48, height: 48, borderRadius: RADIO.control, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
