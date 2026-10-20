import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { aplicarApariencia, leerApariencia, type Apariencia } from '@/almacenamiento/apariencia';
import { Chip } from '@/componentes/Chip';
import { Texto } from '@/componentes/Texto';
import { ESPACIADO, RADIO, useTema } from '@/tema';

const OPCIONES: { valor: Apariencia; texto: string; icono: 'sunny-outline' | 'moon-outline' | 'phone-portrait-outline' }[] = [
  { valor: 'claro', texto: 'Claro', icono: 'sunny-outline' },
  { valor: 'oscuro', texto: 'Oscuro', icono: 'moon-outline' },
  { valor: 'sistema', texto: 'Sistema', icono: 'phone-portrait-outline' },
];

export default function Ajustes() {
  const { c } = useTema();
  const [apariencia, setApariencia] = useState<Apariencia>(leerApariencia);

  function elegir(valor: Apariencia) {
    setApariencia(valor);
    aplicarApariencia(valor);
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
