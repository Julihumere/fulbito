import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { aplicarApariencia, leerApariencia, type Apariencia } from '@/almacenamiento/apariencia';
import { Boton } from '@/componentes/Boton';
import { Chip } from '@/componentes/Chip';
import { Texto } from '@/componentes/Texto';
import { useAvisos } from '@/contexto/AvisosContexto';
import { useReservas } from '@/contexto/ReservasContexto';
import { useSesion } from '@/contexto/SesionContexto';
import { usuarios as servicioUsuarios, USAR_MOCKS } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';

const OPCIONES: { valor: Apariencia; texto: string; icono: 'sunny-outline' | 'moon-outline' | 'phone-portrait-outline' }[] = [
  { valor: 'claro', texto: 'Claro', icono: 'sunny-outline' },
  { valor: 'oscuro', texto: 'Oscuro', icono: 'moon-outline' },
  { valor: 'sistema', texto: 'Sistema', icono: 'phone-portrait-outline' },
];

export default function Ajustes() {
  const { c } = useTema();
  const [apariencia, setApariencia] = useState<Apariencia>('sistema');
  const { refrescarPerfil } = useSesion();
  const reservas = useReservas();
  const avisos = useAvisos();

  useEffect(() => {
    let vigente = true;
    leerApariencia().then((valor) => { if (vigente) setApariencia(valor); });
    return () => { vigente = false; };
  }, []);

  function elegir(valor: Apariencia) {
    setApariencia(valor);
    void aplicarApariencia(valor);
  }

  function reiniciar() {
    Alert.alert('Reiniciar datos de prueba', 'Se borran las reservas, bloqueos y fijas que cargaste.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          servicioUsuarios.reiniciarDatosDePrueba();
          await Promise.all([reservas.recargar(), avisos.recargar(), refrescarPerfil()]);
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla}>
      <Stack.Screen options={{ title: 'Ajustes' }} />

      <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Texto peso="seminegrita">Apariencia</Texto>
        <View style={estilos.chips} accessibilityRole="radiogroup">
          {OPCIONES.map((o) => (
            <Chip key={o.valor} texto={o.texto} icono={o.icono} activo={apariencia === o.valor} onPress={() => elegir(o.valor)} />
          ))}
        </View>
        <Texto variante="chico" color={c.textoSuave}>
          {apariencia === 'sistema'
            ? 'Sigue el modo claro u oscuro del teléfono.'
            : `Siempre en modo ${apariencia}, sin importar el teléfono.`}
        </Texto>
      </View>

      <View style={[estilos.fila, estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Texto variante="etiqueta" color={c.textoSuave} style={estilos.clave}>
          Versión
        </Texto>
        <Texto variante="etiqueta">{Constants.expoConfig?.version ?? '—'}</Texto>
      </View>

      {USAR_MOCKS && (
        <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Texto peso="seminegrita">Datos de prueba</Texto>
          <Texto variante="chico" color={c.textoSuave}>
            La app usa datos inventados hasta que esté la API. Reiniciarlos vuelve a cargar las reservas, bloqueos y fijas de ejemplo con fechas de hoy.
          </Texto>
          <Boton titulo="Reiniciar datos de prueba" variante="secundario" compacto icono="refresh-outline" onPress={reiniciar} />
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.l },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: 1, padding: ESPACIADO.m, gap: ESPACIADO.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIADO.s },
  fila: { flexDirection: 'row', alignItems: 'center' },
  clave: { width: 100 },
});
